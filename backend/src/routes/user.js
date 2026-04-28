const express = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth.middleware");
const { getUserProfile, uploadAvatar } = require("../controllers/user.controller");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

router.get("/profile", requireAuth, getUserProfile);
router.post("/avatar", requireAuth, upload.single("avatar"), uploadAvatar);

module.exports = router;