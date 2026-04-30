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

async function getIncomeByCategory({ userIds, dateFrom, dateTo }) {
  const placeholders = userIds.map(() => "?").join(",");
  const sql = `
    SELECT
      category_snapshot,
      SUM(amount) AS income_total
    FROM records
    WHERE user_id IN (${placeholders})
      AND record_type = 'income'
      AND record_date >= ?
      AND record_date <= ?
    GROUP BY category_snapshot
  `;
  const [rows] = await pool.query(sql, [...userIds, dateFrom, dateTo]);
  return rows;
}

async function getTotalIncome({ userIds, dateFrom, dateTo }) {
  const placeholders = userIds.map(() => "?").join(",");
  const sql = `
    SELECT
      SUM(amount) AS income_total
    FROM records
    WHERE user_id IN (${placeholders})
      AND record_type = 'income'
      AND record_date >= ?
      AND record_date <= ?
  `;
  const [rows] = await pool.query(sql, [...userIds, dateFrom, dateTo]);
  return Number(rows[0]?.income_total || 0);
}

async function getDailyIncomes({ userIds, dateFrom, dateTo }) {
  const placeholders = userIds.map(() => "?").join(",");
  const sql = `
    SELECT
      record_date,
      SUM(amount) AS amount
    FROM records
    WHERE user_id IN (${placeholders})
      AND record_type = 'income'
      AND record_date >= ?
      AND record_date <= ?
    GROUP BY record_date
    ORDER BY record_date
  `;
  const [rows] = await pool.query(sql, [...userIds, dateFrom, dateTo]);
  return rows;
}

async function getMonthlyIncomes({ userIds, year }) {
  const placeholders = userIds.map(() => "?").join(",");
  const sql = `
    SELECT
      MONTH(record_date) AS month,
      SUM(amount) AS amount
    FROM records
    WHERE user_id IN (${placeholders})
      AND record_type = 'income'
      AND record_month LIKE ?
    GROUP BY MONTH(record_date)
    ORDER BY MONTH(record_date)
  `;
  const [rows] = await pool.query(sql, [...userIds, `${year}-%`]);
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

async function getDailyExpenses({ userIds, dateFrom, dateTo }) {
  const placeholders = userIds.map(() => "?").join(",");
  const sql = `
    SELECT
      record_date,
      SUM(amount) AS amount
    FROM records
    WHERE user_id IN (${placeholders})
      AND record_type = 'expense'
      AND record_date >= ?
      AND record_date <= ?
    GROUP BY record_date
    ORDER BY record_date
  `;
  const [rows] = await pool.query(sql, [...userIds, dateFrom, dateTo]);
  return rows;
}

async function getMonthlyExpenses({ userIds, year }) {
  const placeholders = userIds.map(() => "?").join(",");
  const sql = `
    SELECT
      MONTH(record_date) AS month,
      SUM(amount) AS amount
    FROM records
    WHERE user_id IN (${placeholders})
      AND record_type = 'expense'
      AND record_month LIKE ?
    GROUP BY MONTH(record_date)
    ORDER BY MONTH(record_date)
  `;
  const [rows] = await pool.query(sql, [...userIds, `${year}-%`]);
  return rows;
}

module.exports = {
  getActualByCategory,
  getIncomeByCategory,
  getTotalIncome,
  getBudgetsByPeriod,
  getRecordsByCategory,
  getDailyExpenses,
  getDailyIncomes,
  getMonthlyExpenses,
  getMonthlyIncomes
};
