const path = require("path");

/**
 * 将 pixel_image 字段统一为相对 URL 路径
 * 新数据: "/uploads/bead/xxx" → 直接返回
 * 老数据: "F:\...\uploads\bead\xxx" → 提取为 "/uploads/bead/xxx"
 */
function normalizeImageUrl(filePath) {
  if (!filePath) return null;
  // 已经是相对路径，直接返回
  if (filePath.startsWith("/uploads/")) return filePath;
  // 已经是完整 URL，直接返回
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  // 老数据：磁盘绝对路径，提取 uploads/ 之后的部分
  const normalized = filePath.replace(/\\/g, "/");
  const idx = normalized.indexOf("uploads/");
  if (idx === -1) {
    return "/" + path.posix.basename(normalized);
  }
  return "/" + normalized.substring(idx);
}

/**
 * 转换单条记录的图片字段
 */
function normalizeImageFields(row) {
  if (!row) return row;
  for (const key of ["pixel_image", "original_image"]) {
    if (row[key]) {
      row[key] = normalizeImageUrl(row[key]);
    }
  }
  return row;
}

/**
 * 转换列表中每条记录的图片字段
 */
function normalizeImageFieldsList(rows) {
  if (!rows) return rows;
  return rows.map(normalizeImageFields);
}

module.exports = { normalizeImageUrl, normalizeImageFields, normalizeImageFieldsList };