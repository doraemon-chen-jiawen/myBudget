const { ok } = require("../utils/response");
const { loginByOpenid } = require("../services/auth.service");

/**
 * Controller: auth
 */
async function login(req, res) {
  /**
   * 用户登录（微信 openid）
   * POST /api/auth/login
   * body: { wechatOpenid, nickname?, avatarUrl?, phone? }
   */
  const user = await loginByOpenid(req.body);
  return ok(res, user, "Login success");
}

module.exports = {
  login
};

