const { pool } = require("../config/db");

async function listBudgets({ userId, periodType, periodKey }) {
  const where = ["user_id = ?"];
  const params = [userId];

  if (periodType) {
    where.push("period_type = ?");
    params.push(periodType);
  }

  if (periodKey) {
    where.push("period_key = ?");
    params.push(periodKey);
  }

  const sql = `
    SELECT * FROM income_budgets
    WHERE ${where.join(" AND ")}
    ORDER BY id ASC
  `;
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function createBudget(payload) {
  const sql = `
    INSERT INTO income_budgets (
      user_id, family_group_id, period_type, period_key,
      budget_month, budget_year, planned_amount, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    payload.userId,
    payload.familyGroupId,
    payload.periodType,
    payload.periodKey,
    payload.budgetMonth,
    payload.budgetYear,
    payload.plannedAmount,
    payload.note
  ];

  const [result] = await pool.query(sql, params);
  const [rows] = await pool.query(
    "SELECT * FROM income_budgets WHERE id = ? LIMIT 1",
    [result.insertId]
  );
  return rows[0];
}

async function updateBudget(id, userId, payload) {
  const sets = [];
  const params = [];

  const fields = {
    family_group_id: payload.familyGroupId,
    period_type: payload.periodType,
    period_key: payload.periodKey,
    budget_month: payload.budgetMonth,
    budget_year: payload.budgetYear,
    planned_amount: payload.plannedAmount,
    note: payload.note
  };

  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) {
      sets.push(`${col} = ?`);
      params.push(val);
    }
  }

  if (sets.length === 0) return null;

  params.push(id, userId);
  const sql = `UPDATE income_budgets SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`;
  const [result] = await pool.query(sql, params);
  if (result.affectedRows === 0) return null;

  const [rows] = await pool.query(
    "SELECT * FROM income_budgets WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function deleteBudget(id, userId) {
  const [result] = await pool.query(
    "DELETE FROM income_budgets WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  listBudgets,
  createBudget,
  updateBudget,
  deleteBudget
};
