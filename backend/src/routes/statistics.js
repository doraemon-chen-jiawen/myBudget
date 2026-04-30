const express = require("express");
const asyncHandler = require("../utils/async-handler");
const statisticsController = require("../controllers/statistics.controller");

const router = express.Router();

router.get("/overview", asyncHandler(statisticsController.overview));
router.get("/calendar/monthly", asyncHandler(statisticsController.getMonthlyCalendar));
router.get("/bar-chart/yearly", asyncHandler(statisticsController.getYearlyBarChart));
router.get("/day-detail", asyncHandler(statisticsController.getDayDetail));

module.exports = router;
