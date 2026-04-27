const express = require("express");
const asyncHandler = require("../utils/async-handler");
const authController = require("../controllers/auth.controller");

const router = express.Router();

/**
 * 用户登录（微信 openid 或 用户名密码）
 * POST /api/auth/login
 */
router.post("/login", asyncHandler(authController.login));

/**
 * 用户注册（用户名密码）
 * POST /api/auth/register
 */
router.post("/register", asyncHandler(authController.register));

module.exports = router;

