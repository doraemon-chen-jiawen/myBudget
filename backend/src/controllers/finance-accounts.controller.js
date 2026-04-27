const { ok } = require("../utils/response");
const AppError = require("../utils/app-error");
const accountsService = require("../services/accounts.service");

/**
 * Controller: finance accounts (finance)
 */
async function list(req, res) {
  /**
   * GET /api/finance-accounts
   */
  const data = await accountsService.list({
    userId: Number(req.query.userId),
    familyGroupId: req.query.familyGroupId ? Number(req.query.familyGroupId) : null,
    accountKind: "finance"
  });
  return ok(res, data);
}

async function create(req, res) {
  /**
   * POST /api/finance-accounts
   */
  const created = await accountsService.createFinance({
    ...req.body,
    userId: Number(req.body.userId)
  });
  return ok(res, created, "Finance account created");
}

async function update(req, res) {
  /**
   * PUT /api/finance-accounts/:id
   */
  const updated = await accountsService.updateFinance(
    Number(req.params.id),
    Number(req.body.userId),
    req.body
  );
  if (!updated) throw new AppError(404, "E_NOT_FOUND", "Finance account not found");
  return ok(res, updated, "Finance account updated");
}

async function remove(req, res) {
  /**
   * DELETE /api/finance-accounts/:id
   * Body: { userId }
   */
  await accountsService.deleteFinance(Number(req.params.id), Number(req.body.userId));
  return ok(res, true, "Finance account deleted");
}

module.exports = {
  list,
  create,
  update,
  remove
};

