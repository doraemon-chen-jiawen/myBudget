const express = require("express");
const asyncHandler = require("../utils/async-handler");
const statisticsController = require("../controllers/statistics.controller");

const router = express.Router();

router.get("/overview", asyncHandler(statisticsController.overview));

module.exports = router;
