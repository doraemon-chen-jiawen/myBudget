const { pool } = require("../config/db");

async function getHiddenCategoryIds(userId) {
  const [rows] = await pool.query(
    "SELECT category_id FROM user_hidden_categories WHERE user_id = ?",
    [userId]
  );
  return rows.map(row => row.category_id);
}

async function hideCategory(userId, categoryId) {
  const [result] = await pool.query(
    "INSERT INTO user_hidden_categories (user_id, category_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=id",
    [userId, categoryId]
  );
  return result.insertId;
}

async function showCategory(userId, categoryId) {
  const [result] = await pool.query(
    "DELETE FROM user_hidden_categories WHERE user_id = ? AND category_id = ?",
    [userId, categoryId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  getHiddenCategoryIds,
  hideCategory,
  showCategory
};
