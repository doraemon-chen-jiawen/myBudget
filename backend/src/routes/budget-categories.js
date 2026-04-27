const express = require("express");
const asyncHandler = require("../utils/async-handler");
const categoriesController = require("../controllers/budget-categories.controller");

const router = express.Router();

router.get("/", asyncHandler(categoriesController.list));
router.post("/", asyncHandler(categoriesController.create));
router.put("/:id", asyncHandler(categoriesController.update));
router.delete("/:id", asyncHandler(categoriesController.remove));

module.exports = router;
