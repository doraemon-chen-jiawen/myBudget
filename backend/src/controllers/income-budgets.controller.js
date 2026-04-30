const { ok } = require("../utils/response");
const AppError = require("../utils/app-error");
const incomeBudgetsService = require("../services/income-budgets.service");

async function list(req, res) {
  const data = await incomeBudgetsService.list({
    userId: Number(req.query.userId),
    periodType: req.query.periodType ?? null,
    periodKey: req.query.periodKey ?? null
  });
  return ok(res, data);
}

async function create(req, res) {
  const created = await incomeBudgetsService.create({
    ...req.body,
    userId: Number(req.body.userId)
  });
  return ok(res, created, "Income budget created");
}

async function update(req, res) {
  const updated = await incomeBudgetsService.update(
    Number(req.params.id),
    Number(req.body.userId),
    req.body
  );
  return ok(res, updated, "Income budget updated");
}

async function remove(req, res) {
  await incomeBudgetsService.remove(Number(req.params.id), Number(req.body.userId));
  return ok(res, true, "Income budget deleted");
}

async function initializeDefaults(req, res) {
  const data = await incomeBudgetsService.initializeDefaults({
    userId: Number(req.body.userId),
    periodType: req.body.periodType
  });
  return ok(res, data, "Default income budgets initialized");
}

module.exports = { list, create, update, remove, initializeDefaults };
