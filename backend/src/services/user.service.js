const path = require("path");
const fs = require("fs");
const { updateUserAvatar, findById } = require("../dao/users.dao");

const UPLOAD_DIR = path.join(__dirname, "../../uploads/avatars");

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function buildAvatarUrl(filename) {
  return `/uploads/avatars/${filename}`;
}

async function saveAvatar(userId, file) {
  ensureUploadDir();

  const ext = path.extname(file.name).toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
    const err = new Error("不支持的图片格式，请上传 jpg/png/gif/webp");
    err.status = 400;
    throw err;
  }

  const filename = `avatar_${userId}_${Date.now()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(file.data, "base64");
  fs.writeFileSync(filepath, buffer);

  const avatarUrl = buildAvatarUrl(filename);
  const updated = await updateUserAvatar(userId, avatarUrl);
  return updated;
}

async function getProfile(userId) {
  const user = await findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar_url: user.avatar_url,
    phone: user.phone
  };
}

module.exports = { saveAvatar, getProfile };