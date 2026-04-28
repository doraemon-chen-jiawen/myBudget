const express = require("express");
const asyncHandler = require("../utils/async-handler");
const controller = require("../controllers/invitation.controller");
const { requireAuth, requireFamilyMember } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", asyncHandler(controller.create));
router.post("/validate", asyncHandler(controller.validate));
router.post("/accept", asyncHandler(controller.accept));
router.get("/:id", requireFamilyMember, asyncHandler(controller.list));
router.delete("/:id/:invitationId", requireFamilyMember, asyncHandler(controller.remove));

module.exports = router;
