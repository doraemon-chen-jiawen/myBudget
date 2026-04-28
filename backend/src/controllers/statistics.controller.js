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

module.exports = { overview };
