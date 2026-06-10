/**
 * Tesseract OCR Spike 验证脚本
 * 验证 node-tesseract-ocr 在 Windows 本机对拼豆图纸图例文字的识别能力
 *
 * 测试项：
 * 1. 基础连通：能否正常调用 Tesseract
 * 2. 中文识别：识别中文颜色名称
 * 3. 英文/数字识别：识别色号（如 C01、P21）和数量
 * 4. 预处理优化：sharp 预处理（灰度、对比度）对识别率的影响
 */

const tesseract = require('node-tesseract-ocr');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Tesseract 可执行文件路径（Windows 本机）
const TESSERACT_PATH = 'E:\\setups\\tesseract.exe';

// 配置
const config = {
  lang: 'chi_sim+eng',
  oem: 3,
  psm: 6,
  binary: TESSERACT_PATH
};

// 测试图片目录
const TEST_IMAGES_DIR = path.join(__dirname, 'test-images');

// 确保测试图片目录存在
if (!fs.existsSync(TEST_IMAGES_DIR)) {
  fs.mkdirSync(TEST_IMAGES_DIR, { recursive: true });
}

/**
 * 识别单张图片
 */
async function recognizeImage(imagePath, label) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📋 测试：${label}`);
  console.log(`📷 图片：${imagePath}`);
  console.log(`${'='.repeat(50)}`);

  if (!fs.existsSync(imagePath)) {
    console.log('⚠️  图片不存在，跳过');
    return null;
  }

  try {
    const startTime = Date.now();
    const text = await tesseract.recognize(imagePath, config);
    const elapsed = Date.now() - startTime;

    console.log(`⏱️  耗时：${elapsed}ms`);
    console.log(`📝 原始识别结果：`);
    console.log('---');
    console.log(text);
    console.log('---');

    // 解析结构化数据
    const parsed = parseLegendText(text);
    if (parsed.length > 0) {
      console.log(`\n✅ 解析出 ${parsed.length} 条图例数据：`);
      parsed.forEach((item, i) => {
        console.log(`  ${i + 1}. 色号: ${item.code || '?'}, 颜色: ${item.name || '?'}, 数量: ${item.count || '?'}`);
      });
    } else {
      console.log('\n⚠️  未能解析出结构化图例数据');
    }

    return { text, parsed, elapsed };
  } catch (err) {
    console.log(`❌ 识别失败：${err.message}`);
    return null;
  }
}

/**
 * 预处理图片后再识别
 */
async function recognizeWithPreprocess(imagePath, label) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📋 测试（预处理）：${label}`);
  console.log(`${'='.repeat(50)}`);

  if (!fs.existsSync(imagePath)) {
    console.log('⚠️  图片不存在，跳过');
    return null;
  }

  try {
    // sharp 预处理：转灰度 + 增强对比度 + 放大2倍
    const processedPath = imagePath.replace(/\.(png|jpg|jpeg)$/i, '_processed.png');
    await sharp(imagePath)
      .grayscale()
      .normalize()
      .resize({ width: null, height: null, factor: 2 })
      .sharpen()
      .toFile(processedPath);

    console.log('🔧 预处理完成：灰度 + 对比度增强 + 放大2倍 + 锐化');

    const startTime = Date.now();
    const text = await tesseract.recognize(processedPath, config);
    const elapsed = Date.now() - startTime;

    console.log(`⏱️  耗时：${elapsed}ms`);
    console.log(`📝 预处理后的识别结果：`);
    console.log('---');
    console.log(text);
    console.log('---');

    const parsed = parseLegendText(text);
    if (parsed.length > 0) {
      console.log(`\n✅ 解析出 ${parsed.length} 条图例数据：`);
      parsed.forEach((item, i) => {
        console.log(`  ${i + 1}. 色号: ${item.code || '?'}, 颜色: ${item.name || '?'}, 数量: ${item.count || '?'}`);
      });
    }

    // 清理临时文件
    fs.unlinkSync(processedPath);
    return { text, parsed, elapsed };
  } catch (err) {
    console.log(`❌ 预处理识别失败：${err.message}`);
    return null;
  }
}

/**
 * 解析图例文字为结构化数据
 * 预期格式示例：
 *   C01 白色 120
 *   P21 粉色 50颗
 *   H13 天蓝色 35
 */
function parseLegendText(text) {
  const results = [];
  const lines = text.split('\n').filter(line => line.trim());

  for (const line of lines) {
    // 匹配模式：色号(字母+数字) + 颜色名称(中文) + 数量(数字)
    const match = line.match(/([A-Za-z]\d{2,3})\s+([一-龥]+)\s*(\d+)/);
    if (match) {
      results.push({
        code: match[1],
        name: match[2],
        count: parseInt(match[3])
      });
      continue;
    }

    // 匹配模式：色号 + 数字（无颜色名称）
    const matchSimple = line.match(/([A-Za-z]\d{2,3})\s+(\d+)/);
    if (matchSimple) {
      results.push({
        code: matchSimple[1],
        name: '',
        count: parseInt(matchSimple[2])
      });
      continue;
    }

    // 匹配模式：仅颜色名称 + 数量
    const matchNameOnly = line.match(/([一-龥]{2,4})\s*(\d+)/);
    if (matchNameOnly) {
      results.push({
        code: '',
        name: matchNameOnly[1],
        count: parseInt(matchNameOnly[2])
      });
    }
  }

  return results;
}

/**
 * 主测试流程
 */
async function main() {
  console.log('🚀 Tesseract OCR Spike 验证开始\n');
  console.log(`Tesseract 路径：${TESSERACT_PATH}`);
  console.log(`语言包：chi_sim + eng`);
  console.log(`测试图片目录：${TEST_IMAGES_DIR}`);

  // 检查测试图片
  const testFiles = fs.readdirSync(TEST_IMAGES_DIR).filter(f =>
    /\.(png|jpg|jpeg)$/i.test(f)
  );

  if (testFiles.length === 0) {
    console.log('\n⚠️  未找到测试图片！');
    console.log(`请将拼豆图纸截图放到：${TEST_IMAGES_DIR}`);
    console.log('建议准备以下测试图片：');
    console.log('  1. legend-sample.png - 带色号+颜色名+数量的图例截图');
    console.log('  2. legend-photo.jpg - 拍摄的拼豆图纸图例照片');
    console.log('  3. order-sample.png - 订单物料清单截图');
    return;
  }

  console.log(`\n找到 ${testFiles.length} 张测试图片：`);
  testFiles.forEach(f => console.log(`  - ${f}`));

  // 逐张测试
  for (const file of testFiles) {
    const imagePath = path.join(TEST_IMAGES_DIR, file);

    // 测试1：直接识别
    await recognizeImage(imagePath, `直接识别 - ${file}`);

    // 测试2：预处理后识别
    await recognizeWithPreprocess(imagePath, `预处理后识别 - ${file}`);
  }

  // 测试总结
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 Spike 验证总结');
  console.log('='.repeat(50));
  console.log('请根据以上结果评估：');
  console.log('  1. 中文颜色名称识别是否准确？');
  console.log('  2. 色号（如 C01、P21）识别是否准确？');
  console.log('  3. 数字数量识别是否准确？');
  console.log('  4. 预处理是否提升了识别率？');
  console.log('  5. 耗时是否在可接受范围（<5s）？');
  console.log('\n🚀 Spike 验证结束');
}

main().catch(err => {
  console.error('❌ 测试脚本异常：', err);
  process.exit(1);
});
