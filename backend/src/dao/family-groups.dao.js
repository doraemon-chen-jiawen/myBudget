const { pool } = require("../config/db");

async function createGroup(payload) {
  const [result] = await pool.query(
    "INSERT INTO family_groups (owner_user_id, name, description) VALUES (?, ?, ?)",
    [payload.ownerUserId, payload.name, payload.description ?? null]
  );
  const id = result.insertId;

  await pool.query(
    "INSERT INTO family_members (family_group_id, user_id, role, status) VALUES (?, ?, 'owner', 'active')",
    [id, payload.ownerUserId]
  );

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

async function getGroupByInvitationCode(code) {
  const [rows] = await pool.query(
    `SELECT
      fg.*,
      u.nickname as owner_nickname
    FROM invitation_codes ic
    INNER JOIN family_groups fg ON ic.family_group_id = fg.id
    INNER JOIN users u ON fg.owner_user_id = u.id
    WHERE ic.code = ?
      AND ic.is_active = 1
      AND ic.expires_at > NOW()
      AND ic.used_count < ic.max_uses
    LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

async function isFamilyMember(familyGroupId, userId) {
  const [rows] = await pool.query(
    `SELECT id FROM family_members
     WHERE family_group_id = ?
       AND user_id = ?
       AND status = 'active'
     LIMIT 1`,
    [familyGroupId, userId]
  );
  return rows.length > 0;
}

async function updateMemberStatus(familyGroupId, userId, status) {
  const [result] = await pool.query(
    `UPDATE family_members
     SET status = ?
     WHERE family_group_id = ? AND user_id = ?`,
    [status, familyGroupId, userId]
  );
  return result.affectedRows > 0;
}

async function removeMember(familyGroupId, userId) {
  const [result] = await pool.query(
    `DELETE FROM family_members
     WHERE family_group_id = ? AND user_id = ?`,
    [familyGroupId, userId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  createGroup,
  updateGroup,
  deleteGroup,
  getGroup,
  listGroups,
  addMember,
  listMembers,
  getGroupByInvitationCode,
  isFamilyMember,
  updateMemberStatus,
  removeMember
};

