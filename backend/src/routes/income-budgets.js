const express = require("express");
const asyncHandler = require("../utils/async-handler");
const incomeBudgetsController = require("../controllers/income-budgets.controller");

const router = express.Router();

router.get("/", asyncHandler(incomeBudgetsController.list));
router.post("/initialize-defaults", asyncHandler(incomeBudgetsController.initializeDefaults));
router.post("/", asyncHandler(incomeBudgetsController.create));
router.put("/:id", asyncHandler(incomeBudgetsController.update));
router.delete("/:id", asyncHandler(incomeBudgetsController.remove));

module.exports = router;
