const { pool } = require("../config/db");

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function codeExists(code) {
  const [rows] = await pool.query(
    "SELECT id FROM invitation_codes WHERE code = ? LIMIT 1",
    [code]
  );
  return rows.length > 0;
}

async function createInvitationCode({ familyGroupId, createdBy, maxUses = 10 }) {
  let code;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = generateCode();
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error('Failed to generate unique invitation code');
    }
  } while (await codeExists(code));

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const [result] = await pool.query(
    `INSERT INTO invitation_codes
     (family_group_id, code, created_by, max_uses, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [familyGroupId, code, createdBy, maxUses, expiresAt]
  );

  return findById(result.insertId);
}

async function findByCode(code) {
  const [rows] = await pool.query(
    `SELECT * FROM invitation_codes
     WHERE code = ? AND is_active = 1
     AND expires_at > NOW()
     AND used_count < max_uses
     LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    "SELECT * FROM invitation_codes WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function listByFamilyGroup(familyGroupId) {
  const [rows] = await pool.query(
    `SELECT * FROM invitation_codes
     WHERE family_group_id = ?
     ORDER BY created_at DESC`,
    [familyGroupId]
  );
  return rows;
}

async function incrementUsedCount(id) {
  await pool.query(
    `UPDATE invitation_codes
     SET used_count = used_count + 1
     WHERE id = ?`,
    [id]
  );
  return findById(id);
}

async function deactivateCode(id) {
  await pool.query(
    `UPDATE invitation_codes
     SET is_active = 0
     WHERE id = ?`,
    [id]
  );
  return findById(id);
}

async function deleteCode(id, userId) {
  const [result] = await pool.query(
    `DELETE FROM invitation_codes
     WHERE id = ? AND created_by = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  createInvitationCode,
  findByCode,
  findById,
  listByFamilyGroup,
  incrementUsedCount,
  deactivateCode,
  deleteCode
};
