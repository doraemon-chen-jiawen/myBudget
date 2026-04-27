const express = require("express");
const asyncHandler = require("../utils/async-handler");
const recordsController = require("../controllers/records.controller");

const router = express.Router();

/**
 * Records endpoints
 */
router.get("/", asyncHandler(recordsController.list));
router.post("/", asyncHandler(recordsController.create));
router.put("/:id", asyncHandler(recordsController.update));
router.delete("/:id", asyncHandler(recordsController.remove));

module.exports = router;

