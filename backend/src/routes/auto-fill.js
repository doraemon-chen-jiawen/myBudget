const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/auto-fill.controller");

const router = express.Router();

/**
 * Auto-fill APIs
 */
router.post("/run", asyncHandler(controller.run));

module.exports = router;

