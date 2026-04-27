const AppError = require("../utils/app-error");
const { upsertByWechatOpenid } = require("../dao/users.dao");

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

module.exports = {
  loginByOpenid
};

