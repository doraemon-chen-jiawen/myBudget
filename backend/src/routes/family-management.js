const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/family-management.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/user/families", asyncHandler(controller.listUserFamilies));
router.get("/:id/members", asyncHandler(controller.listMembers));
router.delete("/:id/members", asyncHandler(controller.removeMember));

module.exports = router;
