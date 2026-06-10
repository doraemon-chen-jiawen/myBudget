/**
 * Tesseract OCR 服务
 * 封装 node-tesseract-ocr 调用 + 图片预处理 + 色号校准
 * 使用 MARD 221 完整色卡（221 种颜色）
 */

const tesseract = require('node-tesseract-ocr');
const path = require('path');

// Windows 本机 Tesseract 路径
const TESSERACT_PATH = 'E:\\setups\\tesseract.exe';

const tesseractConfig = {
  lang: 'chi_sim+eng',
  oem: 3,
  psm: 6,
  binary: TESSERACT_PATH
};

// MARD 221 标准色卡（无前导零格式，与数据库 bead_colors.code 一致）
const COLOR_CARD = [
  // A 系列：黄色系 (26色)
  'A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15','A16','A17','A18','A19','A20','A21','A22','A23','A24','A25','A26',
  // B 系列：绿色系 (32色)
  'B1','B2','B3','B4','B5','B6','B7','B8','B9','B10','B11','B12','B13','B14','B15','B16','B17','B18','B19','B20','B21','B22','B23','B24','B25','B26','B27','B28','B29','B30','B31','B32',
  // C 系列：蓝色系 (29色)
  'C1','C2','C3','C4','C5','C6','C7','C8','C9','C10','C11','C12','C13','C14','C15','C16','C17','C18','C19','C20','C21','C22','C23','C24','C25','C26','C27','C28','C29',
  // D 系列：紫色系 (26色)
  'D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D14','D15','D16','D17','D18','D19','D20','D21','D22','D23','D24','D25','D26',
  // E 系列：粉色系 (24色)
  'E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11','E12','E13','E14','E15','E16','E17','E18','E19','E20','E21','E22','E23','E24',
  // F 系列：红色系 (25色)
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','F13','F14','F15','F16','F17','F18','F19','F20','F21','F22','F23','F24','F25',
  // G 系列：棕色系 (21色)
  'G1','G2','G3','G4','G5','G6','G7','G8','G9','G10','G11','G12','G13','G14','G15','G16','G17','G18','G19','G20','G21',
  // H 系列：黑白灰 (23色，注意缺少 H7)
  'H1','H2','H3','H4','H5','H6','H8','H9','H10','H11','H12','H13','H14','H15','H16','H17','H18','H19','H20','H21','H22','H23',
  // M 系列：混合色 (15色)
  'M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12','M13','M14','M15'
];

// 色卡集合（用于快速查找，O(1)）
const COLOR_CARD_SET = new Set(COLOR_CARD);

/**
 * 识别图片中的文字
 */
async function recognize(imagePath) {
  const text = await tesseract.recognize(imagePath, tesseractConfig);
  return text;
}

/**
 * 解析识别文本为结构化图例数据
 * 只识别色号，不依赖中文名
 * 支持一行包含多个色号-数量对
 */
function parseLegendText(text) {
  const results = [];
  const lines = text.split('\n').filter(line => line.trim());

  for (const line of lines) {
    let lineResults = [];

    // 全局模式A：色号(数量) 括号格式，允许中间有OCR噪点
    // 格式：F14 (61) / G9 = (289)
    const bracketPattern = /([A-Za-z]\d{1,2})[\s=\-—~.]{0,6}[\(（](\d+)[\)）]/g;
    for (const m of line.matchAll(bracketPattern)) {
      const code = calibrateCode(m[1]);
      if (code) {
        lineResults.push({ code, name: '', count: parseInt(m[2]) });
      }
    }

    // 全局模式B：色号+空格+数量（无括号）
    // 格式：E15 33 | F14 6 | H2 562
    const spacePattern = /([A-Za-z]\d{1,2})\s{1,4}(\d{1,5})/g;
    for (const m of line.matchAll(spacePattern)) {
      const code = calibrateCode(m[1]);
      // 去重：避免和括号模式重复捕获
      if (code && !lineResults.some(r => r.code === code)) {
        lineResults.push({ code, name: '', count: parseInt(m[2]) });
      }
    }

    if (lineResults.length > 0) {
      results.push(...lineResults);
      continue;
    }

    // 以下为单条匹配兜底

    // 模式1：色号 + 可选中文名 + 数量
    let match = line.match(/([A-Za-z]\d{1,2})\s*[：:]*\s*([一-龥]{0,6})?\s*(\d+)/);
    if (match) {
      const code = calibrateCode(match[1]);
      if (code) {
        results.push({
          code,
          name: match[2] || '',
          count: parseInt(match[3])
        });
      }
      continue;
    }

    // 模式2：数字+色号（倒序）
    match = line.match(/(\d+)\s*([A-Za-z]\d{1,2})/);
    if (match) {
      const code = calibrateCode(match[2]);
      if (code) {
        results.push({
          code,
          name: '',
          count: parseInt(match[1])
        });
      }
      continue;
    }

    // 模式3：仅色号（数量为0，需人工补充）
    match = line.match(/([A-Za-z]\d{1,2})/);
    if (match) {
      const code = calibrateCode(match[1]);
      if (code) {
        results.push({
          code,
          name: '',
          count: 0
        });
      }
    }
  }

  return results;
}

