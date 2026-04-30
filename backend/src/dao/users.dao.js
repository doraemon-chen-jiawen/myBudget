const { pool } = require("../config/db");
const bcrypt = require("bcrypt");

/**
 * DAO: users
 */
async function findByUsername(username) {
  const [rows] = await pool.query(
    "SELECT id, username, wechat_openid, nickname, avatar_url, phone, timezone, is_active, created_at, updated_at FROM users WHERE username = ? LIMIT 1",
    [username]
  );
  return rows[0] || null;
}

async function findByUsernameWithPassword(username) {
  const [rows] = await pool.query(
    "SELECT id, username, password_hash, wechat_openid, nickname, avatar_url, phone, timezone, is_active, created_at, updated_at FROM users WHERE username = ? LIMIT 1",
    [username]
  );
  return rows[0] || null;
}

async function findByWechatOpenid(wechatOpenid) {
  const [rows] = await pool.query(
    "SELECT id, username, wechat_openid, nickname, avatar_url, phone, timezone, is_active, created_at, updated_at FROM users WHERE wechat_openid = ? LIMIT 1",
    [wechatOpenid]
  );
  return rows[0] || null;
}

async function createUser({ wechatOpenid, nickname, avatarUrl, phone }) {
  const [result] = await pool.query(
    "INSERT INTO users (wechat_openid, nickname, avatar_url, phone) VALUES (?, ?, ?, ?)",
    [wechatOpenid, nickname || "", avatarUrl || null, phone || null]
  );
  const id = result.insertId;
  return findById(id);
}

async function createUserWithPassword({ username, passwordHash, nickname, avatarUrl }) {
  const [result] = await pool.query(
    "INSERT INTO users (username, password_hash, nickname, avatar_url) VALUES (?, ?, ?, ?)",
    [username, passwordHash, nickname || "", avatarUrl || null]
  );
  const id = result.insertId;
  return findById(id);
}

async function updateUserPartial(id, { nickname, avatarUrl, phone }) {
  await pool.query(
    "UPDATE users SET nickname = ?, avatar_url = ?, phone = ? WHERE id = ?",
    [nickname || "", avatarUrl || null, phone || null, id]
  );
  return findById(id);
}

async function updateUserAvatar(userId, avatarUrl) {
  await pool.query(
    "UPDATE users SET avatar_url = ? WHERE id = ?",
    [avatarUrl, userId]
  );
  return findById(userId);
}

async function findById(id) {
  const [rows] = await pool.query(
    "SELECT id, username, wechat_openid, nickname, avatar_url, phone, timezone, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

/**
 * Upsert by wechat_openid (login).
 */
async function upsertByWechatOpenid({ wechatOpenid, nickname, avatarUrl, phone }) {
  const existed = await findByWechatOpenid(wechatOpenid);
  if (!existed) {
    return createUser({ wechatOpenid, nickname, avatarUrl, phone });
  }
  return updateUserPartial(existed.id, { nickname, avatarUrl, phone });
}

async function listUserFamilies(userId) {
  const [rows] = await pool.query(
    `SELECT
      fg.id,
      fg.name,
      fg.description,
      fg.owner_user_id,
      fm.role,
      fm.status
    FROM family_members fm
    INNER JOIN family_groups fg ON fm.family_group_id = fg.id
    WHERE fm.user_id = ? AND fm.status = 'active'
    ORDER BY fm.joined_at DESC`,
    [userId]
  );
  return rows;
}

module.exports = {
  findById,
  upsertByWechatOpenid,
  findByWechatOpenid,
  findByUsername,
  findByUsernameWithPassword,
  createUserWithPassword,
  updateUserPartial,
  updateUserAvatar,
  listUserFamilies
};

