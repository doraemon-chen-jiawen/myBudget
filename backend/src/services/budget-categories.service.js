const AppError = require("../utils/app-error");
const categoriesDao = require("../dao/budget-categories.dao");
const hiddenCategoriesDao = require("../dao/user-hidden-categories.dao");

const ALLOWED_PERIOD_TYPES = ["daily", "monthly", "finance_interest"];

function parseQuickAmounts(row) {
  if (row.quick_amounts && typeof row.quick_amounts === "string") {
    row.quick_amounts = JSON.parse(row.quick_amounts);
  }
  return row;
}

async function list({ userId, periodType }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  const rows = await categoriesDao.listCategories({
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

  const existing = await categoriesDao.listCategories({
    userId: payload.userId,
    periodType: payload.periodType
  });
  if (existing.some(c => c.category_key === categoryKey)) {
    throw new AppError(409, "E_CONFLICT", "Category key already exists");
  }

  const colors = ["#6FCF97", "#FFB38A", "#56CCF2", "#A78BFA", "#4ADE80", "#FF6B9D"];
  const randomColor = payload.color || colors[Math.floor(Math.random() * colors.length)];

  const maxSort = existing.reduce((max, c) => Math.max(max, c.sort_order || 0), 0);

  const created = await categoriesDao.createCategory({
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
    sortOrder: maxSort + 1
  });

  return parseQuickAmounts(created);
}

async function update(id, userId, payload) {
  if (!id) throw new AppError(400, "E_BAD_REQUEST", "Missing id");
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const category = await categoriesDao.findById(id);
  if (!category) throw new AppError(404, "E_NOT_FOUND", "Category not found");

  // 内置分类（user_id 为 NULL）：为用户创建副本
  if (category.user_id === null) {
    return create({
      userId,
      periodType: category.period_type,
      categoryKey: `${category.category_key}_user_${userId}_${Date.now()}`,
      label: payload.label || category.label,
      icon: payload.icon || category.icon,
      hint: payload.hint || category.hint,
      color: payload.color || category.color,
      bgColor: payload.bgColor || category.bg_color,
      colorLight: payload.colorLight || category.color_light,
      quickAmounts: payload.quickAmounts || category.quick_amounts,
      defaultAmount: payload.defaultAmount !== undefined ? payload.defaultAmount : category.default_amount,
      sortOrder: payload.sortOrder !== undefined ? payload.sortOrder : category.sort_order
    });
  }

  // 用户自定义分类：检查权限后更新
  if (category.user_id !== userId) {
    throw new AppError(403, "E_FORBIDDEN", "Cannot edit other user's category");
  }

  const updated = await categoriesDao.updateCategory(id, userId, payload);
  if (!updated) throw new AppError(404, "E_NOT_FOUND", "Category not found");
  return parseQuickAmounts(updated);
}

async function remove(id, userId) {
  if (!id) throw new AppError(400, "E_BAD_REQUEST", "Missing id");
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const category = await categoriesDao.findById(id);
  if (!category) throw new AppError(404, "E_NOT_FOUND", "Category not found");

  // 内置分类（user_id 为 NULL）：标记为隐藏，不删除
  if (category.user_id === null) {
    await hiddenCategoriesDao.hideCategory(userId, id);
    return true;
  }

  // 用户自定义分类：检查权限后删除
  if (category.user_id !== userId) {
    throw new AppError(403, "E_FORBIDDEN", "Cannot delete other user's category");
  }

  const ok = await categoriesDao.deleteCategory(id, userId);
  if (!ok) throw new AppError(404, "E_NOT_FOUND", "Category not found");
  return true;
}

module.exports = { list, create, update, remove };
