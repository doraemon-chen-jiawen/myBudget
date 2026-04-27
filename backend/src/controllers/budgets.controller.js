const { ok } = require("../utils/response");
const AppError = require("../utils/app-error");
const budgetsService = require("../services/budgets.service");

/**
 * Controller: budgets
 */
async function list(req, res) {
  /**
   * GET /api/budgets
   * Query:
   *  - userId (required)
   *  - familyGroupId (optional)
   *  - periodType (optional: daily|monthly|finance_interest)
   *  - periodKey (optional)
   */
  const data = await budgetsService.list({
    userId: Number(req.query.userId),
    familyGroupId: req.query.familyGroupId ? Number(req.query.familyGroupId) : null,
    periodType: req.query.periodType ?? null,
    periodKey: req.query.periodKey ?? null
  });
  return ok(res, data);
}

async function create(req, res) {
  /**
   * POST /api/budgets
   * Body:
   *  - userId (required)
   *  - familyGroupId (optional)
   *  - periodType (required)
   *  - periodKey (optional; daily defaults to budgetDate, monthly/finance_interest defaults to budgetMonth)
   *  - budgetDate (daily)
   *  - budgetMonth (monthly/finance_interest)
   *  - accountId (finance_interest)
   *  - plannedAmount (daily/monthly)
   *  - plannedAnnualRate (finance_interest)
   *  - plannedPrincipalAmount (finance_interest)
   *  - note (optional)
   */
  const created = await budgetsService.create({
    ...req.body,
    userId: Number(req.body.userId)
  });
  return ok(res, created, "Budget created");
}

async function update(req, res) {
  /**
   * PUT /api/budgets/:id
   * Body: same as create (except id)
   */
  const updated = await budgetsService.update(
    Number(req.params.id),
    Number(req.body.userId),
    req.body
  );
  if (!updated) throw new AppError(404, "E_NOT_FOUND", "Budget not found");
  return ok(res, updated, "Budget updated");
}

async function remove(req, res) {
  /**
   * DELETE /api/budgets/:id
   * Body: { userId }
   */
  await budgetsService.remove(Number(req.params.id), Number(req.body.userId));
  return ok(res, true, "Budget deleted");
}

module.exports = {
  list,
  create,
  update,
  remove
};

