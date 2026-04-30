const express = require("express");
const asyncHandler = require("../utils/async-handler");
const backfillController = require("../controllers/backfill.controller");

const router = express.Router();

router.get("/setup", asyncHandler(backfillController.setup));
router.post("/create", asyncHandler(backfillController.create));

module.exports = router;
