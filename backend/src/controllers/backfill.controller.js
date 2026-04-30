const { ok } = require("../utils/response");
const backfillService = require("../services/backfill.service");

async function setup(req, res) {
  const data = await backfillService.getBackfillSetup({
    userId: Number(req.query.userId)
  });
  return ok(res, data);
}

async function create(req, res) {
  const data = await backfillService.createBackfillRecords({
    userId: Number(req.body.userId),
    startDate: req.body.startDate,
    endDate: req.body.endDate || null,
    amountMode: req.body.amountMode,
    customAmount: req.body.customAmount ? Number(req.body.customAmount) : null,
    categoryKey: req.body.categoryKey,
    note: req.body.note || null,
    familyGroupId: req.body.familyGroupId ? Number(req.body.familyGroupId) : null
  });
  return ok(res, data, `已创建 ${data.createdCount} 条补记记录`);
}

module.exports = {
  setup,
  create
};
