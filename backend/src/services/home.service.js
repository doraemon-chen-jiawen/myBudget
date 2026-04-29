const AppError = require("../utils/app-error");
const https = require("https");

const recordsDao = require("../dao/records.dao");
const budgetsDao = require("../dao/budgets.dao");
const budgetCategoriesDao = require("../dao/budget-categories.dao");
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

  const [records, monthRecords, dailyBudgets, monthlyBudgets, systemDailyCategories, userDailyCategories, monthlyCategories, yearlyCategories] = await Promise.all([
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
    }),
    budgetCategoriesDao.listCategories({ userId: null, periodType: "daily" }), // 系统默认分类
    budgetCategoriesDao.listCategories({ userId, periodType: "daily" }), // 用户自定义分类
    budgetCategoriesDao.listCategories({ userId, periodType: "monthly" }), // 月度分类
    budgetCategoriesDao.listCategories({ userId, periodType: "yearly" }) // 年度分类
  ]);

  const dailyBudgetSum = (dailyBudgets || []).reduce((sum, item) => sum + Number(item.planned_amount || 0), 0);
  const actualTotal = (records || [])
    .filter((item) => item.record_type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const remainTotal = dailyBudgetSum - actualTotal;
  const quickCountMap = buildQuickCountMap(records || []);

  // 构建分类映射
  const categoryMap = {};
  (systemDailyCategories || []).forEach(cat => {
    categoryMap[cat.category_key] = cat;
  });
  (userDailyCategories || []).forEach(cat => {
    // 用户自定义分类覆盖系统默认分类
    categoryMap[cat.category_key] = cat;
  });

  // 系统默认的分类键值（始终显示）
  const systemDefaultKeys = ['breakfast', 'lunch', 'dinner', 'transport'];

  // 从所有预算中提取分类键
  const allBudgetCategoryKeys = new Set();
  (dailyBudgets || []).forEach(budget => {
    const periodKey = budget.period_key;
    if (periodKey) {
      let categoryKey = null;
      if (periodKey.startsWith("daily_")) {
        categoryKey = periodKey.substring(6);
      } else {
        categoryKey = periodKey; // 如果没有前缀，直接使用
      }
      if (categoryKey && budget.planned_amount > 0) {
        allBudgetCategoryKeys.add(categoryKey);
      }
    }
  });

  // 构建快捷项：系统默认分类 + 用户有预算的分类 + "其他"固定项
  const quickItems = [];
  const addedKeys = new Set();

  // 1. 首先添加系统默认分类
  systemDefaultKeys.forEach(categoryKey => {
    const cat = categoryMap[categoryKey];
    if (cat) {
      quickItems.push({
        key: categoryKey,
        label: cat.label,
        icon: cat.icon,
        amount: Number(cat.default_amount || 0) || 10,
        count: quickCountMap[categoryKey] || 0,
        isOther: false
      });
      addedKeys.add(categoryKey);
    }
  });

  // 2. 添加用户有预算的分类（非系统默认）
  allBudgetCategoryKeys.forEach(categoryKey => {
    if (!addedKeys.has(categoryKey) && !systemDefaultKeys.includes(categoryKey)) {
      const cat = categoryMap[categoryKey];
      console.log('categoryMap', categoryMap, categoryKey)
      if (cat) {
        quickItems.push({
          key: categoryKey,
          label: cat.label,
          icon: cat.icon,
          amount: Number(cat.default_amount || 0) || 10,
          count: quickCountMap[categoryKey] || 0,
          isOther: false
        });
        addedKeys.add(categoryKey);
      } else {
        // 如果分类不存在于 category_map 中，可能是用户删除了分类但预算还存在
        // 创建一个临时的快捷项
        quickItems.push({
          key: categoryKey,
          label: '未知分类',
          icon: '❓',
          amount: 10,
          count: quickCountMap[categoryKey] || 0,
          isOther: false
        });
        addedKeys.add(categoryKey);
      }
    }
  });

  // 添加"其他"固定项
  quickItems.push({
    key: "other",
    label: "其他",
    icon: "➕",
    amount: 0,
    count: 0,
    isOther: true
  });

  // 月度合计：每日预算 × 当月天数 + 月度预算
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthlyBudgetSum = (monthlyBudgets || []).reduce((sum, item) => sum + Number(item.planned_amount || 0), 0);
  const monthBudgetTotal = dailyBudgetSum * daysInMonth + monthlyBudgetSum;
  const monthActualTotal = (monthRecords || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthRemainTotal = monthBudgetTotal - monthActualTotal;

  // 构建月度和年度分类列表供前端选择
  const buildCategoryList = (categories) => {
    return (categories || []).map(cat => ({
      key: cat.category_key,
      label: cat.label,
      icon: cat.icon,
      defaultAmount: Number(cat.default_amount || 0) || 10,
      periodType: cat.period_type
    }));
  };

  return {
    today,
    budgetTotal: dailyBudgetSum,
    actualTotal,
    remainTotal,
    monthBudgetTotal,
    monthActualTotal,
    monthRemainTotal,
    quickItems,
    monthlyCategories: buildCategoryList(monthlyCategories),
    yearlyCategories: buildCategoryList(yearlyCategories)
  };
}

async function createQuickRecord({ userId, key, date, amount, note }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  if (!key) throw new AppError(400, "E_BAD_REQUEST", "Missing quick key");

  const today = resolveToday(date);

  if (key === "other") {
    // "其他"项需要验证金额和备注
    const recordAmount = amount != null && !isNaN(Number(amount)) ? Number(amount) : null;
    if (!recordAmount || recordAmount <= 0) {
      throw new AppError(400, "E_BAD_REQUEST", "Amount is required for 'other' category");
    }
    if (!note || !note.trim()) {
      throw new AppError(400, "E_BAD_REQUEST", "Note is required for 'other' category");
    }

    await recordsService.create({
      userId,
      recordType: "expense",
      amount: recordAmount,
      recordDate: today,
      categorySnapshot: "其他",
      note: note.trim(),
      source: "quick_tap",
      sourceReference: `quick:other:${Date.now()}`
    });
  } else {
    // 尝试从不同周期的预算分类获取信息
    const [dailyCategories, monthlyCategories, yearlyCategories] = await Promise.all([
      budgetCategoriesDao.listCategories({ userId, periodType: "daily" }),
      budgetCategoriesDao.listCategories({ userId, periodType: "monthly" }),
      budgetCategoriesDao.listCategories({ userId, periodType: "yearly" })
    ]);

    // 依次在日、月、年分类中查找
    let category = dailyCategories.find(cat => cat.category_key === key);
    if (!category) {
      category = monthlyCategories.find(cat => cat.category_key === key);
    }
    if (!category) {
      category = yearlyCategories.find(cat => cat.category_key === key);
    }

    if (!category) {
      throw new AppError(400, "E_BAD_REQUEST", "Invalid quick key");
    }

    const recordAmount = amount != null && !isNaN(Number(amount)) ? Number(amount) : (category.default_amount || 0);

    await recordsService.create({
      userId,
      recordType: "expense",
      amount: recordAmount,
      recordDate: today,
      categorySnapshot: category.label,
      note: note ? note.trim() : "自定义记账",
      source: "quick_tap",
      sourceReference: `quick:${key}:${Date.now()}`
    });
  }

  return getHomeIndex({ userId, date: today });
}

async function adjustQuickRecord({ userId, key, date, delta }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  if (!key) throw new AppError(400, "E_BAD_REQUEST", "Missing quick key");
  if (delta === 0 || isNaN(delta)) throw new AppError(400, "E_BAD_REQUEST", "Invalid delta");

  const today = resolveToday(date);

  if (key === "other") {
    // "其他"项不支持调整
    throw new AppError(400, "E_BAD_REQUEST", "Cannot adjust 'other' category");
  }

  const dailyCategories = await budgetCategoriesDao.listCategories({ userId, periodType: "daily" });
  const category = dailyCategories.find(cat => cat.category_key === key);
  if (!category) {
    throw new AppError(400, "E_BAD_REQUEST", "Invalid quick key");
  }

  await recordsService.create({
    userId,
    recordType: "expense",
    amount: Math.abs(delta),
    recordDate: today,
    categorySnapshot: category.label,
    note: delta > 0 ? "快捷记账调整（增加）" : "快捷记账调整（减少）",
    source: "quick_adjust",
    sourceReference: `adjust:${key}:${Date.now()}`
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
