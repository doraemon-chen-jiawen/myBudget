const { ok } = require("../utils/response");
const AppError = require("../utils/app-error");
const categoriesService = require("../services/budget-categories.service");

async function list(req, res) {
  const data = await categoriesService.list({
    userId: Number(req.query.userId),
    periodType: req.query.periodType || null
  });
  return ok(res, data);
}

async function create(req, res) {
  const body = req.body;
  const created = await categoriesService.create({
    userId: Number(body.userId),
    periodType: body.periodType,
    categoryKey: body.categoryKey,
    label: body.label,
    icon: body.icon,
    hint: body.hint,
    color: body.color,
    bgColor: body.bgColor,
    colorLight: body.colorLight,
    quickAmounts: body.quickAmounts,
    defaultAmount: body.defaultAmount != null ? Number(body.defaultAmount) : null
  });
  return ok(res, created, "Category created");
}

async function update(req, res) {
  const updated = await categoriesService.update(
    Number(req.params.id),
    Number(req.body.userId),
    {
      label: req.body.label,
      icon: req.body.icon,
      hint: req.body.hint,
      color: req.body.color,
      bgColor: req.body.bgColor,
      colorLight: req.body.colorLight,
      quickAmounts: req.body.quickAmounts,
      defaultAmount: req.body.defaultAmount != null ? Number(req.body.defaultAmount) : undefined,
      sortOrder: req.body.sortOrder != null ? Number(req.body.sortOrder) : undefined
    }
  );
  return ok(res, updated, "Category updated");
}

async function remove(req, res) {
  await categoriesService.remove(
    Number(req.params.id),
    Number(req.body.userId)
  );
  return ok(res, true, "Category deleted");
}

module.exports = { list, create, update, remove };
