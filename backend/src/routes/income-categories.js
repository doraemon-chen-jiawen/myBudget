const express = require("express");
const asyncHandler = require("../utils/async-handler");
const incomeCategoriesController = require("../controllers/income-categories.controller");

const router = express.Router();

router.get("/", asyncHandler(incomeCategoriesController.list));
router.post("/", asyncHandler(incomeCategoriesController.create));
router.put("/:id", asyncHandler(incomeCategoriesController.update));
router.delete("/:id", asyncHandler(incomeCategoriesController.remove));

module.exports = router;
