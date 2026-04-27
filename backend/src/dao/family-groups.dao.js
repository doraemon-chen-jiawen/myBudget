const { pool } = require("../config/db");

async function createGroup(payload) {
  const [result] = await pool.query(
    "INSERT INTO family_groups (owner_user_id, name, description) VALUES (?, ?, ?)",
    [payload.ownerUserId, payload.name, payload.description ?? null]
  );
  const id = result.insertId;
  const [rows] = await pool.query("SELECT * FROM family_groups WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function updateGroup(id, ownerUserId, payload) {
  const [result] = await pool.query(
    "UPDATE family_groups SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_user_id = ?",
    [payload.name, payload.description ?? null, id, ownerUserId]
  );
  if (result.affectedRows === 0) return null;
  const [rows] = await pool.query("SELECT * FROM family_groups WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function deleteGroup(id, ownerUserId) {
  const [result] = await pool.query(
    "DELETE FROM family_groups WHERE id = ? AND owner_user_id = ?",
    [id, ownerUserId]
  );
  return result.affectedRows > 0;
}

async function getGroup(id) {
  const [rows] = await pool.query("SELECT * FROM family_groups WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function listGroups({ ownerUserId } = {}) {
  let sql = "SELECT * FROM family_groups";
  const params = [];
  if (ownerUserId) {
    sql += " WHERE owner_user_id = ?";
    params.push(ownerUserId);
  }
  sql += " ORDER BY id DESC";
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function addMember({ familyGroupId, userId, role, status }) {
  const [result] = await pool.query(
    "INSERT INTO family_members (family_group_id, user_id, role, status) VALUES (?, ?, ?, ?)",
    [familyGroupId, userId, role ?? "member", status ?? "active"]
  );
  const id = result.insertId;
  const [rows] = await pool.query("SELECT * FROM family_members WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function listMembers(familyGroupId) {
  const [rows] = await pool.query(
    `
    SELECT
      fm.id,
      fm.family_group_id,
      fm.user_id,
      fm.role,
      fm.status,
      fm.joined_at,
      fm.last_seen_at,
      u.wechat_openid,
      u.nickname,
      u.avatar_url,
      u.phone
    FROM family_members fm
    INNER JOIN users u ON fm.user_id = u.id
    WHERE fm.family_group_id = ?
    ORDER BY fm.joined_at DESC
  `,
    [familyGroupId]
  );
  return rows;
}

module.exports = {
  createGroup,
  updateGroup,
  deleteGroup,
  getGroup,
  listGroups,
  addMember,
  listMembers
};

