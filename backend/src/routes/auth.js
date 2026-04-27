const express = require("express");
const asyncHandler = require("../utils/async-handler");
const authController = require("../controllers/auth.controller");

const router = express.Router();

/**
 * 用户登录（微信 openid）
 * POST /api/auth/login
 */
router.post("/login", asyncHandler(authController.login));

module.exports = router;

