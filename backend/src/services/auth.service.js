const AppError = require("../utils/app-error");
const { upsertByWechatOpenid, findByUsernameWithPassword, createUserWithPassword, findByUsername } = require("../dao/users.dao");
const bcrypt = require("bcrypt");

function normalizeOptionalString(v) {
  return typeof v === "string" ? v.trim() : undefined;
}

/**
 * Service: login by wechat_openid.
 */
async function loginByOpenid(payload) {
  const wechatOpenid = payload?.wechatOpenid;
  if (!wechatOpenid || typeof wechatOpenid !== "string") {
    throw new AppError(400, "E_BAD_REQUEST", "Missing required field: wechatOpenid");
  }

  const nickname = normalizeOptionalString(payload?.nickname);
  const avatarUrl = normalizeOptionalString(payload?.avatarUrl);
  const phone = normalizeOptionalString(payload?.phone);

  return upsertByWechatOpenid({
    wechatOpenid: wechatOpenid.trim(),
    nickname,
    avatarUrl,
    phone
  });
}

/**
 * Service: login by username and password.
 */
async function loginByUsernamePassword(payload) {
  const { username, password } = payload;

  if (!username || !password) {
    throw new AppError(400, "E_BAD_REQUEST", "Missing required fields: username or password");
  }

  const user = await findByUsernameWithPassword(username.trim());

  if (!user) {
    throw new AppError(401, "E_UNAUTHORIZED", "Invalid username or password");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError(401, "E_UNAUTHORIZED", "Invalid username or password");
  }

  return {
    userId: user.id,
    username: user.username,
    nickname: user.nickname,
    token: generateToken(user.id)
  };
}

/**
 * Generate a simple JWT-like token.
 */
function generateToken(userId) {
  const payload = { userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Service: register new user.
 */
async function registerUser(payload) {
  const { username, password, nickname } = payload;

  if (!username || !password) {
    throw new AppError(400, "E_BAD_REQUEST", "Missing required fields: username or password");
  }

  if (password.length < 6) {
    throw new AppError(400, "E_BAD_REQUEST", "Password must be at least 6 characters");
  }

  const trimmedUsername = username.trim();

  const existingUser = await findByUsername(trimmedUsername);
  if (existingUser) {
    throw new AppError(409, "E_CONFLICT", "Username already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await createUserWithPassword({
    username: trimmedUsername,
    passwordHash,
    nickname: nickname?.trim() || trimmedUsername
  });

  return {
    userId: user.id,
    username: user.username,
    nickname: user.nickname,
    token: generateToken(user.id)
  };
}

module.exports = {
  loginByOpenid,
  loginByUsernamePassword,
  registerUser
};

