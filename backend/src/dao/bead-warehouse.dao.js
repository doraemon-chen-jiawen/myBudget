const { pool } = require("../config/db");

async function getStats(userId) {
  const [rows] = await pool.query(`
    SELECT
      COALESCE(SUM(quantity), 0) as totalBeads,
      COUNT(*) as colorCount,
      COALESCE(SUM(CASE WHEN quantity > 0 AND quantity <= 50 THEN 1 ELSE 0 END), 0) as lowStock,
      COALESCE(SUM(CASE WHEN quantity = 0 THEN 1 ELSE 0 END), 0) as outOfStock
    FROM bead_inventory WHERE user_id = ?
  `, [userId]);
  return rows[0] || { totalBeads: 0, colorCount: 0, lowStock: 0, outOfStock: 0 };
}

async function getInventoryList(userId) {
  const [rows] = await pool.query(`
    SELECT bi.*, bc.name as color_name, bc.r, bc.g, bc.b
    FROM bead_inventory bi
    LEFT JOIN bead_colors bc ON bi.color_code = bc.code
    WHERE bi.user_id = ? AND bi.quantity > 0
    ORDER BY bi.quantity DESC
  `, [userId]);
  return rows;
}

async function getStock(userId, colorCode) {
  const [rows] = await pool.query(
    "SELECT COALESCE(SUM(quantity), 0) as qty FROM bead_inventory WHERE user_id = ? AND color_code = ?",
    [userId, colorCode]
  );
  return rows[0].qty;
}

async function addStock(userId, colorCode, quantity) {
  await pool.query(`
    INSERT INTO bead_inventory (user_id, color_code, quantity)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
  `, [userId, colorCode, quantity]);
}

async function reduceStock(userId, colorCode, quantity) {
  await pool.query(
    "UPDATE bead_inventory SET quantity = quantity - ? WHERE user_id = ? AND color_code = ?",
    [quantity, userId, colorCode]
  );
}

async function addLog(userId, colorCode, type, quantity, source, note) {
  await pool.query(
    "INSERT INTO bead_inventory_log (user_id, color_code, type, quantity, source, note) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, colorCode, type, quantity, source, note]
  );
}

async function getLogs({ userId, page, pageSize, type }) {
  const where = ["user_id = ?"];
  const params = [userId];
  if (type) { where.push("type = ?"); params.push(type); }

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM bead_inventory_log WHERE ${where.join(" AND ")}`,
    params
  );

  const offset = (page - 1) * pageSize;
  const [rows] = await pool.query(`
    SELECT * FROM bead_inventory_log
    WHERE ${where.join(" AND ")}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, pageSize, offset]);

  return { total: countRows[0].total, page, pageSize, list: rows };
}

async function getStatDrawingCount(userId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM user_stat_config WHERE user_id = ? AND is_stat = 1",
    [userId]
  );
  return rows[0].count;
}

async function getStatConfig(userId) {
  const [rows] = await pool.query(`
    SELECT sc.*,
      d.name as drawing_name,
      uc.name as conversion_name
    FROM user_stat_config sc
    LEFT JOIN bead_drawings d ON sc.drawing_id = d.id
    LEFT JOIN user_conversions uc ON sc.conversion_id = uc.id
    WHERE sc.user_id = ?
    ORDER BY sc.created_at DESC
  `, [userId]);
  return rows;
}

/**
 * 获取所有可选图纸（仅用户转换记录，排除已拼的），并标注当前统计状态
 */
async function getStatOptions(userId) {
  // 用户已选的统计配置
  const [statRows] = await pool.query(
    "SELECT drawing_id, conversion_id FROM user_stat_config WHERE user_id = ?",
    [userId]
  );
  const statConversionIds = new Set(statRows.filter(r => r.conversion_id).map(r => r.conversion_id));

  // 用户转换记录（排除已拼的）
  const [conversions] = await pool.query(
    "SELECT id, name, width, height, pixel_image FROM user_conversions WHERE user_id = ? AND (is_assembled IS NULL OR is_assembled = 0) ORDER BY created_at DESC",
    [userId]
  );

  return {
    conversions: conversions.map(c => ({ ...c, type: 'conversion', isStat: statConversionIds.has(c.id) ? 1 : 0 }))
  };
}

async function clearStatConfig(userId) {
  await pool.query("DELETE FROM user_stat_config WHERE user_id = ?", [userId]);
}

async function batchInsertStatConfig(userId, configs) {
  const values = configs.map(c => [
    userId,
    c.drawingId || null,
    c.conversionId || null,
    c.isStat !== undefined ? c.isStat : 1
  ]);
  await pool.query(
    "INSERT INTO user_stat_config (user_id, drawing_id, conversion_id, is_stat) VALUES ?",
    [values]
  );
}

/**
 * 清除指定转换图纸的统计配置（标记已拼时调用）
 */
async function removeConversionStatConfig(conversionId) {
  await pool.query("DELETE FROM user_stat_config WHERE conversion_id = ?", [conversionId]);
}

async function listColors() {
  const [rows] = await pool.query(
    "SELECT * FROM bead_colors WHERE is_active = 1 ORDER BY code ASC"
  );
  return rows;
}

/**
 * 获取用户预警设置
 */
async function getAlertSettings(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM bead_alert_settings WHERE user_id = ?",
    [userId]
  );
  if (rows.length === 0) {
    // 返回默认设置
    return { low_stock_threshold: 50, out_of_stock_threshold: 0 };
  }
  return rows[0];
}

