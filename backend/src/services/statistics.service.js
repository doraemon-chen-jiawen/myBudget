const AppError = require("../utils/app-error");
const statisticsDao = require("../dao/statistics.dao");
const budgetsDao = require("../dao/budgets.dao");
const budgetCategoriesDao = require("../dao/budget-categories.dao");
const familyGroupsDao = require("../dao/family-groups.dao");
const userDao = require("../dao/users.dao");

function formatDate(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDateRange(dimension, baseDate, registeredDate = null) {
  const d = new Date(baseDate);

  if (dimension === "day") {
    const day = formatDate(d);
    return { start: day, end: day, label: day };
  }

  if (dimension === "week") {
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: formatDate(monday),
      end: formatDate(sunday),
      label: `${formatDate(monday)} ~ ${formatDate(sunday)}`
    };
  }

  if (dimension === "month" && registeredDate) {
    const regDate = new Date(registeredDate);
    const regDay = regDate.getDate();
    const currentDay = d.getDate();

    let start, end;

    if (currentDay < regDay) {
      start = new Date(d.getFullYear(), d.getMonth() - 1, regDay);
      end = new Date(d.getFullYear(), d.getMonth(), regDay - 1);
    } else {
      start = new Date(d.getFullYear(), d.getMonth(), regDay);
      if (d.getMonth() === 11) {
        end = new Date(d.getFullYear() + 1, 0, regDay - 1);
      } else {
        end = new Date(d.getFullYear(), d.getMonth() + 1, regDay - 1);
      }
    }

    return {
      start: formatDate(start),
      end: formatDate(end),
      label: `${formatDate(start)} ~ ${formatDate(end)}`
    };
  }

  if (dimension === "year") {
    // 年度统计固定从1月1日到12月31日（自然年）
    const start = new Date(d.getFullYear(), 0, 1);
    const end = new Date(d.getFullYear(), 11, 31);
    return {
      start: formatDate(start),
      end: formatDate(end),
      label: `${d.getFullYear()}年`
    };
  }

  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    start: formatDate(start),
    end: formatDate(end),
    label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  };
}

async function resolveUserIds({ userId, familyGroupId, memberUserId }) {
  if (familyGroupId && memberUserId) {
    return [Number(memberUserId)];
  }

  if (familyGroupId) {
    const members = await familyGroupsDao.listMembers(familyGroupId);
    return members.map(m => m.user_id);
  }

  return [Number(userId)];
}

