const AppError = require("../utils/app-error");
const recordsService = require("./records.service");
const budgetCategoriesDao = require("../dao/budget-categories.dao");
const budgetsDao = require("../dao/budgets.dao");

function formatDate(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function getBackfillSetup({ userId }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [dailyBudgets, categories] = await Promise.all([
    budgetsDao.listBudgets({ userIds: [userId], periodType: "daily", budgetDate: today }),
    budgetCategoriesDao.listCategories({ userId, periodType: null })
  ]);

  const totalDailyBudget = dailyBudgets.reduce((sum, b) =>
    sum + Number(b.planned_amount || 0), 0
  );

  const categoryBudgetMap = {};
  dailyBudgets.forEach(b => {
    const key = b.period_key?.replace(/^daily_/, '') || b.period_key;
    categoryBudgetMap[key] = Number(b.planned_amount || 0);
  });

  return {
    dailyBudget: Math.round(totalDailyBudget * 100) / 100,
    categories: categories.map(c => ({
      categoryKey: c.category_key,
      label: c.label,
      icon: c.icon || "✨",
      defaultAmount: c.default_amount || null,
      budgetAmount: categoryBudgetMap[c.category_key] || 0
    }))
  };
}

async function createBackfillRecords({ userId, startDate, endDate, amountMode, customAmount, categoryKey, note, familyGroupId }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  if (!startDate) throw new AppError(400, "E_BAD_REQUEST", "Missing startDate");

  const dates = [];
  if (endDate) {
    const current = new Date(startDate);
    const end = new Date(endDate);
    if (current > end) {
      throw new AppError(400, "E_BAD_REQUEST", "Start date cannot be after end date");
    }
    while (current <= end) {
      dates.push(formatDate(current));
      current.setDate(current.getDate() + 1);
    }
  } else {
    dates.push(startDate);
  }

  let recordsToCreate = [];

  if (amountMode === "budget") {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const dailyBudgets = await budgetsDao.listBudgets({
      userIds: [userId],
      periodType: "daily",
      budgetDate: today
    });

    const categories = await budgetCategoriesDao.listCategories({
      userId,
      periodType: null
    });

    const categoryMap = {};
    categories.forEach(c => {
      categoryMap[c.category_key] = c;
    });

    for (const budget of dailyBudgets) {
      const categoryKeyInBudget = budget.period_key?.replace(/^daily_/, '') || budget.period_key;
      const category = categoryMap[categoryKeyInBudget];
      if (!category || !budget.planned_amount) continue;

      recordsToCreate.push({
        categoryKey: categoryKeyInBudget,
        categoryLabel: category.label,
        amount: Number(budget.planned_amount)
      });
    }

    if (recordsToCreate.length === 0) {
      throw new AppError(400, "E_BAD_REQUEST", "No daily budgets found");
    }
  } else {
    if (!categoryKey) throw new AppError(400, "E_BAD_REQUEST", "Missing categoryKey");

    const categories = await budgetCategoriesDao.listCategories({
      userId,
      periodType: null
    });

    const category = categories.find(c => c.category_key === categoryKey);
    if (!category) {
      throw new AppError(400, "E_BAD_REQUEST", "Invalid category");
    }

    const dailyAmount = Number(customAmount) || 0;
    if (!dailyAmount || dailyAmount <= 0) {
      throw new AppError(400, "E_BAD_REQUEST", "Invalid amount");
    }

    recordsToCreate.push({
      categoryKey,
      categoryLabel: category.label,
      amount: dailyAmount
    });
  }

  const createdRecords = [];
  for (const date of dates) {
    for (const recordInfo of recordsToCreate) {
      const record = await recordsService.create({
        userId,
        familyGroupId,
        recordType: "expense",
        amount: recordInfo.amount,
        recordDate: date,
        categorySnapshot: recordInfo.categoryLabel,
        note: note || `补记${date}`,
        source: "backfill",
        sourceReference: `backfill:${recordInfo.categoryKey}:${Date.now()}_${date}`
      });
      createdRecords.push(record);
    }
  }

  return {
    success: true,
    createdCount: createdRecords.length,
    records: createdRecords
  };
}

module.exports = {
  getBackfillSetup,
  createBackfillRecords
};
