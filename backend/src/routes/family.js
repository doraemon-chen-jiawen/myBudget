const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/family.controller");

const router = express.Router();

/**
 * Family summary endpoints
 */
router.get("/summary", asyncHandler(controller.summary));

module.exports = router;