async function getOverview({ userId, dimension, date, familyGroupId, memberUserId }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const validDimensions = ["day", "week", "month", "year"];
  if (!validDimensions.includes(dimension)) {
    dimension = "month";
  }

  const baseDate = date || formatDate();
  const user = await userDao.findById(userId);
  const registeredDate = user?.created_at || null;
  const range = getDateRange(dimension, baseDate, registeredDate);
  const userIds = await resolveUserIds({ userId, familyGroupId, memberUserId });

  const [actualRows, incomeRows, dailyBudgets, monthlyBudgets, yearlyBudgets, categories] = await Promise.all([
    statisticsDao.getActualByCategory({ userIds, dateFrom: range.start, dateTo: range.end }),
    statisticsDao.getIncomeByCategory({ userIds, dateFrom: range.start, dateTo: range.end }),
    budgetsDao.listBudgets({ userIds, periodType: "daily" }),
    budgetsDao.listBudgets({ userIds, periodType: "monthly" }),
    budgetsDao.listBudgets({ userIds, periodType: "yearly" }),
    budgetCategoriesDao.listCategories({ userId, periodType: null })
  ]);

  // Build actual map: category_label => total
  const actualMap = {};
  for (const row of actualRows) {
    const key = row.category_snapshot || "未分类";
    actualMap[key] = Number(row.actual_total || 0);
  }

  // Build income map: category_label => total
  const incomeMap = {};
  let incomeTotal = 0;
  for (const row of incomeRows) {
    const key = row.category_snapshot || "未分类";
    const amount = Number(row.income_total || 0);
    incomeMap[key] = amount;
    incomeTotal += amount;
  }

  // Build budget map from category_key -> label
  const categoryMap = {};
  for (const cat of categories) {
    categoryMap[cat.category_key] = cat;
  }

  // Calculate budget per category
  const budgetMap = {};

  function getBudgetMultipliers(dimension, range, registeredDate) {
    if (dimension === "day") {
      return { days: 1, months: 0, years: 0 };
    }

    if (dimension === "week") {
      return { days: 7, months: 0, years: 0 };
    }

    if (dimension === "month") {
      const start = new Date(range.start);
      const end = new Date(range.end);
      const days = Math.round((end - start) / 86400000) + 1;
      return { days, months: 1, years: 0 };
    }

    if (dimension === "year") {
      const start = new Date(range.start);
      const end = new Date(range.end);
      const days = Math.round((end - start) / 86400000) + 1;
      return { days, months: 12, years: 1 };
    }

    return { days: 1, months: 0, years: 0 };
  }

  const { days, months, years } = getBudgetMultipliers(dimension, range, registeredDate);

  for (const b of dailyBudgets) {
    const catKey = (b.period_key || "").replace(/^daily_/, "");
    const cat = categoryMap[catKey];
    if (cat && days > 0) {
      budgetMap[cat.label] = (budgetMap[cat.label] || 0) + Number(b.planned_amount || 0) * days;
    }
  }

  for (const b of monthlyBudgets) {
    const catKey = (b.period_key || "").replace(/^monthly_/, "");
    const cat = categoryMap[catKey];
    if (cat && months > 0) {
      budgetMap[cat.label] = (budgetMap[cat.label] || 0) + Number(b.planned_amount || 0) * months;
    }
  }

  for (const b of yearlyBudgets) {
    const catKey = (b.period_key || "").replace(/^yearly_/, "");
    const cat = categoryMap[catKey];
    if (cat && years > 0) {
      budgetMap[cat.label] = (budgetMap[cat.label] || 0) + Number(b.planned_amount || 0) * years;
    }
  }

  // Merge into categories list
  const allLabels = new Set([...Object.keys(budgetMap), ...Object.keys(actualMap)]);
  const categoryResults = [];
  let budgetTotal = 0;
  let actualTotal = 0;

  for (const label of allLabels) {
    const budgeted = budgetMap[label] || 0;
    const actual = actualMap[label] || 0;
    const percent = budgeted > 0 ? Math.round((actual / budgeted) * 1000) / 10 : (actual > 0 ? 100 : 0);

    // Find matching category for color info
    const matchedCat = categories.find(c => c.label === label);

    budgetTotal += budgeted;
    actualTotal += actual;

    categoryResults.push({
      categoryKey: matchedCat?.category_key || label,
      categoryLabel: label,
      icon: matchedCat?.icon || "💰",
      color: matchedCat?.color || "#6FCF97",
      bgColor: matchedCat?.bg_color || "rgba(111,207,151,0.1)",
      budgeted: Math.round(budgeted * 100) / 100,
      actual: Math.round(actual * 100) / 100,
      percent
    });
  }

  // Sort: by actual descending
  categoryResults.sort((a, b) => b.actual - a.actual);

  return {
    period: range,
    summary: {
      budgetTotal: Math.round(budgetTotal * 100) / 100,
      actualTotal: Math.round(actualTotal * 100) / 100,
      incomeTotal: Math.round(incomeTotal * 100) / 100,
      remainTotal: Math.round((budgetTotal - actualTotal) * 100) / 100,
      balanceTotal: Math.round((incomeTotal - actualTotal) * 100) / 100
    },
    categories: categoryResults
  };
}

