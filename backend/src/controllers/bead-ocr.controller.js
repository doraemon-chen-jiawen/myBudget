const { ok } = require("../utils/response");
const AppError = require("../utils/app-error");
const beadOcrService = require("../services/bead-ocr.service");
const sharp = require("sharp");
const fs = require("fs");

async function recognize(req, res) {
  console.log('[OCR] 收到请求, file:', !!req.file, 'body:', JSON.stringify(req.body));
  if (!req.file) {
    throw new AppError(400, "E_NO_FILE", "请上传裁剪后的图例图片");
  }

  const imagePath = req.file.path;
  // 裁剪坐标百分比：cropX, cropY, cropWidth, cropHeight
  const { cropX, cropY, cropWidth, cropHeight } = req.body;

  try {
    let ocrImagePath = imagePath;
    let cropBuffer = null;

    // 如果前端传了裁剪坐标，用 sharp 在后端裁剪（质量远高于 Canvas）
    if (cropX !== undefined && cropY !== undefined &&
        cropWidth !== undefined && cropHeight !== undefined) {
      const x = Number(cropX);
      const y = Number(cropY);
      const w = Number(cropWidth);
      const h = Number(cropHeight);

      console.log('[OCR] 裁剪坐标:', { x, y, w, h });

      if (w > 0 && h > 0 && w <= 100 && h <= 100) {
        const metadata = await sharp(imagePath).metadata();
        const imgW = metadata.width;
        const imgH = metadata.height;

        const px = Math.round(imgW * (x / 100));
        const py = Math.round(imgH * (y / 100));
        const pw = Math.round(imgW * (w / 100));
        const ph = Math.round(imgH * (h / 100));

        console.log('[OCR] 原图尺寸:', imgW, 'x', imgH, '→ 裁剪像素:', { px, py, pw, ph });

        // 先把整张图放大 4 倍，再裁剪，确保小区域文字清晰可读
        const ENLARGE = 4;
        const bigW = imgW * ENLARGE;
        const bigH = imgH * ENLARGE;
        const bigPx = px * ENLARGE;
        const bigPy = py * ENLARGE;
        const bigPw = pw * ENLARGE;
        const bigPh = ph * ENLARGE;

        // 直接输出到 buffer，不写入磁盘
        cropBuffer = await sharp(imagePath)
          .resize(bigW, bigH, { kernel: 'lanczos3' })
          .extract({ left: bigPx, top: bigPy, width: bigPw, height: bigPh })
          .sharpen()
          .normalize()
          .png()
          .toBuffer();

        console.log('[OCR] 裁剪后 buffer 大小:', cropBuffer.length);

        // 使用临时文件给 Tesseract 识别（Tesseract 需要文件路径）
        const tmpCropPath = imagePath + '_crop_tmp.png';
        fs.writeFileSync(tmpCropPath, cropBuffer);
        ocrImagePath = tmpCropPath;
        console.log('[OCR] 临时裁剪文件:', tmpCropPath);
      }
    }

    // OCR 识别
    const rawText = await beadOcrService.recognize(ocrImagePath);
    console.log('[OCR] 识别结果:', JSON.stringify(rawText));

    // 清理临时裁剪文件
    if (ocrImagePath !== imagePath) {
      try { fs.unlinkSync(ocrImagePath); } catch (e) { /* 忽略清理失败 */ }
    }
    // 原图仅用于识别，识别完即删（save 时前端会重新上传）
    try { fs.unlinkSync(imagePath); } catch (e) { /* 忽略清理失败 */ }

    // 解析结构化数据
    const parsed = beadOcrService.parseLegendText(rawText);

    return ok(res, {
      rawText,
      items: parsed
    });
  } catch (err) {
    throw new AppError(500, "E_OCR_FAIL", "识别失败：" + err.message);
  }
}

/**
 * 用户确认修正后的 OCR 结果保存
 */
async function saveOcrResult(req, res) {
  const { userId, width, height, name, materials } = req.body;
  const pixelImage = req.file ? `/uploads/bead/${req.file.filename}` : null;

  const widthNum = Number(width) || 58;
  const heightNum = Number(height) || 58;
  const { pool } = require("../config/db");
  const [result] = await pool.query(
    "INSERT INTO user_conversions (user_id, name, width, height, pixel_image, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
    [Number(userId), name || 'OCR识别图纸', widthNum, heightNum, pixelImage]
  );

  const parsedMaterials = typeof materials === 'string' ? JSON.parse(materials) : materials;
  if (parsedMaterials && parsedMaterials.length > 0) {
    const values = parsedMaterials.map((m, i) => [
      result.insertId, m.color_code, m.color_name, m.quantity, i + 1
    ]);
    await pool.query(
      "INSERT INTO conversion_materials (conversion_id, color_code, color_name, quantity, sort_order) VALUES ?",
      [values]
    );
  }

  // 自动加入统计范围
  await pool.query(
    "INSERT INTO user_stat_config (user_id, conversion_id, is_stat) VALUES (?, ?, 1)",
    [Number(userId), result.insertId]
  );

  return ok(res, { id: result.insertId }, "保存成功");
}

/**
 * 订单 OCR 识别（图片或文本）
 */
async function recognizeOrder(req, res) {
  const { text } = req.body;
  const imageFile = req.file;

  try {
    let rawText = text || '';

    // 如果上传了图片，先进行 OCR 识别，识别完删除临时文件
    if (imageFile) {
      const ocrText = await beadOcrService.recognize(imageFile.path);
      rawText = rawText ? `${rawText}\n${ocrText}` : ocrText;
      // 订单图片仅用于识别，用完即删
      try { fs.unlinkSync(imageFile.path); } catch (e) { /* 忽略清理失败 */ }
    }

    if (!rawText.trim()) {
      throw new AppError("请提供订单图片或文本", 400);
    }

    // 解析订单文本
    const parsed = beadOcrService.parseOrderText(rawText);

    // 查询色卡信息，补充颜色名称
    const { pool } = require("../config/db");
    const codes = parsed.filter(p => p.code).map(p => p.code);
    let colorMap = {};

    if (codes.length > 0) {
      const [colors] = await pool.query(
        "SELECT code, name FROM bead_colors WHERE code IN (?)",
        [codes]
      );
      colorMap = Object.fromEntries(colors.map(c => [c.code, c.name]));
    }

    // 补充颜色名称
    const items = parsed.map(item => ({
      ...item,
      name: item.name || colorMap[item.code] || ''
    }));

    return ok(res, {
      rawText,
      items
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("订单识别失败：" + err.message, 500);
  }
}

/**
 * 订单确认入库
 */
async function confirmOrderStockIn(req, res) {
  const { userId, items, orderSummary } = req.body;

  if (!items || items.length === 0) {
    throw new AppError("请选择要入库的物料", 400);
  }

  const result = await beadOcrService.batchStockIn(userId, items, orderSummary);

  return ok(res, result, "入库成功");
}

module.exports = { recognize, saveOcrResult, recognizeOrder, confirmOrderStockIn };
