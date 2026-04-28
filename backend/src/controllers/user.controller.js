const { ok } = require("../utils/response");
const { saveAvatar, getProfile } = require("../services/user.service");

async function getUserProfile(req, res) {
  const user = await getProfile(req.user.userId);
  ok(res, user);
}

async function uploadAvatar(req, res) {
  const file = req.file;
  if (!file) {
    const err = new Error("No file uploaded");
    err.status = 400;
    throw err;
  }
  const updatedUser = await saveAvatar(req.user.userId, file);
  ok(res, { avatar_url: updatedUser.avatar_url });
}

module.exports = { getUserProfile, uploadAvatar };