const { ok } = require("../utils/response");
const { loginByOpenid, loginByUsernamePassword, registerUser } = require("../services/auth.service");

/**
 * Controller: auth
 */
async function login(req, res) {
  const { username, password, wechatOpenid } = req.body;

  if (username && password) {
    const user = await loginByUsernamePassword({ username, password });
    return ok(res, user, "Login success");
  }

  if (wechatOpenid) {
    const user = await loginByOpenid(req.body);
    return ok(res, user, "Login success");
  }

  throw new Error("Missing credentials: either (username, password) or wechatOpenid is required");
}

async function register(req, res) {
  const user = await registerUser(req.body);
  return ok(res, user, "Registration success");
}

module.exports = {
  login,
  register
};

