const { ok } = require("../utils/response");
const incomeCategoriesService = require("../services/income-categories.service");

async function list(req, res) {
  const data = await incomeCategoriesService.list({
    userId: Number(req.query.userId),
    periodType: req.query.periodType ?? null
  });
  return ok(res, data);
}

async function create(req, res) {
  const created = await incomeCategoriesService.create({
    ...req.body,
    userId: Number(req.body.userId)
  });
  return ok(res, created, "Income category created");
}

async function update(req, res) {
  const updated = await incomeCategoriesService.update(
    Number(req.params.id),
    Number(req.body.userId),
    req.body
  );
  return ok(res, updated, "Income category updated");
}

async function remove(req, res) {
  await incomeCategoriesService.remove(Number(req.params.id), Number(req.body.userId));
  return ok(res, true, "Income category deleted");
}

module.exports = { list, create, update, remove };
