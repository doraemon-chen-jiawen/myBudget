const { ok } = require("../utils/response");
const statisticsService = require("../services/statistics.service");

async function overview(req, res) {
  const data = await statisticsService.getOverview({
    userId: Number(req.query.userId),
    dimension: req.query.dimension || "month",
    date: req.query.date || null,
    familyGroupId: req.query.familyGroupId ? Number(req.query.familyGroupId) : null,
    memberUserId: req.query.memberUserId ? Number(req.query.memberUserId) : null
  });
  return ok(res, data);
}

async function getMonthlyCalendar(req, res) {
  const data = await statisticsService.getMonthlyCalendar({
    userId: Number(req.query.userId),
    year: Number(req.query.year),
    month: Number(req.query.month),
    familyGroupId: req.query.familyGroupId ? Number(req.query.familyGroupId) : null,
    memberUserId: req.query.memberUserId ? Number(req.query.memberUserId) : null
  });
  return ok(res, data);
}

async function getYearlyBarChart(req, res) {
  const data = await statisticsService.getYearlyBarChart({
    userId: Number(req.query.userId),
    year: Number(req.query.year),
    familyGroupId: req.query.familyGroupId ? Number(req.query.familyGroupId) : null,
    memberUserId: req.query.memberUserId ? Number(req.query.memberUserId) : null
  });
  return ok(res, data);
}

async function getDayDetail(req, res) {
  const data = await statisticsService.getDayDetail({
    userId: Number(req.query.userId),
    date: req.query.date,
    familyGroupId: req.query.familyGroupId ? Number(req.query.familyGroupId) : null,
    memberUserId: req.query.memberUserId ? Number(req.query.memberUserId) : null
  });
  return ok(res, data);
}

module.exports = {
  overview,
  getMonthlyCalendar,
  getYearlyBarChart,
  getDayDetail
};
