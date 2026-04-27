const { ok } = require("../utils/response");
const familyService = require("../services/family.service");

/**
 * Controller: family
 */
async function summary(req, res) {
  /**
   * GET /api/family/summary?familyGroupId=...
   * Trigger family linkage auto-fill when querying summary.
   */
  const familyGroupId = Number(req.query.familyGroupId);
  const data = await familyService.summaryAndAutoFill(familyGroupId);
  return ok(res, data);
}

module.exports = {
  summary
};

