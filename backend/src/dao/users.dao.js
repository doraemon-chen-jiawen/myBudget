const { pool } = require("../config/db");

/**
 * DAO: users
 */
async function findByWechatOpenid(wechatOpenid) {
  const [rows] = await pool.query(
    "SELECT id, wechat_openid, nickname, avatar_url, phone, timezone, is_active, created_at, updated_at FROM users WHERE wechat_openid = ? LIMIT 1",
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

async function updateUserPartial(id, { nickname, avatarUrl, phone }) {
  await pool.query(
    "UPDATE users SET nickname = ?, avatar_url = ?, phone = ? WHERE id = ?",
    [nickname || "", avatarUrl || null, phone || null, id]
  );
  return findById(id);
}

async function findById(id) {
  const [rows] = await pool.query(
    "SELECT id, wechat_openid, nickname, avatar_url, phone, timezone, is_active, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
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

module.exports = {
  upsertByWechatOpenid,
  findByWechatOpenid
};