/**
 * 色号校准：标准化格式 + 匹配 MARD 221 色卡
 * - A1 和 A01 等价，统一校准为 A1（与数据库 bead_colors.code 格式一致）
 * - 不在 MARD 221 色卡中的返回 null
 */
function calibrateCode(rawCode) {
  if (!rawCode) return null;
  // 转大写
  let code = rawCode.trim().toUpperCase();
  // 提取字母和数字部分
  const match = code.match(/^([A-Z])(\d{1,2})$/);
  if (!match) return null;

  // 数字部分去前导零：A01→A1, A10→A10, A1→A1
  const letter = match[1];
  const num = parseInt(match[2], 10);
  code = letter + num;

  // 匹配标准色卡
  if (COLOR_CARD_SET.has(code)) return code;

  // 未知色号，不在 MARD 221 色卡中
  return null;
}

/**
 * 解析订单文本为结构化物料数据
 * 订单格式通常更简单，主要是色号和数量
 * 可能包含：色号+数量，或色号+名称+数量
 */
function parseOrderText(text) {
  const results = [];
  const lines = text.split('\n').filter(line => line.trim());

  for (const line of lines) {
    // 跳过明显无关的行（如标题、总计等）
    if (/合计|总计|总价|金额|订单|序号/i.test(line)) continue;

    // 模式1：色号 + 数量（最常见）
    let match = line.match(/([A-Za-z]\d{1,2})\s*(?:×|x|\*|：|:)?\s*(\d+)/);
    if (match) {
      const code = calibrateCode(match[1]);
      if (code) {
        results.push({
          code,
          name: '',
          count: parseInt(match[2])
        });
      }
      continue;
    }

    // 模式2：色号 + 名称 + 数量
    match = line.match(/([A-Za-z]\d{1,2})\s+([一-龥]{0,6})?\s*(?:×|x|\*|：|:)?\s*(\d+)/);
    if (match) {
      const code = calibrateCode(match[1]);
      if (code) {
        results.push({
          code,
          name: match[2] || '',
          count: parseInt(match[3])
        });
      }
      continue;
    }

    // 模式3已移除：仅中文名+数量无法匹配色卡，不再输出无色号条目

    // 模式4：仅色号（数量为0，需人工补充）
    match = line.match(/([A-Za-z]\d{1,2})/);
    if (match) {
      const code = calibrateCode(match[1]);
      if (code) {
        results.push({
          code,
          name: '',
          count: 0
        });
      }
    }
  }

  return results;
}

/**
 * 批量入库订单物料
 * 校验色号必须属于 MARD 221 色卡
 */
async function batchStockIn(userId, items, orderSummary) {
  // 过滤无效数据：空色号、数量≤0、非色卡色号
  const validItems = items.filter(item => {
    if (!item.code || item.count <= 0) return false;
    // 校验色号是否在 MARD 221 色卡中（calibrateCode 会做标准化：补零等价、大小写等）
    const calibrated = calibrateCode(item.code);
    if (!calibrated) return false;
    // 使用标准化后的色号入库（确保格式统一）
    item.code = calibrated;
    return true;
  });

  if (validItems.length === 0) {
    return { success: false, count: 0, message: '没有有效的色号可入库' };
  }

  const { pool } = require('../config/db');
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const item of validItems) {
      // 入库
      await connection.query(`
        INSERT INTO bead_inventory (user_id, color_code, quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
      `, [userId, item.code, item.count]);

      // 记录日志
      await connection.query(`
        INSERT INTO bead_inventory_log (user_id, color_code, type, quantity, source, note)
        VALUES (?, ?, 'in', ?, 'order', ?)
      `, [userId, item.code, item.count, orderSummary || '订单入库']);
    }

    await connection.commit();
    return { success: true, count: validItems.length };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { recognize, parseLegendText, calibrateCode, COLOR_CARD, parseOrderText, batchStockIn };
