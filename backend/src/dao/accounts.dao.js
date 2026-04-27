const { pool } = require("../config/db");

function buildListSql() {
  return `
    SELECT
      id, user_id, family_group_id,
      account_kind, account_name,
      bank_name, provider, currency,
      balance, credit_limit, last_balance_updated_at,
      principal_amount, expected_annual_rate,
      is_default, is_active,
      created_at, updated_at
    FROM accounts
    WHERE user_id = ? AND account_kind = ?
      AND (? IS NULL OR family_group_id = ?)
    ORDER BY id DESC
  `;
}

async function listByKind({ userId, familyGroupId, accountKind }) {
  const sql = buildListSql();
  const [rows] = await pool.query(sql, [
    userId,
    accountKind,
    familyGroupId ?? null,
    familyGroupId ?? null
  ]);
  return rows;
}

async function createAccount(payload) {
  const sql = `
    INSERT INTO accounts (
      user_id, family_group_id,
      account_kind, account_name,
      bank_name, provider, currency,
      balance, credit_limit, last_balance_updated_at,
      principal_amount, expected_annual_rate,
      is_default, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    payload.userId,
    payload.familyGroupId ?? null,
    payload.accountKind,
    payload.accountName,
    payload.bankName ?? null,
    payload.provider ?? null,
    payload.currency ?? "CNY",
    payload.balance ?? null,
    payload.creditLimit ?? null,
    payload.lastBalanceUpdatedAt ?? null,
    payload.principalAmount ?? null,
    payload.expectedAnnualRate ?? null,
    payload.isDefault ?? 0,
    payload.isActive ?? 1
  ];

  const [result] = await pool.query(sql, params);
  const id = result.insertId;
  const [rows] = await pool.query("SELECT * FROM accounts WHERE id = ? LIMIT 1", [id]);
  return rows[0];
}

async function updateAccount(id, userId, payload) {
  const sql = `
    UPDATE accounts
    SET
      family_group_id = ?,
      account_name = ?,
      bank_name = ?,
      provider = ?,
      currency = ?,
      balance = ?,
      credit_limit = ?,
      last_balance_updated_at = ?,
      principal_amount = ?,
      expected_annual_rate = ?,
      is_default = ?,
      is_active = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ? AND account_kind = ?
  `;
  const params = [
    payload.familyGroupId ?? null,
    payload.accountName,
    payload.bankName ?? null,
    payload.provider ?? null,
    payload.currency ?? "CNY",
    payload.balance ?? null,
    payload.creditLimit ?? null,
    payload.lastBalanceUpdatedAt ?? null,
    payload.principalAmount ?? null,
    payload.expectedAnnualRate ?? null,
    payload.isDefault ?? 0,
    payload.isActive ?? 1,
    id,
    userId,
    payload.accountKind
  ];

  const [result] = await pool.query(sql, params);
  if (result.affectedRows === 0) return null;
  const [rows] = await pool.query("SELECT * FROM accounts WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function deleteAccount(id, userId, accountKind) {
  const [result] = await pool.query(
    "DELETE FROM accounts WHERE id = ? AND user_id = ? AND account_kind = ?",
    [id, userId, accountKind]
  );
  return result.affectedRows > 0;
}

module.exports = {
  listByKind,
  createAccount,
  updateAccount,
  deleteAccount
};

