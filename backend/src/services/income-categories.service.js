const AppError = require("../utils/app-error");
const incomeCategoriesDao = require("../dao/income-categories.dao");

const ALLOWED_PERIOD_TYPES = ["monthly", "yearly"];

function parseQuickAmounts(row) {
  if (row.quick_amounts && typeof row.quick_amounts === "string") {
    row.quick_amounts = JSON.parse(row.quick_amounts);
  }
  return row;
}

async function list({ userId, periodType }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  const rows = await incomeCategoriesDao.listCategories({
    userId,
    periodType: periodType || null
  });
  return rows.map(parseQuickAmounts);
}

async function create(payload) {
  if (!payload?.userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  if (!payload.periodType) throw new AppError(400, "E_BAD_REQUEST", "Missing periodType");
  if (!ALLOWED_PERIOD_TYPES.includes(payload.periodType)) {
    throw new AppError(400, "E_BAD_REQUEST", "Invalid periodType");
  }
  if (!payload.label?.trim()) throw new AppError(400, "E_BAD_REQUEST", "Missing label");

  let categoryKey = payload.categoryKey;
  if (!categoryKey) {
    categoryKey = "custom_" + Math.random().toString(36).substring(2, 10);
  }

  const existing = await incomeCategoriesDao.listCategories({
    userId: payload.userId,
    periodType: payload.periodType
  });
  if (existing.some(c => c.category_key === categoryKey)) {
    throw new AppError(409, "E_CONFLICT", "Category key already exists");
  }

  const colors = ["#6FCF97", "#FFB38A", "#56CCF2", "#A78BFA", "#4ADE80", "#FF6B9D"];
  const randomColor = payload.color || colors[Math.floor(Math.random() * colors.length)];

  const maxSort = existing.reduce((max, c) => Math.max(max, c.sort_order || 0), 0);

  const created = await incomeCategoriesDao.createCategory({
    userId: payload.userId,
    periodType: payload.periodType,
    categoryKey,
    label: payload.label.trim(),
    icon: payload.icon,
    hint: payload.hint,
    color: randomColor,
    bgColor: payload.bgColor || `${randomColor}1A`,
    colorLight: payload.colorLight || `${randomColor}4D`,
    quickAmounts: payload.quickAmounts,
    defaultAmount: payload.defaultAmount,
    allowNegative: payload.allowNegative || false,
    sortOrder: maxSort + 1
  });

  return parseQuickAmounts(created);
}

async function update(id, userId, payload) {
  if (!id) throw new AppError(400, "E_BAD_REQUEST", "Missing id");
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const category = await incomeCategoriesDao.findById(id);
  if (!category) throw new AppError(404, "E_NOT_FOUND", "Category not found");

  if (category.user_id === null) {
    throw new AppError(403, "E_FORBIDDEN", "Cannot edit system category");
  }

  if (category.user_id !== userId) {
    throw new AppError(403, "E_FORBIDDEN", "Cannot edit other user's category");
  }

  const updated = await incomeCategoriesDao.updateCategory(id, userId, payload);
  if (!updated) throw new AppError(404, "E_NOT_FOUND", "Category not found");
  return parseQuickAmounts(updated);
}

async function remove(id, userId) {
  if (!id) throw new AppError(400, "E_BAD_REQUEST", "Missing id");
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const category = await incomeCategoriesDao.findById(id);
  if (!category) throw new AppError(404, "E_NOT_FOUND", "Category not found");

  if (category.user_id === null) {
    throw new AppError(403, "E_FORBIDDEN", "Cannot delete system category");
  }

  if (category.user_id !== userId) {
    throw new AppError(403, "E_FORBIDDEN", "Cannot delete other user's category");
  }

  const ok = await incomeCategoriesDao.deleteCategory(id, userId);
  if (!ok) throw new AppError(404, "E_NOT_FOUND", "Category not found");
  return true;
}

module.exports = { list, create, update, remove };
