const AppError = require("../utils/app-error");
const { requireNumber } = require("../utils/validators");
const budgetsDao = require("../dao/budgets.dao");
const categoriesDao = require("../dao/budget-categories.dao");

function validatePeriodType(periodType) {
  const allowed = ["daily", "monthly", "finance_interest"];
  if (!allowed.includes(periodType)) throw new AppError(400, "E_BAD_REQUEST", "Invalid periodType");
}

function normalizeDaoPayload(userId, payload) {
  const {
    familyGroupId,
    periodType,
    periodKey,
    budgetDate,
    budgetMonth,
    accountId,
    plannedAmount,
    plannedAnnualRate,
    plannedPrincipalAmount,
    note
  } = payload;

  validatePeriodType(periodType);

  let finalPeriodKey = periodKey;
  let finalBudgetDate = budgetDate ?? null;
  let finalBudgetMonth = budgetMonth ?? null;

  // Validate and derive period_key
  if (periodType === "daily") {
    if (!finalBudgetDate) throw new AppError(400, "E_BAD_REQUEST", "daily requires budgetDate");
    finalPeriodKey = finalPeriodKey || finalBudgetDate;
    if (plannedAmount === undefined || plannedAmount === null) {
      throw new AppError(400, "E_BAD_REQUEST", "daily requires plannedAmount");
    }
    const nPlannedAmount = Number(plannedAmount);
    requireNumber({ plannedAmount: nPlannedAmount }, "plannedAmount");
  }

  if (periodType === "monthly") {
    if (!finalBudgetMonth) throw new AppError(400, "E_BAD_REQUEST", "monthly requires budgetMonth");
    finalPeriodKey = finalPeriodKey || finalBudgetMonth;
    if (plannedAmount === undefined || plannedAmount === null) {
      throw new AppError(400, "E_BAD_REQUEST", "monthly requires plannedAmount");
    }
    const nPlannedAmount = Number(plannedAmount);
    requireNumber({ plannedAmount: nPlannedAmount }, "plannedAmount");
  }

  if (periodType === "finance_interest") {
    if (!finalBudgetMonth) throw new AppError(400, "E_BAD_REQUEST", "finance_interest requires budgetMonth");
    finalPeriodKey = finalPeriodKey || finalBudgetMonth;
    if (!accountId) throw new AppError(400, "E_BAD_REQUEST", "finance_interest requires accountId");
    if (plannedAnnualRate === undefined || plannedAnnualRate === null) {
      throw new AppError(400, "E_BAD_REQUEST", "finance_interest requires plannedAnnualRate");
    }
    if (plannedPrincipalAmount === undefined || plannedPrincipalAmount === null) {
      throw new AppError(400, "E_BAD_REQUEST", "finance_interest requires plannedPrincipalAmount");
    }
    const nPlannedAnnualRate = Number(plannedAnnualRate);
    const nPlannedPrincipalAmount = Number(plannedPrincipalAmount);
    requireNumber({ plannedAnnualRate: nPlannedAnnualRate }, "plannedAnnualRate");
    requireNumber({ plannedPrincipalAmount: nPlannedPrincipalAmount }, "plannedPrincipalAmount");
    payload.plannedAnnualRate = nPlannedAnnualRate;
    payload.plannedPrincipalAmount = nPlannedPrincipalAmount;
    payload.plannedAmount = plannedAmount === undefined ? plannedAmount : Number(plannedAmount);
  }

  return {
    userId,
    familyGroupId: familyGroupId ?? null,
    periodType,
    periodKey: finalPeriodKey,
    budgetDate: periodType === "daily" ? finalBudgetDate : null,
    budgetMonth: periodType === "daily" ? null : finalBudgetMonth,
    accountId: periodType === "finance_interest" ? accountId : null,
    plannedAmount: periodType === "finance_interest" ? null : Number(plannedAmount),
    plannedAnnualRate: periodType === "finance_interest" ? plannedAnnualRate : null,
    plannedPrincipalAmount: periodType === "finance_interest" ? plannedPrincipalAmount : null,
    note: note ?? null
  };
}

/**
 * Budget service:
 * - daily/monthly -> planned_amount
 * - finance_interest -> planned_annual_rate + planned_principal_amount
 */
async function list({ userId, familyGroupId, periodType, periodKey }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const filters = {
    userId,
    familyGroupId: familyGroupId ?? null,
    periodType: periodType ?? null,
    periodKey: periodKey ?? null
  };
  return budgetsDao.listBudgets(filters);
}

async function create(payload) {
  if (!payload?.userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  const daoPayload = normalizeDaoPayload(payload.userId, payload);
  return budgetsDao.createBudget(daoPayload);
}

async function update(id, userId, payload) {
  if (!id) throw new AppError(400, "E_BAD_REQUEST", "Missing id");
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  const daoPayload = normalizeDaoPayload(userId, { ...payload, userId });
  return budgetsDao.updateBudget(id, userId, daoPayload);
}

async function remove(id, userId) {
  const ok = await budgetsDao.deleteBudget(id, userId);
  if (!ok) throw new AppError(404, "E_NOT_FOUND", "Budget not found");
  return true;
}

async function ensureDefaultBudgets(userId, periodType) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  if (!periodType) throw new AppError(400, "E_BAD_REQUEST", "Missing periodType");
  validatePeriodType(periodType);

  // Skip finance_interest — requires account association
  if (periodType === "finance_interest") return [];

  // Check if user already has budgets for this periodType
  const existing = await budgetsDao.listBudgets({ userId, periodType });
  if (existing.length > 0) return [];

  // Fetch system default categories
  const categories = await categoriesDao.listCategories({ userId: null, periodType });
  if (categories.length === 0) return [];

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

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
      budgetDate: periodType === "daily" ? today : null,
      budgetMonth: periodType !== "daily" ? monthKey : null,
      accountId: null,
      plannedAnnualRate: null,
      plannedPrincipalAmount: null,
      note: null
    };

    try {
      const budget = await budgetsDao.createBudget(payload);
      created.push(budget);
    } catch (err) {
      // ER_DUP_ENTRY — concurrent request already created it
      if (err.code !== "ER_DUP_ENTRY") throw err;
    }
  }

  return created;
}

module.exports = {
  list,
  create,
  update,
  remove,
  ensureDefaultBudgets
};