async function getMonthlyCalendar({ userId, year, month, familyGroupId, memberUserId }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const userIds = await resolveUserIds({ userId, familyGroupId, memberUserId });

  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const dateTo = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;

  const [dailyExpenses, dailyBudgets] = await Promise.all([
    statisticsDao.getDailyExpenses({ userIds, dateFrom, dateTo }),
    budgetsDao.listBudgets({ userIds, periodType: 'daily' })
  ]);

  const totalDailyBudget = dailyBudgets.reduce((sum, b) =>
    sum + Number(b.planned_amount || 0), 0
  );

  const dailyMap = {};
  dailyExpenses.forEach(d => {
    dailyMap[d.record_date] = Number(d.amount);
  });

  function getStatus(amount, budget) {
    if (budget <= 0) return 'normal';
    const ratio = amount / budget;
    if (ratio > 1) return 'over';
    if (ratio >= 0.8) return 'warning';
    return 'normal';
  }

  const dailyData = [];
  let overDays = 0;
  let warningDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const amount = dailyMap[date] || 0;
    const status = getStatus(amount, totalDailyBudget);

    if (status === 'over') overDays++;
    if (status === 'warning') warningDays++;

    dailyData.push({
      date,
      amount: Math.round(amount * 100) / 100,
      budget: Math.round(totalDailyBudget * 100) / 100,
      status
    });
  }

  const totalExpense = dailyData.reduce((sum, d) => sum + d.amount, 0);
  const totalBudget = totalDailyBudget * daysInMonth;

  return {
    year,
    month,
    dailyData,
    dailyBudget: Math.round(totalDailyBudget * 100) / 100,
    summary: {
      totalExpense: Math.round(totalExpense * 100) / 100,
      totalBudget: Math.round(totalBudget * 100) / 100,
      overDays,
      warningDays
    }
  };
}

async function getYearlyBarChart({ userId, year, familyGroupId, memberUserId }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const userIds = await resolveUserIds({ userId, familyGroupId, memberUserId });

  const [monthlyExpenses, monthlyBudgets] = await Promise.all([
    statisticsDao.getMonthlyExpenses({ userIds, year }),
    budgetsDao.listBudgets({ userIds, periodType: 'monthly' })
  ]);

  const totalMonthlyBudget = monthlyBudgets.reduce((sum, b) =>
    sum + Number(b.planned_amount || 0), 0
  );

  const monthlyMap = {};
  monthlyExpenses.forEach(m => {
    monthlyMap[m.month] = Number(m.amount);
  });

  function getStatus(amount, budget) {
    if (budget <= 0) return 'normal';
    const ratio = amount / budget;
    if (ratio > 1) return 'over';
    if (ratio >= 0.8) return 'warning';
    return 'normal';
  }

  const monthlyData = [];
  let overMonths = 0;

  for (let month = 1; month <= 12; month++) {
    const amount = monthlyMap[month] || 0;
    const budget = totalMonthlyBudget;
    const status = getStatus(amount, budget);

    if (status === 'over') overMonths++;

    monthlyData.push({
      month,
      amount: Math.round(amount * 100) / 100,
      budget: Math.round(budget * 100) / 100,
      status
    });
  }

  const maxAmount = Math.max(...monthlyData.map(d => d.amount), 0);
  const totalExpense = monthlyData.reduce((sum, d) => sum + d.amount, 0);
  const totalBudget = monthlyData.reduce((sum, d) => sum + d.budget, 0);

  return {
    year,
    monthlyData,
    maxAmount: Math.round(maxAmount * 100) / 100,
    summary: {
      totalExpense: Math.round(totalExpense * 100) / 100,
      totalBudget: Math.round(totalBudget * 100) / 100,
      overMonths
    }
  };
}

async function getDayDetail({ userId, date, familyGroupId, memberUserId }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const userIds = await resolveUserIds({ userId, familyGroupId, memberUserId });

  const actualRows = await statisticsDao.getActualByCategory({
    userIds,
    dateFrom: date,
    dateTo: date
  });

  const totalExpense = actualRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const categories = actualRows.map(r => ({
    categoryLabel: r.category_snapshot || "未分类",
    amount: Math.round(Number(r.amount || 0) * 100) / 100,
    percent: totalExpense > 0 ? Math.round((Number(r.amount || 0) / totalExpense) * 1000) / 10 : 0
  }));

  categories.sort((a, b) => b.amount - a.amount);

  return {
    date,
    totalExpense: Math.round(totalExpense * 100) / 100,
    categories
  };
}

module.exports = {
  getOverview,
  getMonthlyCalendar,
  getYearlyBarChart,
  getDayDetail
};
