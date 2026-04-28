const AppError = require("../utils/app-error");
const https = require("https");

const recordsDao = require("../dao/records.dao");
const budgetsDao = require("../dao/budgets.dao");
const recordsService = require("./records.service");

async function getUserStats(userId) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  const stats = await recordsDao.getUserStats(userId);
  return {
    days: stats.total_days,
    count: stats.total_count
  };
}

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
  const monthKey = today.substring(0, 7); // YYYY-MM

  const [records, monthRecords, dailyBudgets, monthlyBudgets] = await Promise.all([
    recordsDao.listRecords({
      userId,
      familyGroupId: null,
      recordType: null,
      recordMonth: null,
      dateFrom: today,
      dateTo: today
    }),
    recordsDao.listRecords({
      userId,
      familyGroupId: null,
      recordType: "expense",
      recordMonth: monthKey,
      dateFrom: null,
      dateTo: null
    }),
    budgetsDao.listBudgets({
      userId,
      familyGroupId: null,
      periodType: "daily"
    }),
    budgetsDao.listBudgets({
      userId,
      familyGroupId: null,
      periodType: "monthly"
    })
  ]);

  const dailyBudgetSum = (dailyBudgets || []).reduce((sum, item) => sum + Number(item.planned_amount || 0), 0);
  const actualTotal = (records || [])
    .filter((item) => item.record_type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const remainTotal = dailyBudgetSum - actualTotal;
  const quickCountMap = buildQuickCountMap(records || []);

  // 月度合计：每日预算 × 当月天数 + 月度预算
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthlyBudgetSum = (monthlyBudgets || []).reduce((sum, item) => sum + Number(item.planned_amount || 0), 0);
  const monthBudgetTotal = dailyBudgetSum * daysInMonth + monthlyBudgetSum;
  const monthActualTotal = (monthRecords || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthRemainTotal = monthBudgetTotal - monthActualTotal;

  return {
    today,
    budgetTotal: dailyBudgetSum,
    actualTotal,
    remainTotal,
    monthBudgetTotal,
    monthActualTotal,
    monthRemainTotal,
    quickItems: QUICK_ITEMS.map((item) => ({
      ...item,
      count: quickCountMap[item.key] || 0
    }))
  };
}

async function createQuickRecord({ userId, key, date, amount }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  if (!key) throw new AppError(400, "E_BAD_REQUEST", "Missing quick key");

  const item = QUICK_ITEMS.find((quickItem) => quickItem.key === key);
  if (!item) throw new AppError(400, "E_BAD_REQUEST", "Invalid quick key");

  const recordAmount = amount != null && !isNaN(Number(amount)) ? Number(amount) : item.amount;
  const today = resolveToday(date);
  await recordsService.create({
    userId,
    recordType: "expense",
    amount: recordAmount,
    recordDate: today,
    categorySnapshot: item.label,
    note: "快捷记账",
    source: "quick_tap",
    sourceReference: `quick:${item.key}:${Date.now()}`
  });

  return getHomeIndex({ userId, date: today });
}

async function adjustQuickRecord({ userId, key, date, delta }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  if (!key) throw new AppError(400, "E_BAD_REQUEST", "Missing quick key");
  if (delta === 0 || isNaN(delta)) throw new AppError(400, "E_BAD_REQUEST", "Invalid delta");

  const item = QUICK_ITEMS.find((quickItem) => quickItem.key === key);
  if (!item) throw new AppError(400, "E_BAD_REQUEST", "Invalid quick key");

  const today = resolveToday(date);

  // 调整金额：添加一笔调整记录
  await recordsService.create({
    userId,
    recordType: "expense",
    amount: Math.abs(delta),
    recordDate: today,
    categorySnapshot: item.label,
    note: delta > 0 ? "快捷记账调整（增加）" : "快捷记账调整（减少）",
    source: "quick_adjust",
    sourceReference: `adjust:${item.key}:${Date.now()}`
  });

  return getHomeIndex({ userId, date: today });
}

async function getDailyQuote() {
  // 先返回固定值测试连接
  return { quote: "今天的努力，是明天自由的基石" };

  // TODO: 启用外部 API 调用
  // return new Promise((resolve, reject) => {
  //   const url = "https://v1.hitokoto.cn/?c=f&max_length=25";
  //   https.get(url, (res) => {
  //     let data = "";
  //     res.on("data", (chunk) => data += chunk);
  //     res.on("end", () => {
  //       try {
  //         const json = JSON.parse(data);
  //         resolve({ quote: json.hitokoto || "今天的努力，是明天自由的基石" });
  //       } catch (e) {
  //         resolve({ quote: "今天的努力，是明天自由的基石" });
  //       }
  //     });
  //   }).on("error", () => {
  //     resolve({ quote: "今天的努力，是明天自由的基石" });
  //   });
  // });
}

module.exports = {
  getHomeIndex,
  createQuickRecord,
  adjustQuickRecord,
  getUserStats,
  getDailyQuote
};
