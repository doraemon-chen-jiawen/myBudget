const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/home.controller");

const router = express.Router();

/**
 * Home page endpoints
 */
router.get("/index", asyncHandler(controller.index));
router.get("/user-stats", asyncHandler(controller.userStats));
router.get("/daily-quote", asyncHandler(controller.dailyQuote));
router.post("/quick-record", asyncHandler(controller.quickRecord));
router.post("/adjust-quick-record", asyncHandler(controller.adjustQuickRecord));

module.exports = router;
