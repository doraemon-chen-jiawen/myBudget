const express = require("express");
const asyncHandler = require("../utils/async-handler");
const budgetsController = require("../controllers/budgets.controller");

const router = express.Router();

/**
 * Budget management (CRUD)
 */
router.get("/", asyncHandler(budgetsController.list));
router.post("/", asyncHandler(budgetsController.create));
router.put("/:id", asyncHandler(budgetsController.update));
router.delete("/:id", asyncHandler(budgetsController.remove));

module.exports = router;

