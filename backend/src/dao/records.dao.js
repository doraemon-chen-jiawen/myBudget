const { pool } = require("../config/db");

async function listRecords(filters) {
  const where = ["user_id = ?"];
  const params = [filters.userId];

  if (filters.familyGroupId !== undefined && filters.familyGroupId !== null) {
    where.push("family_group_id = ?");
    params.push(filters.familyGroupId);
  }

  if (filters.recordType) {
    where.push("record_type = ?");
    params.push(filters.recordType);
  }

  if (filters.recordMonth) {
    where.push("record_month = ?");
    params.push(filters.recordMonth);
  }

  if (filters.dateFrom) {
    where.push("record_date >= ?");
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    where.push("record_date <= ?");
    params.push(filters.dateTo);
  }

  const sql = `
    SELECT
      id, user_id, family_group_id,
      record_type, amount, currency,
      record_date, record_month,
      frequent_item_id, category_snapshot,
      account_id,
      note, source, source_reference,
      created_at, updated_at
    FROM records
    WHERE ${where.join(" AND ")}
    ORDER BY record_date DESC, id DESC
  `;

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function createRecord(payload) {
  const sql = `
    INSERT INTO records (
      user_id, family_group_id,
      record_type, amount, currency,
      record_date, record_month,
      frequent_item_id, category_snapshot,
      account_id, note,
      source, source_reference
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    payload.userId,
    payload.familyGroupId ?? null,
    payload.recordType,
    payload.amount,
    payload.currency,
    payload.recordDate,
    payload.recordMonth,
    payload.frequentItemId ?? null,
    payload.categorySnapshot ?? null,
    payload.accountId ?? null,
    payload.note ?? null,
    payload.source ?? "manual",
    payload.sourceReference ?? null
  ];
  const [result] = await pool.query(sql, params);
  const id = result.insertId;
  const [rows] = await pool.query("SELECT * FROM records WHERE id = ? LIMIT 1", [id]);
  return rows[0];
}

async function updateRecord(id, userId, payload) {
  const sql = `
    UPDATE records
    SET
      family_group_id = ?,
      record_type = ?,
      amount = ?,
      currency = ?,
      record_date = ?,
      record_month = ?,
      frequent_item_id = ?,
      category_snapshot = ?,
      account_id = ?,
      note = ?,
      source = ?,
      source_reference = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `;

  const params = [
    payload.familyGroupId ?? null,
    payload.recordType,
    payload.amount,
    payload.currency,
    payload.recordDate,
    payload.recordMonth,
    payload.frequentItemId ?? null,
    payload.categorySnapshot ?? null,
    payload.accountId ?? null,
    payload.note ?? null,
    payload.source ?? "manual",
    payload.sourceReference ?? null,
    id,
    userId
  ];

  const [result] = await pool.query(sql, params);
  if (result.affectedRows === 0) return null;
  const [rows] = await pool.query("SELECT * FROM records WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function deleteRecord(id, userId) {
  const [result] = await pool.query("DELETE FROM records WHERE id = ? AND user_id = ?", [id, userId]);
  return result.affectedRows > 0;
}

async function getUserStats(userId) {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS total_count,
       COUNT(DISTINCT record_date) AS total_days
     FROM records
     WHERE user_id = ?`,
    [userId]
  );
  return rows[0] || { total_count: 0, total_days: 0 };
}

module.exports = {
  listRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  getUserStats
};

