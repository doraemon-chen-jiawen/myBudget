const { pool } = require("../config/db");

function buildWhere(filters) {
  const where = ["user_id = ?"];
  const params = [filters.userId];

  if (filters.familyGroupId !== undefined && filters.familyGroupId !== null) {
    where.push("family_group_id = ?");
    params.push(filters.familyGroupId);
  }

  if (filters.periodType) {
    where.push("period_type = ?");
    params.push(filters.periodType);
  }
  if (filters.periodKey) {
    where.push("period_key = ?");
    params.push(filters.periodKey);
  }
  if (filters.budgetDate) {
    where.push("budget_date = ?");
    params.push(filters.budgetDate);
  }
  if (filters.budgetMonth) {
    where.push("budget_month = ?");
    params.push(filters.budgetMonth);
  }
  if (filters.budgetYear) {
    where.push("budget_year = ?");
    params.push(filters.budgetYear);
  }

  return { whereSql: where.join(" AND "), params };
}

async function listBudgets(filters) {
  const { whereSql, params } = buildWhere(filters);
  const sql = `
    SELECT
      id, user_id, family_group_id,
      period_type, period_key, budget_date, budget_month, account_id,
      planned_amount, planned_annual_rate, planned_principal_amount, planned_interest_amount,
      note, created_at, updated_at
    FROM budgets
    WHERE ${whereSql}
    ORDER BY id DESC
  `;
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function createBudget(payload) {
  const sql = `
    INSERT INTO budgets (
      user_id, family_group_id,
      period_type, period_key,
      budget_date, budget_month, budget_year,
      account_id,
      planned_amount, planned_annual_rate, planned_principal_amount,
      note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    payload.userId,
    payload.familyGroupId ?? null,
    payload.periodType,
    payload.periodKey,
    payload.budgetDate ?? null,
    payload.budgetMonth ?? null,
    payload.budgetYear ?? null,
    payload.accountId ?? null,
    payload.plannedAmount ?? null,
    payload.plannedAnnualRate ?? null,
    payload.plannedPrincipalAmount ?? null,
    payload.note ?? null
  ];

  const [result] = await pool.query(sql, params);
  const id = result.insertId;
  const [rows] = await pool.query(
    "SELECT * FROM budgets WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0];
}

async function updateBudget(id, userId, payload) {
  const sql = `
    UPDATE budgets
    SET
      family_group_id = ?,
      period_type = ?,
      period_key = ?,
      budget_date = ?,
      budget_month = ?,
      budget_year = ?,
      account_id = ?,
      planned_amount = ?,
      planned_annual_rate = ?,
      planned_principal_amount = ?,
      note = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `;

  const params = [
    payload.familyGroupId ?? null,
    payload.periodType,
    payload.periodKey,
    payload.budgetDate ?? null,
    payload.budgetMonth ?? null,
    payload.budgetYear ?? null,
    payload.accountId ?? null,
    payload.plannedAmount ?? null,
    payload.plannedAnnualRate ?? null,
    payload.plannedPrincipalAmount ?? null,
    payload.note ?? null,
    id,
    userId
  ];

  const [result] = await pool.query(sql, params);
  if (result.affectedRows === 0) return null;

  const [rows] = await pool.query("SELECT * FROM budgets WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function deleteBudget(id, userId) {
  const [result] = await pool.query(
    "DELETE FROM budgets WHERE id = ? AND user_id = ?",
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

