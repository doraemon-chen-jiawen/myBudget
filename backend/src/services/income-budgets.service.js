const AppError = require("../utils/app-error");
const incomeBudgetsDao = require("../dao/income-budgets.dao");
const incomeCategoriesDao = require("../dao/income-categories.dao");

function validatePeriodType(periodType) {
  const allowed = ["monthly", "yearly"];
  if (!allowed.includes(periodType)) throw new AppError(400, "E_BAD_REQUEST", "Invalid periodType");
}

function normalizeDaoPayload(userId, payload) {
  const {
    familyGroupId,
    periodType,
    periodKey,
    plannedAmount,
    note
  } = payload;

  validatePeriodType(periodType);

  let finalPeriodKey = periodKey;
  let finalBudgetMonth = null;
  let finalBudgetYear = null;

  if (periodType === "monthly") {
    finalBudgetMonth = payload.budgetMonth || new Date().toISOString().substring(0, 7);
    finalPeriodKey = finalPeriodKey || finalBudgetMonth;
  }

  if (periodType === "yearly") {
    finalBudgetYear = payload.budgetYear || String(new Date().getFullYear());
    finalPeriodKey = finalPeriodKey || finalBudgetYear;
  }

  if (plannedAmount === undefined || plannedAmount === null) {
    throw new AppError(400, "E_BAD_REQUEST", "plannedAmount is required");
  }

  return {
    userId,
    familyGroupId: familyGroupId ?? null,
    periodType,
    periodKey: finalPeriodKey,
    budgetMonth: periodType === "monthly" ? finalBudgetMonth : null,
    budgetYear: periodType === "yearly" ? finalBudgetYear : null,
    plannedAmount: Number(plannedAmount),
    note: note ?? null
  };
}

async function list({ userId, periodType, periodKey }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const filters = {
    userId,
    periodType: periodType ?? null,
    periodKey: periodKey ?? null
  };
  return incomeBudgetsDao.listBudgets(filters);
}

async function create(payload) {
  if (!payload?.userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  const daoPayload = normalizeDaoPayload(payload.userId, payload);
  return incomeBudgetsDao.createBudget(daoPayload);
}

async function update(id, userId, payload) {
  if (!id) throw new AppError(400, "E_BAD_REQUEST", "Missing id");
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  const daoPayload = normalizeDaoPayload(userId, { ...payload, userId });
  return incomeBudgetsDao.updateBudget(id, userId, daoPayload);
}

async function remove(id, userId) {
  const ok = await incomeBudgetsDao.deleteBudget(id, userId);
  if (!ok) throw new AppError(404, "E_NOT_FOUND", "Budget not found");
  return true;
}

async function initializeDefaults(userId, periodType) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  if (!periodType) throw new AppError(400, "E_BAD_REQUEST", "Missing periodType");
  validatePeriodType(periodType);

  const existing = await incomeBudgetsDao.listBudgets({ userId, periodType });
  if (existing.length > 0) return [];

  const categories = await incomeCategoriesDao.listCategories({ userId: null, periodType });
  if (categories.length === 0) return [];

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const yearKey = `${now.getFullYear()}`;

  const created = [];
  for (const cat of categories) {
    if (cat.default_amount == null || Number(cat.default_amount) <= 0) continue;

    const periodKey = `${periodType}_${cat.category_key}`;
    const payload = {
      userId,
      familyGroupId: null,
      periodType,
      periodKey,
      plannedAmount: Number(cat.default_amount),
      budgetMonth: periodType === "monthly" ? monthKey : null,
      budgetYear: periodType === "yearly" ? yearKey : null,
      note: null
    };

    try {
      const budget = await incomeBudgetsDao.createBudget(payload);
      created.push(budget);
    } catch (err) {
      if (err.code !== "ER_DUP_ENTRY") throw err;
    }
  }

  return created;
}

module.exports = { list, create, update, remove, initializeDefaults };
