const { ok } = require("../utils/response");
const AppError = require("../utils/app-error");
const recordsService = require("../services/records.service");

/**
 * Controller: records
 */
async function list(req, res) {
  /**
   * GET /api/records
   * Query:
   *  - userId (required)
   *  - familyGroupId (optional)
   *  - recordType (optional: income|expense)
   *  - recordMonth (optional: YYYY-MM)
   *  - dateFrom/dateTo (optional: YYYY-MM-DD)
   */
  const data = await recordsService.list({
    userId: Number(req.query.userId),
    familyGroupId: req.query.familyGroupId ? Number(req.query.familyGroupId) : null,
    recordType: req.query.recordType ?? null,
    recordMonth: req.query.recordMonth ?? null,
    dateFrom: req.query.dateFrom ?? null,
    dateTo: req.query.dateTo ?? null
  });
  return ok(res, data);
}

async function create(req, res) {
  /**
   * POST /api/records
   */
  const created = await recordsService.create({
    ...req.body,
    userId: Number(req.body.userId)
  });
  return ok(res, created, "Record created");
}

async function update(req, res) {
  /**
   * PUT /api/records/:id
   */
  const updated = await recordsService.update(
    Number(req.params.id),
    Number(req.body.userId),
    req.body
  );
  if (!updated) throw new AppError(404, "E_NOT_FOUND", "Record not found");
  return ok(res, updated, "Record updated");
}

async function remove(req, res) {
  /**
   * DELETE /api/records/:id
   * Body: { userId }
   */
  await recordsService.remove(Number(req.params.id), Number(req.body.userId));
  return ok(res, true, "Record deleted");
}

module.exports = {
  list,
  create,
  update,
  remove
};

