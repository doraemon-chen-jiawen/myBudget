const { pool } = require("../config/db");

function toDateKey(dateStr) {
  // expects YYYY-MM-DD
  return dateStr;
}

async function getLastRecordDate(userId, familyGroupId = null) {
  if (familyGroupId !== null && familyGroupId !== undefined) {
    const [rows] = await pool.query(
      "SELECT MAX(record_date) AS last_date FROM records WHERE user_id = ? AND family_group_id = ?",
      [userId, familyGroupId]
    );
    return rows[0]?.last_date || null;
  }

  const [rows] = await pool.query(
    "SELECT MAX(record_date) AS last_date FROM records WHERE user_id = ?",
    [userId]
  );
  return rows[0]?.last_date || null;
}

async function findDailyBudget(conn, userId, dateStr) {
  const [rows] = await conn.query(
    `
    SELECT id, planned_amount
    FROM budgets
    WHERE user_id = ?
      AND period_type = 'daily'
      AND budget_date = ?
    LIMIT 1
    `,
    [userId, dateStr]
  );
  return rows[0] || null;
}

async function isAutoFilled(conn, userId, ruleName, dateStr) {
  const [rows] = await conn.query(
    `
    SELECT id
    FROM auto_fill_logs
    WHERE user_id = ?
      AND rule_name = ?
      AND period_type = 'daily'
      AND period_key = ?
    LIMIT 1
    `,
    [userId, ruleName, toDateKey(dateStr)]
  );
  return rows.length > 0;
}

async function existsRecordBySourceRef(conn, userId, source, sourceReference) {
  const [rows] = await conn.query(
    `
    SELECT id
    FROM records
    WHERE user_id = ?
      AND source = ?
      AND source_reference = ?
    LIMIT 1
    `,
    [userId, source, sourceReference]
  );
  return rows[0] || null;
}

async function insertRecord(conn, record) {
  const sql = `
    INSERT INTO records (
      user_id, family_group_id,
      record_type, amount, currency,
      record_date, record_month,
      category_snapshot, account_id,
      source, source_reference, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    record.userId,
    record.familyGroupId ?? null,
    record.recordType,
    record.amount,
    record.currency,
    record.recordDate,
    record.recordMonth,
    record.categorySnapshot ?? null,
    record.accountId ?? null,
    record.source ?? "auto",
    record.sourceReference ?? null,
    record.note ?? null
  ];
  const [result] = await conn.query(sql, params);
  const insertId = result.insertId;
  const [rows] = await conn.query("SELECT * FROM records WHERE id = ? LIMIT 1", [insertId]);
  return rows[0] || null;
}

async function insertAutoFillLog(conn, log) {
  const sql = `
    INSERT INTO auto_fill_logs (
      user_id, family_group_id,
      rule_name, period_type, period_key,
      target_date, target_month,
      budget_id, created_record_id,
      status, error_message, input_payload
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    log.userId,
    log.familyGroupId ?? null,
    log.ruleName,
    "daily",
    log.periodKey,
    log.targetDate ?? null,
    log.targetMonth ?? null,
    log.budgetId ?? null,
    log.createdRecordId ?? null,
    log.status,
    log.errorMessage ?? null,
    log.inputPayload ?? null
  ];
  const [result] = await conn.query(sql, params);
  return result.insertId;
}

module.exports = {
  getLastRecordDate,
  findDailyBudget,
  isAutoFilled,
  existsRecordBySourceRef,
  insertRecord,
  insertAutoFillLog,
  pool
};

