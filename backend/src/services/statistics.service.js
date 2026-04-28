const AppError = require("../utils/app-error");
const statisticsDao = require("../dao/statistics.dao");
const budgetsDao = require("../dao/budgets.dao");
const budgetCategoriesDao = require("../dao/budget-categories.dao");
const familyGroupsDao = require("../dao/family-groups.dao");

function formatDate(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDateRange(dimension, baseDate) {
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

  // year
  if (dimension === "year") {
    const start = new Date(d.getFullYear(), 0, 1);
    const end = new Date(d.getFullYear(), 11, 31);
    return {
      start: formatDate(start),
      end: formatDate(end),
      label: `${d.getFullYear()}年`
    };
  }

  // month
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
  const range = getDateRange(dimension, baseDate);
  const userIds = await resolveUserIds({ userId, familyGroupId, memberUserId });

  const [actualRows, dailyBudgets, monthlyBudgets, yearlyBudgets, categories] = await Promise.all([
    statisticsDao.getActualByCategory({ userIds, dateFrom: range.start, dateTo: range.end }),
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

  // Build budget map from category_key -> label
  const categoryMap = {};
  for (const cat of categories) {
    categoryMap[cat.category_key] = cat;
  }

  // Calculate budget per category
  const budgetMap = {};
  const daysInRange = dimension === "day" ? 1 :
    Math.round((new Date(range.end) - new Date(range.start)) / 86400000) + 1;

  const monthsInRange = dimension === "year" ? 12 :
    (dimension === "month" || dimension === "week") ? 1 : 0;

  for (const b of dailyBudgets) {
    const catKey = (b.period_key || "").replace(/^daily_/, "");
    const cat = categoryMap[catKey];
    if (cat) {
      budgetMap[cat.label] = (budgetMap[cat.label] || 0) + Number(b.planned_amount || 0) * daysInRange;
    }
  }

  for (const b of monthlyBudgets) {
    const catKey = (b.period_key || "").replace(/^monthly_/, "");
    const cat = categoryMap[catKey];
    if (cat && monthsInRange > 0) {
      budgetMap[cat.label] = (budgetMap[cat.label] || 0) + Number(b.planned_amount || 0) * monthsInRange;
    }
  }

  for (const b of yearlyBudgets) {
    const catKey = (b.period_key || "").replace(/^yearly_/, "");
    const cat = categoryMap[catKey];
    if (cat && dimension === "year") {
      budgetMap[cat.label] = (budgetMap[cat.label] || 0) + Number(b.planned_amount || 0);
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
      remainTotal: Math.round((budgetTotal - actualTotal) * 100) / 100
    },
    categories: categoryResults
  };
}

module.exports = { getOverview };
