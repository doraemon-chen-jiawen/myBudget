const { ok } = require("../utils/response");
const AppError = require("../utils/app-error");
const accountsService = require("../services/accounts.service");

/**
 * Controller: bank accounts (saving)
 */
async function list(req, res) {
  /**
   * GET /api/bank-accounts
   */
  const data = await accountsService.list({
    userId: Number(req.query.userId),
    familyGroupId: req.query.familyGroupId ? Number(req.query.familyGroupId) : null,
    accountKind: "saving"
  });
  return ok(res, data);
}

async function create(req, res) {
  /**
   * POST /api/bank-accounts
   */
  const created = await accountsService.createSaving({
    ...req.body,
    userId: Number(req.body.userId)
  });
  return ok(res, created, "Bank account created");
}

async function update(req, res) {
  /**
   * PUT /api/bank-accounts/:id
   */
  const updated = await accountsService.updateSaving(
    Number(req.params.id),
    Number(req.body.userId),
    req.body
  );
  if (!updated) throw new AppError(404, "E_NOT_FOUND", "Bank account not found");
  return ok(res, updated, "Bank account updated");
}

async function remove(req, res) {
  /**
   * DELETE /api/bank-accounts/:id
   * Body: { userId }
   */
  await accountsService.deleteSaving(Number(req.params.id), Number(req.body.userId));
  return ok(res, true, "Bank account deleted");
}

module.exports = {
  list,
  create,
  update,
  remove
};