/**
 * 保存用户预警设置
 */
async function saveAlertSettings(userId, lowStockThreshold, outOfStockThreshold) {
  await pool.query(`
    INSERT INTO bead_alert_settings (user_id, low_stock_threshold, out_of_stock_threshold)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      low_stock_threshold = VALUES(low_stock_threshold),
      out_of_stock_threshold = VALUES(out_of_stock_threshold),
      updated_at = CURRENT_TIMESTAMP
  `, [userId, lowStockThreshold, outOfStockThreshold]);
}

/**
 * 获取缺货明细：根据统计范围图纸计算每种色号的需求量、库存量、缺货量
 */
async function getShortageList(userId) {
  // 1. 获取用户统计范围内的图纸ID
  const [statRows] = await pool.query(
    "SELECT drawing_id, conversion_id FROM user_stat_config WHERE user_id = ? AND is_stat = 1",
    [userId]
  );

  const drawingIds = statRows.filter(r => r.drawing_id).map(r => r.drawing_id);
  const conversionIds = statRows.filter(r => r.conversion_id).map(r => r.conversion_id);

  if (drawingIds.length === 0 && conversionIds.length === 0) {
    return [];
  }

  // 2. 获取所有用料需求
  let demandRows = [];
  if (drawingIds.length > 0) {
    const [rows] = await pool.query(
      `SELECT color_code, SUM(quantity) as demand FROM drawing_materials WHERE drawing_id IN (?) GROUP BY color_code`,
      [drawingIds]
    );
    demandRows = demandRows.concat(rows);
  }
  if (conversionIds.length > 0) {
    const [rows] = await pool.query(
      `SELECT color_code, SUM(quantity) as demand FROM conversion_materials WHERE conversion_id IN (?) GROUP BY color_code`,
      [conversionIds]
    );
    demandRows = demandRows.concat(rows);
  }

  // 3. 合并同类色号需求
  const demandMap = {};
  for (const row of demandRows) {
    if (!row.color_code) continue;
    demandMap[row.color_code] = (demandMap[row.color_code] || 0) + Number(row.demand);
  }

  if (Object.keys(demandMap).length === 0) {
    return [];
  }

  // 4. 获取用户库存
  const colorCodes = Object.keys(demandMap);
  const [inventoryRows] = await pool.query(
    `SELECT color_code, quantity FROM bead_inventory WHERE user_id = ? AND color_code IN (?)`,
    [userId, colorCodes]
  );
  const inventoryMap = {};
  for (const row of inventoryRows) {
    inventoryMap[row.color_code] = Number(row.quantity);
  }

  // 5. 获取色卡名称
  const [colorRows] = await pool.query(
    `SELECT code, name, r, g, b FROM bead_colors WHERE code IN (?)`,
    [colorCodes]
  );
  const colorMap = {};
  for (const row of colorRows) {
    colorMap[row.code] = row;
  }

  // 6. 组装缺货明细（需求量 > 库存量）
  const result = [];
  for (const [code, demand] of Object.entries(demandMap)) {
    const stock = inventoryMap[code] || 0;
    const shortage = Math.max(0, demand - stock);
    if (shortage > 0) {
      const color = colorMap[code] || {};
      result.push({
        color_code: code,
        color_name: color.name || '',
        r: color.r || 200,
        g: color.g || 200,
        b: color.b || 200,
        demand,
        stock,
        shortage
      });
    }
  }

  // 按缺货量降序
  result.sort((a, b) => b.shortage - a.shortage);
  return result;
}

/**
 * 获取用户统计范围内每种色号的需求量 {colorCode: demand}
 */
async function getDemandMap(userId) {
  const [statRows] = await pool.query(
    "SELECT drawing_id, conversion_id FROM user_stat_config WHERE user_id = ? AND is_stat = 1",
    [userId]
  );

  const drawingIds = statRows.filter(r => r.drawing_id).map(r => r.drawing_id);
  const conversionIds = statRows.filter(r => r.conversion_id).map(r => r.conversion_id);

  if (drawingIds.length === 0 && conversionIds.length === 0) {
    return {};
  }

  let demandRows = [];
  if (drawingIds.length > 0) {
    const [rows] = await pool.query(
      `SELECT color_code, SUM(quantity) as demand FROM drawing_materials WHERE drawing_id IN (?) GROUP BY color_code`,
      [drawingIds]
    );
    demandRows = demandRows.concat(rows);
  }
  if (conversionIds.length > 0) {
    const [rows] = await pool.query(
      `SELECT color_code, SUM(quantity) as demand FROM conversion_materials WHERE conversion_id IN (?) GROUP BY color_code`,
      [conversionIds]
    );
    demandRows = demandRows.concat(rows);
  }

  const demandMap = {};
  for (const row of demandRows) {
    if (!row.color_code) continue;
    demandMap[row.color_code] = (demandMap[row.color_code] || 0) + Number(row.demand);
  }
  return demandMap;
}

module.exports = {
  getStats, getInventoryList, getStock, addStock, reduceStock,
  addLog, getLogs, getStatDrawingCount, getStatConfig, getStatOptions,
  clearStatConfig, batchInsertStatConfig, listColors,
  getAlertSettings, saveAlertSettings, getShortageList, getDemandMap,
  removeConversionStatConfig
};
