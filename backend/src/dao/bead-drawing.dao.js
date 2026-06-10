const { pool } = require("../config/db");
const { normalizeImageFields, normalizeImageFieldsList } = require("../utils/image-url");

/**
 * 图纸列表（分页 + 筛选）
 */
async function findDrawings({ page, pageSize, keyword, sizes, tagId, userId }) {
  const where = ["d.is_active = 1"];
  const params = [];

  if (keyword) {
    where.push("(d.name LIKE ? OR d.description LIKE ?)");
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (sizes && sizes.length > 0) {
    // sizes 格式为 "58x58,58x87" 即 widthxheight
    const sizeConditions = [];
    for (const sz of sizes) {
      const parts = sz.split('x');
      if (parts.length === 2) {
        sizeConditions.push('(d.width = ? AND d.height = ?)');
        params.push(Number(parts[0]), Number(parts[1]));
      }
    }
    if (sizeConditions.length > 0) {
      where.push(`(${sizeConditions.join(' OR ')})`);
    }
  }

  if (tagId) {
    where.push(`d.id IN (SELECT drawing_id FROM drawing_tag_relations WHERE tag_id = ?)`);
    params.push(tagId);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  // 总数
  const countSql = `SELECT COUNT(*) as total FROM bead_drawings d ${whereClause}`;
  const [countRows] = await pool.query(countSql, params);
  const total = countRows[0].total;

  // 列表
  const offset = (page - 1) * pageSize;
  const listSql = `
    SELECT d.*,
      ${userId ? `EXISTS(SELECT 1 FROM user_favorites WHERE user_id = ? AND drawing_id = d.id) as isFavorited,` : 'FALSE as isFavorited,'}
      (SELECT GROUP_CONCAT(t.name) FROM drawing_tags t
        JOIN drawing_tag_relations dtr ON t.id = dtr.tag_id
        WHERE dtr.drawing_id = d.id) as tags
    FROM bead_drawings d
    ${whereClause}
    ORDER BY d.sort_order ASC, d.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const listParams = userId ? [userId, ...params, pageSize, offset] : [...params, pageSize, offset];
  const [rows] = await pool.query(listSql, listParams);

  return { total, page, pageSize, list: rows };
}

/**
 * 图纸详情
 */
async function findDrawingById(id) {
  const [rows] = await pool.query("SELECT * FROM bead_drawings WHERE id = ? AND is_active = 1", [id]);
  if (rows.length === 0) return null;
  const drawing = rows[0];

  // 标签
  const [tags] = await pool.query(`
    SELECT t.* FROM drawing_tags t
    JOIN drawing_tag_relations dtr ON t.id = dtr.tag_id
    WHERE dtr.drawing_id = ?
  `, [id]);
  drawing.tags = tags;

  // 用料清单（JOIN bead_colors 获取颜色 RGB）
  const [materials] = await pool.query(
    `SELECT dm.*, bc.r, bc.g, bc.b
     FROM drawing_materials dm
     LEFT JOIN bead_colors bc ON dm.color_code = bc.code
     WHERE dm.drawing_id = ? ORDER BY dm.sort_order ASC`,
    [id]
  );
  drawing.materials = materials;

  return drawing;
}

/**
 * 所有标签
 */
async function findAllTags() {
  const [rows] = await pool.query(
    "SELECT * FROM drawing_tags WHERE is_active = 1 ORDER BY sort_order ASC"
  );
  return rows;
}

/**
 * 收藏列表
 */
async function findFavorites({ userId, page, pageSize }) {
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query(
    "SELECT COUNT(*) as total FROM user_favorites WHERE user_id = ?",
    [userId]
  );

  const [rows] = await pool.query(`
    SELECT f.*, d.name, d.thumbnail, d.width, d.height, d.preview_image
    FROM user_favorites f
    JOIN bead_drawings d ON f.drawing_id = d.id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
    LIMIT ? OFFSET ?
  `, [userId, pageSize, offset]);

  return { total: countRows[0].total, page, pageSize, list: normalizeImageFieldsList(rows) };
}

/**
 * 添加收藏
 */
async function addFavorite(userId, drawingId) {
  await pool.query(
    "INSERT IGNORE INTO user_favorites (user_id, drawing_id) VALUES (?, ?)",
    [userId, drawingId]
  );
}

/**
 * 取消收藏
 */
async function removeFavorite(userId, drawingId) {
  await pool.query(
    "DELETE FROM user_favorites WHERE user_id = ? AND drawing_id = ?",
    [userId, drawingId]
  );
}

/**
 * 保存用户转换记录
 */
async function saveConversion({ userId, width, height, name, pixelImage, pixelData, materials }) {
  const [result] = await pool.query(
    "INSERT INTO user_conversions (user_id, name, width, height, pixel_image, pixel_data, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
    [userId, name, width, height, pixelImage, pixelData || null]
  );
  const conversionId = result.insertId;

  if (materials && materials.length > 0) {
    const values = materials.map((m, i) => [
      conversionId, m.color_code, m.color_name, m.quantity, i + 1
    ]);
    await pool.query(
      "INSERT INTO conversion_materials (conversion_id, color_code, color_name, quantity, sort_order) VALUES ?",
      [values]
    );
  }

  // 自动加入统计范围
  await pool.query(
    "INSERT INTO user_stat_config (user_id, conversion_id, is_stat) VALUES (?, ?, 1)",
    [userId, conversionId]
  );

  return { id: conversionId };
}

/**
 * 查询用户转换记录
 */
async function listConversions({ userId, page, pageSize }) {
  const offset = (page - 1) * pageSize;
  const [countRows] = await pool.query(
    "SELECT COUNT(*) as total FROM user_conversions WHERE user_id = ?",
    [userId]
  );
  const [rows] = await pool.query(
    "SELECT * FROM user_conversions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [userId, pageSize, offset]
  );
  return { total: countRows[0].total, page, pageSize, list: normalizeImageFieldsList(rows) };
}

/**
 * 查询用户转换记录（增强版：支持尺寸+拼接状态筛选）
 */
async function listConversionsEnhanced({ userId, page, pageSize, size, isAssembled }) {
  const where = ["uc.user_id = ?"];
  const params = [userId];

  if (size) {
    const parts = size.split('x');
    if (parts.length === 2) {
      where.push("(uc.width = ? AND uc.height = ?)");
      params.push(Number(parts[0]), Number(parts[1]));
    }
  }

  if (isAssembled !== undefined && isAssembled !== null && isAssembled !== '') {
    where.push("uc.is_assembled = ?");
    params.push(Number(isAssembled));
  }

  const whereClause = `WHERE ${where.join(" AND ")}`;
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM user_conversions uc ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT uc.*,
      (SELECT COUNT(*) FROM conversion_materials cm WHERE cm.conversion_id = uc.id) as material_count,
      (SELECT SUM(cm.quantity) FROM conversion_materials cm WHERE cm.conversion_id = uc.id) as total_beads
    FROM user_conversions uc
    ${whereClause}
    ORDER BY uc.created_at DESC
    LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return { total: countRows[0].total, page, pageSize, list: normalizeImageFieldsList(rows) };
}

/**
 * 获取单条转换记录详情（含用料清单）
 */
async function getConversionDetail(id) {
  const [rows] = await pool.query(
    "SELECT * FROM user_conversions WHERE id = ?",
    [id]
  );
  if (rows.length === 0) return null;
  const conversion = rows[0];

  const [materials] = await pool.query(
    `SELECT cm.*, bc.r, bc.g, bc.b
     FROM conversion_materials cm
     LEFT JOIN bead_colors bc ON cm.color_code = bc.code
     WHERE cm.conversion_id = ? ORDER BY cm.sort_order ASC`,
    [id]
  );
  conversion.materials = materials;

  return normalizeImageFields(conversion);
}

/**
 * 更新拼接状态（标记已拼时同步清除统计配置）
 */
async function updateAssembled(id, isAssembled) {
  await pool.query(
    "UPDATE user_conversions SET is_assembled = ? WHERE id = ?",
    [isAssembled ? 1 : 0, id]
  );
  if (isAssembled) {
    const beadWarehouseDao = require("./bead-warehouse.dao");
    await beadWarehouseDao.removeConversionStatConfig(id);
  }
}

/**
 * 删除转换记录（含用料清单）
 */
async function deleteConversion(id) {
  await pool.query("DELETE FROM conversion_materials WHERE conversion_id = ?", [id]);
  await pool.query("DELETE FROM user_conversions WHERE id = ?", [id]);
}

module.exports = {
  findDrawings, findDrawingById, findAllTags,
  findFavorites, addFavorite, removeFavorite,
  saveConversion, listConversions,
  listConversionsEnhanced, getConversionDetail, updateAssembled, deleteConversion
};
