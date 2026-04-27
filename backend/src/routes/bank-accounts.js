const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/bank-accounts.controller");

const router = express.Router();

/**
 * Bank accounts (saving)
 */
router.get("/", asyncHandler(controller.list));
router.post("/", asyncHandler(controller.create));
router.put("/:id", asyncHandler(controller.update));
router.delete("/:id", asyncHandler(controller.remove));

module.exports = router;

