const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/family-groups.controller");

const router = express.Router();

/**
 * Family groups APIs
 */
router.post("/", asyncHandler(controller.create));
router.get("/", asyncHandler(controller.list));
router.get("/:id", asyncHandler(controller.getOne));
router.put("/:id", asyncHandler(controller.update));
router.delete("/:id", asyncHandler(controller.remove));

/**
 * Family members APIs
 */
router.post("/:id/members", asyncHandler(controller.addMember));
router.get("/:id/members", asyncHandler(controller.listMembers));

module.exports = router;

