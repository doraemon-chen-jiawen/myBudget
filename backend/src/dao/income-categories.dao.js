const { pool } = require("../config/db");

async function listCategories({ userId, periodType }) {
  const where = ["(user_id IS NULL OR user_id = ?)", "is_active = 1"];
  const params = [userId];

  if (periodType) {
    where.push("period_type = ?");
    params.push(periodType);
  }

  const sql = `
    SELECT * FROM income_categories
    WHERE ${where.join(" AND ")}
    ORDER BY is_system DESC, sort_order ASC, id ASC
  `;
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    "SELECT * FROM income_categories WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function createCategory(payload) {
  const sql = `
    INSERT INTO income_categories (
      user_id, period_type, category_key, label, icon, hint,
      color, bg_color, color_light, quick_amounts, default_amount, allow_negative,
      sort_order, is_system
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `;
  const params = [
    payload.userId,
    payload.periodType,
    payload.categoryKey,
    payload.label,
    payload.icon || "💰",
    payload.hint || "自定义收入分类",
    payload.color || "#6FCF97",
    payload.bgColor || "rgba(111,207,151,0.1)",
    payload.colorLight || "rgba(111,207,151,0.3)",
    payload.quickAmounts ? JSON.stringify(payload.quickAmounts) : null,
    payload.defaultAmount ?? null,
    payload.allowNegative ? 1 : 0,
    payload.sortOrder ?? 0
  ];

  const [result] = await pool.query(sql, params);
  const [rows] = await pool.query(
    "SELECT * FROM income_categories WHERE id = ? LIMIT 1",
    [result.insertId]
  );
  return rows[0];
}

async function updateCategory(id, userId, payload) {
  const sets = [];
  const params = [];

  const fields = {
    label: payload.label,
    icon: payload.icon,
    hint: payload.hint,
    color: payload.color,
    bg_color: payload.bgColor,
    color_light: payload.colorLight,
    quick_amounts: payload.quickAmounts ? JSON.stringify(payload.quickAmounts) : undefined,
    default_amount: payload.defaultAmount,
    allow_negative: payload.allowNegative,
    sort_order: payload.sortOrder
  };

  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      params.push(val);
    }
  }

  if (sets.length === 0) return null;

  params.push(id, userId);
  const sql = `UPDATE income_categories SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`;
  const [result] = await pool.query(sql, params);
  if (result.affectedRows === 0) return null;

  const [rows] = await pool.query(
    "SELECT * FROM income_categories WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function deleteCategory(id, userId) {
  const [result] = await pool.query(
    "DELETE FROM income_categories WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  listCategories,
  findById,
  createCategory,
  updateCategory,
  deleteCategory
};
