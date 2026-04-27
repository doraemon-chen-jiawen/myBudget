const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/home.controller");

const router = express.Router();

/**
 * Home page endpoints
 */
router.get("/index", asyncHandler(controller.index));
router.post("/quick-record", asyncHandler(controller.quickRecord));

module.exports = router;
