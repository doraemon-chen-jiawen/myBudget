const AppError = require("../utils/app-error");
const recordsDao = require("../dao/records.dao");
const budgetsDao = require("../dao/budgets.dao");
const recordsService = require("./records.service");

const QUICK_ITEMS = [
  { key: "breakfast", label: "早餐", amount: 12 },
  { key: "lunch", label: "午餐", amount: 25 },
  { key: "dinner", label: "晚餐", amount: 30 },
  { key: "transport", label: "交通", amount: 8 }
];

function formatDate(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function resolveToday(date) {
  if (!date) return formatDate();
  return date;
}

function buildQuickCountMap(records) {
  const countMap = {};
  for (const record of records || []) {
    const source = record.source || "";
    const category = record.category_snapshot || "";
    const sourceReference = record.source_reference || "";

    if (source === "quick_tap" && category) {
      const matchedByCategory = QUICK_ITEMS.find((item) => item.label === category);
      if (matchedByCategory) {
        countMap[matchedByCategory.key] = (countMap[matchedByCategory.key] || 0) + 1;
        continue;
      }
    }

    for (const item of QUICK_ITEMS) {
      if (sourceReference.startsWith(`quick:${item.key}:`)) {
        countMap[item.key] = (countMap[item.key] || 0) + 1;
      }
    }
  }
  return countMap;
}

async function getHomeIndex({ userId, date }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const today = resolveToday(date);
  const [records, budgets] = await Promise.all([
    recordsDao.listRecords({
      userId,
      familyGroupId: null,
      recordType: null,
      recordMonth: null,
      dateFrom: today,
      dateTo: today
    }),
    budgetsDao.listBudgets({
      userId,
      familyGroupId: null,
      periodType: "daily",
      periodKey: today
    })
  ]);

  const budgetTotal = (budgets || []).reduce((sum, item) => sum + Number(item.planned_amount || 0), 0);
  const actualTotal = (records || [])
    .filter((item) => item.record_type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const remainTotal = budgetTotal - actualTotal;
  const quickCountMap = buildQuickCountMap(records || []);

  return {
    today,
    budgetTotal,
    actualTotal,
    remainTotal,
    quickItems: QUICK_ITEMS.map((item) => ({
      ...item,
      count: quickCountMap[item.key] || 0
    }))
  };
}

async function createQuickRecord({ userId, key, date }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  if (!key) throw new AppError(400, "E_BAD_REQUEST", "Missing quick key");

  const item = QUICK_ITEMS.find((quickItem) => quickItem.key === key);
  if (!item) throw new AppError(400, "E_BAD_REQUEST", "Invalid quick key");

  const today = resolveToday(date);
  await recordsService.create({
    userId,
    recordType: "expense",
    amount: item.amount,
    recordDate: today,
    categorySnapshot: item.label,
    note: "快捷记账",
    source: "quick_tap",
    sourceReference: `quick:${item.key}:${Date.now()}`
  });

  return getHomeIndex({ userId, date: today });
}

module.exports = {
  getHomeIndex,
  createQuickRecord
};
