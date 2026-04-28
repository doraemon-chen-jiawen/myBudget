const { pool } = require("../config/db");

async function getActualByCategory({ userIds, dateFrom, dateTo }) {
  const placeholders = userIds.map(() => "?").join(",");
  const sql = `
    SELECT
      category_snapshot,
      SUM(amount) AS actual_total
    FROM records
    WHERE user_id IN (${placeholders})
      AND record_type = 'expense'
      AND record_date >= ?
      AND record_date <= ?
    GROUP BY category_snapshot
  `;
  const [rows] = await pool.query(sql, [...userIds, dateFrom, dateTo]);
  return rows;
}

async function getBudgetsByPeriod({ userId, periodType, periodKey }) {
  const sql = `
    SELECT
      period_key,
      SUM(planned_amount) AS planned_total
    FROM budgets
    WHERE user_id = ?
      AND period_type = ?
      AND period_key = ?
    GROUP BY period_key
  `;
  const [rows] = await pool.query(sql, [userId, periodType, periodKey]);
  return rows;
}

async function getRecordsByCategory({ userIds, dateFrom, dateTo }) {
  const placeholders = userIds.map(() => "?").join(",");
  const sql = `
    SELECT
      record_date,
      category_snapshot,
      amount,
      note,
      source
    FROM records
    WHERE user_id IN (${placeholders})
      AND record_type = 'expense'
      AND record_date >= ?
      AND record_date <= ?
    ORDER BY record_date DESC, id DESC
  `;
  const [rows] = await pool.query(sql, [...userIds, dateFrom, dateTo]);
  return rows;
}

module.exports = {
  getActualByCategory,
  getBudgetsByPeriod,
  getRecordsByCategory
};
