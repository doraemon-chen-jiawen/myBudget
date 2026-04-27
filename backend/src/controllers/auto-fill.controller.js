const { ok } = require("../utils/response");
const asyncHandler = require("../utils/async-handler");
const autoFillService = require("../services/auto-fill.service");

/**
 * Controller: auto fill
 */
async function run(req, res) {
  /**
   * POST /api/auto-fill/run
   * body:
   *  - userId (required)
   *  - recordType (income|expense, optional, default expense)
   *  - categorySnapshot (optional)
   *  - currency (optional, default CNY)
   *  - accountId (optional)
   *  - ruleName (optional)
   */
  const result = await autoFillService.runForUser(Number(req.body.userId), {
    ruleName: req.body.ruleName ?? undefined,
    recordType: req.body.recordType ?? undefined,
    categorySnapshot: req.body.categorySnapshot ?? undefined,
    currency: req.body.currency ?? undefined,
    accountId: req.body.accountId ?? null
  });
  return ok(res, result, "Auto-fill finished");
}

module.exports = {
  run
};

