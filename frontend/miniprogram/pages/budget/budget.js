const { request } = require("../../utils/request");

// 预算分类配置 - 带颜色和图标
const BUDGET_CATEGORIES = {
  daily: [
    {
      key: "transport",
      label: "交通",
      icon: "🚇",
      hint: "地铁、公交、打车等",
      color: "#6FCF97",
      bgColor: "rgba(111, 207, 151, 0.1)",
      colorLight: "rgba(111, 207, 151, 0.3)",
      quickAmounts: ["10", "20", "30"]
    },
    {
      key: "breakfast",
      label: "早餐",
      icon: "🥐",
      hint: "开启美好的一天",
      color: "#FFB38A",
      bgColor: "rgba(255, 179, 138, 0.1)",
      colorLight: "rgba(255, 179, 138, 0.3)",
      quickAmounts: ["10", "15", "20"]
    },
    {
      key: "lunch",
      label: "午餐",
      icon: "🍱",
      hint: "午休时光",
      color: "#56CCF2",
      bgColor: "rgba(86, 204, 242, 0.1)",
      colorLight: "rgba(86, 204, 242, 0.3)",
      quickAmounts: ["25", "35", "50"]
    },
    {
      key: "dinner",
      label: "晚餐",
      icon: "🍲",
      hint: "放松用餐时间",
      color: "#A78BFA",
      bgColor: "rgba(167, 139, 250, 0.1)",
      colorLight: "rgba(167, 139, 250, 0.3)",
      quickAmounts: ["30", "45", "60"]
    }
  ],
  monthly: [
    {
      key: "clothing",
      label: "服饰",
      icon: "👕",
      hint: "衣物、鞋子、配饰",
      color: "#FF6B9D",
      bgColor: "rgba(255, 107, 157, 0.1)",
      colorLight: "rgba(255, 107, 157, 0.3)",
      quickAmounts: ["200", "500", "1000"]
    },
    {
      key: "social",
      label: "社交",
      icon: "🎉",
      hint: "聚会、请客、娱乐",
      color: "#6FCF97",
      bgColor: "rgba(111, 207, 151, 0.1)",
      colorLight: "rgba(111, 207, 151, 0.3)",
      quickAmounts: ["200", "500", "800"]
    },
    {
      key: "drinks",
      label: "饮料",
      icon: "☕",
      hint: "咖啡、奶茶、果汁",
      color: "#FFB38A",
      bgColor: "rgba(255, 179, 138, 0.1)",
      colorLight: "rgba(255, 179, 138, 0.3)",
      quickAmounts: ["100", "200", "300"]
    },
    {
      key: "snacks",
      label: "零食",
      icon: "🍿",
      hint: "小食、甜品、坚果",
      color: "#4ADE80",
      bgColor: "rgba(74, 222, 128, 0.1)",
      colorLight: "rgba(74, 222, 128, 0.3)",
      quickAmounts: ["100", "200", "400"]
    },
    {
      key: "daily_necessities",
      label: "日用品",
      icon: "🧴",
      hint: "洗护、纸品、清洁",
      color: "#56CCF2",
      bgColor: "rgba(86, 204, 242, 0.1)",
      colorLight: "rgba(86, 204, 242, 0.3)",
      quickAmounts: ["100", "200", "500"]
    },
    {
      key: "other_family",
      label: "其他家庭花销",
      icon: "🏠",
      hint: "杂项、应急支出",
      color: "#A78BFA",
      bgColor: "rgba(167, 139, 250, 0.1)",
      colorLight: "rgba(167, 139, 250, 0.3)",
      quickAmounts: ["300", "500", "1000"]
    }
  ],
  finance: [
    {
      key: "interest_daily",
      label: "每日利息预算",
      icon: "💎",
      hint: "理财每日收益目标",
      color: "#6FCF97",
      bgColor: "rgba(111, 207, 151, 0.1)",
      colorLight: "rgba(111, 207, 151, 0.3)",
      quickAmounts: ["30", "50", "100"]
    },
    {
      key: "interest_monthly",
      label: "每月利息预算",
      icon: "📈",
      hint: "理财月度收益目标",
      color: "#56CCF2",
      bgColor: "rgba(86, 204, 242, 0.1)",
      colorLight: "rgba(86, 204, 242, 0.3)",
      quickAmounts: ["500", "1000", "2000"]
    }
  ]
};

Page({
  data: {
    currentTab: "daily",
    dailyBudgets: {},
    monthlyBudgets: {},
    financeBudgets: {},
    budgetIds: {}, // 存储预算ID用于更新和删除
    loading: false,
    // 自定义预算分类
    customCategories: {
      daily: [],
      monthly: [],
      finance: []
    },
    // 编辑模态框
    showEditModal: false,
    editItem: null,
    editForm: {
      label: "",
      amount: ""
    },
    // 添加模态框
    showAddModal: false,
    addForm: {
      key: "",
      label: "",
      amount: ""
    }
  },

  onLoad() {
    this.loadCustomCategories();
    this.loadBudgets();
  },

  onShow() {
    this.loadBudgets();
  },

  // 加载自定义预算分类
  loadCustomCategories() {
    try {
      const custom = wx.getStorageSync("customBudgetCategories") || {};
      const safeCustom = {
        daily: Array.isArray(custom.daily) ? custom.daily : [],
        monthly: Array.isArray(custom.monthly) ? custom.monthly : [],
        finance: Array.isArray(custom.finance) ? custom.finance : []
      };
      this.setData({ customCategories: safeCustom });
    } catch (error) {
      console.error("加载自定义分类失败:", error);
      this.setData({
        customCategories: { daily: [], monthly: [], finance: [] }
      });
    }
  },

  // 保存自定义预算分类
  saveCustomCategories() {
    try {
      wx.setStorageSync("customBudgetCategories", this.data.customCategories);
    } catch (error) {
      console.error("保存自定义分类失败:", error);
    }
  },

  async loadBudgets() {
    const userId = Number(wx.getStorageSync("userId"));
    if (!userId) {
      wx.showToast({
        title: "请先登录",
        icon: "none"
      });
      return;
    }

    try {
      this.setData({ loading: true });

      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // 加载每日预算
      const dailyData = await request({
        url: "/budgets",
        method: "GET",
        data: { userId, periodType: "daily" }
      });

      // 加载每月预算
      const monthlyData = await request({
        url: "/budgets",
        method: "GET",
        data: { userId, periodType: "monthly" }
      });

      // 加载理财预算
      const financeData = await request({
        url: "/budgets",
        method: "GET",
        data: { userId, periodType: "finance_interest" }
      });

      // 转换数据格式并存储ID
      const dailyBudgets = {};
      const monthlyBudgets = {};
      const financeBudgets = {};
      const budgetIds = {};

      dailyData.forEach(item => {
        const key = item.period_key?.split("_")[1] || item.period_key;
        dailyBudgets[key] = item.planned_amount;
        budgetIds[`daily_${key}`] = item.id;
      });

      monthlyData.forEach(item => {
        const key = item.period_key?.split("_")[1] || item.period_key;
        monthlyBudgets[key] = item.planned_amount;
        budgetIds[`monthly_${key}`] = item.id;
      });

      financeData.forEach(item => {
        const key = item.period_key?.split("_")[1] || item.period_key;
        financeBudgets[key] = item.planned_amount;
        budgetIds[`finance_${key}`] = item.id;
      });

      this.setData({
        dailyBudgets,
        monthlyBudgets,
        financeBudgets,
        budgetIds,
        loading: false
      });
    } catch (error) {
      console.error("加载预算失败:", error);
      this.setData({ loading: false });
      wx.showToast({
        title: "加载失败",
        icon: "none"
      });
    }
  },

  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ currentTab: tab });
    wx.vibrateShort({ type: "light" });
  },

  onBudgetInput(e) {
    const { category, type } = e.currentTarget.dataset;
    const value = e.detail.value;
    const budgets = type === "daily" ? "dailyBudgets" : type === "monthly" ? "monthlyBudgets" : "financeBudgets";
    this.setData({
      [`${budgets}.${category}`]: value
    });
  },

  onQuickAmount(e) {
    const { category, amount } = e.currentTarget.dataset;
    const type = this.data.currentTab;
    const budgets = type === "daily" ? "dailyBudgets" : type === "monthly" ? "monthlyBudgets" : "financeBudgets";

    this.setData({
      [`${budgets}.${category}`]: amount
    });

    wx.vibrateShort({ type: "light" });
  },

  // 打开编辑模态框
  onEditBudget(e) {
    const { category } = e.currentTarget.dataset;
    const { currentTab } = this.data;
    const categories = this.getBudgetCategories();
    const item = categories.find(c => c.key === category);
    const values = this.getBudgetValues();

    if (!item) return;

    this.setData({
      showEditModal: true,
      editItem: item,
      editForm: {
        label: item.label,
        amount: values[category] || ""
      }
    });
  },

  // 关闭编辑模态框
  onCloseEditModal() {
    this.setData({
      showEditModal: false,
      editItem: null,
      editForm: { label: "", amount: "" }
    });
  },

  // 编辑表单输入
  onEditFormInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`editForm.${field}`]: value
    });
  },

  // 保存编辑
  async onSaveEdit() {
    const { editItem, editForm, currentTab } = this.data;
    if (!editItem) return;

    if (!editForm.label.trim()) {
      wx.showToast({ title: "请输入分类名称", icon: "none" });
      return;
    }

    const userId = Number(wx.getStorageSync("userId"));

    try {
      this.setData({ loading: true });

      // 更新自定义分类名称
      const customCategories = { ...this.data.customCategories };
      const tabCategories = customCategories[currentTab] || [];
      const categoryIndex = tabCategories.findIndex(c => c.key === editItem.key);

      if (categoryIndex >= 0) {
        customCategories[currentTab][categoryIndex].label = editForm.label.trim();
        this.setData({ customCategories });
        this.saveCustomCategories();
      }

      // 更新预算金额（理财预算暂不支持创建/更新）
      if (editForm.amount && currentTab !== "finance") {
        const budgetKey = `${currentTab}_${editItem.key}`;
        const budgetId = this.data.budgetIds[budgetKey];

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        if (budgetId) {
          // 更新现有预算
          await request({
            url: `/budgets/${budgetId}`,
            method: "PUT",
            data: {
              userId,
              periodType: currentTab,
              plannedAmount: Number(editForm.amount),
              budgetDate: currentTab === "daily" ? today : undefined,
              budgetMonth: currentTab !== "daily" ? monthKey : undefined
            }
          });
        } else {
          // 创建新预算
          const periodKey = currentTab === "daily" ? `daily_${editItem.key}` :
                           currentTab === "monthly" ? `monthly_${editItem.key}` :
                           `finance_${editItem.key}`;

          await request({
            url: "/budgets",
            method: "POST",
            data: {
              userId,
              periodType: currentTab,
              periodKey,
              budgetDate: currentTab === "daily" ? today : undefined,
              budgetMonth: currentTab !== "daily" ? monthKey : undefined,
              plannedAmount: Number(editForm.amount)
            }
          });
        }

        // 更新本地数据
        const budgetsKey = currentTab === "daily" ? "dailyBudgets" :
                          currentTab === "monthly" ? "monthlyBudgets" : "financeBudgets";
        this.setData({
          [`${budgetsKey}.${editItem.key}`]: editForm.amount
        });
      }

      this.setData({ loading: false });
      this.onCloseEditModal();

      wx.showToast({ title: "保存成功", icon: "success" });
      this.loadBudgets();
    } catch (error) {
      console.error("保存失败:", error);
      this.setData({ loading: false });
      wx.showToast({ title: "保存失败", icon: "none" });
    }
  },

  // 删除预算
  async onDeleteBudget(e) {
    const { category } = e.currentTarget.dataset;
    const { currentTab, budgetIds } = this.data;
    const budgetKey = `${currentTab}_${category}`;
    const budgetId = budgetIds[budgetKey];

    if (!budgetId) {
      // 如果没有预算ID，只清除本地金额
      const budgetsKey = currentTab === "daily" ? "dailyBudgets" :
                        currentTab === "monthly" ? "monthlyBudgets" : "financeBudgets";
      this.setData({
        [`${budgetsKey}.${category}`]: ""
      });
      wx.showToast({ title: "已清除", icon: "success" });
      return;
    }

    wx.showModal({
      title: "确认删除",
      content: "确定要删除此预算吗？",
      confirmColor: "#FF6B6B",
      success: async (res) => {
        if (res.confirm) {
          try {
            this.setData({ loading: true });

            await request({
              url: `/budgets/${budgetId}`,
              method: "DELETE",
              data: { userId: Number(wx.getStorageSync("userId")) }
            });

            // 清除本地数据
            const budgetsKey = currentTab === "daily" ? "dailyBudgets" :
                              currentTab === "monthly" ? "monthlyBudgets" : "financeBudgets";
            this.setData({
              [`${budgetsKey}.${category}`]: "",
              loading: false
            });

            wx.showToast({ title: "删除成功", icon: "success" });
            this.loadBudgets();
          } catch (error) {
            console.error("删除失败:", error);
            this.setData({ loading: false });
            wx.showToast({ title: "删除失败", icon: "none" });
          }
        }
      }
    });
  },

  // 打开添加模态框
  onOpenAddModal() {
    // 理财预算暂不支持添加自定义分类
    if (this.data.currentTab === "finance") {
      wx.showToast({
        title: "理财预算暂不支持添加自定义分类",
        icon: "none"
      });
      return;
    }

    // 生成短随机 key（8位随机字符）
    const randomKey = Math.random().toString(36).substring(2, 10);

    this.setData({
      showAddModal: true,
      addForm: {
        key: `custom_${randomKey}`,
        label: "",
        amount: ""
      }
    });
  },

  // 关闭添加模态框
  onCloseAddModal() {
    this.setData({
      showAddModal: false,
      addForm: { key: "", label: "", amount: "" }
    });
  },

  // 添加表单输入
  onAddFormInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`addForm.${field}`]: value
    });
  },

  // 保存新增分类
  async onSaveAdd() {
    const { addForm, currentTab } = this.data;

    if (!addForm.label.trim()) {
      wx.showToast({ title: "请输入分类名称", icon: "none" });
      return;
    }

    try {
      // 添加到自定义分类
      const customCategories = { ...this.data.customCategories };
      const colors = ["#6FCF97", "#FFB38A", "#56CCF2", "#A78BFA", "#4ADE80", "#FF6B9D"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newCategory = {
        key: addForm.key,
        label: addForm.label.trim(),
        icon: "✨",
        hint: "自定义分类",
        color: randomColor,
        bgColor: `${randomColor}1A`,
        colorLight: `${randomColor}4D`
      };

      if (!customCategories[currentTab]) {
        customCategories[currentTab] = [];
      }
      customCategories[currentTab].push(newCategory);

      this.setData({ customCategories });
      this.saveCustomCategories();

      // 如果有金额且不是理财预算，创建预算
      // 理财预算需要关联账户、年化利率、本金等额外参数，暂不支持直接添加
      if (addForm.amount && currentTab !== "finance") {
        const userId = Number(wx.getStorageSync("userId"));
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const periodKey = currentTab === "daily" ? `daily_${addForm.key}` :
                         currentTab === "monthly" ? `monthly_${addForm.key}` :
                         `finance_${addForm.key}`;

        await request({
          url: "/budgets",
          method: "POST",
          data: {
            userId,
            periodType: currentTab,
            periodKey,
            budgetDate: currentTab === "daily" ? today : undefined,
            budgetMonth: currentTab !== "daily" ? monthKey : undefined,
            plannedAmount: Number(addForm.amount)
          }
        });
      }

      this.onCloseAddModal();
      this.loadBudgets();

      wx.showToast({ title: "添加成功", icon: "success" });
    } catch (error) {
      console.error("添加失败:", error);
      const errorMsg = error.data?.message || error.message || "添加失败";
      wx.showToast({ title: errorMsg, icon: "none" });
    }
  },

  // 删除自定义分类
  onDeleteCustomCategory(e) {
    const { category } = e.currentTarget.dataset;
    const { currentTab } = this.data;

    wx.showModal({
      title: "确认删除",
      content: "确定要删除此自定义分类吗？",
      confirmColor: "#FF6B6B",
      success: (res) => {
        if (res.confirm) {
          const customCategories = { ...this.data.customCategories };
          if (!customCategories[currentTab]) {
            customCategories[currentTab] = [];
          }
          customCategories[currentTab] = customCategories[currentTab].filter(c => c.key !== category);
          this.setData({ customCategories });
          this.saveCustomCategories();

          wx.showToast({ title: "删除成功", icon: "success" });
        }
      }
    });
  },

  async onSaveBudgets() {
    const userId = Number(wx.getStorageSync("userId"));
    if (!userId) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }

    const { currentTab, dailyBudgets, monthlyBudgets, financeBudgets, budgetIds } = this.data;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    try {
      this.setData({ loading: true });

      let budgets, periodType;
      if (currentTab === "daily") {
        budgets = dailyBudgets;
        periodType = "daily";
      } else if (currentTab === "monthly") {
        budgets = monthlyBudgets;
        periodType = "monthly";
      } else {
        budgets = financeBudgets;
        periodType = "finance_interest";
      }

      for (const [key, amount] of Object.entries(budgets)) {
        if (!amount) continue;

        const budgetKey = `${currentTab}_${key}`;
        const budgetId = budgetIds[budgetKey];

        // 理财预算只支持更新已有预算，不支持创建新预算（需要账户关联）
        if (currentTab === "finance" && !budgetId) continue;

        const periodKey = currentTab === "daily" ? `daily_${key}` :
                         currentTab === "monthly" ? `monthly_${key}` :
                         `finance_${key}`;

        if (budgetId) {
          // 更新现有预算
          await request({
            url: `/budgets/${budgetId}`,
            method: "PUT",
            data: {
              userId,
              periodType,
              plannedAmount: Number(amount),
              budgetDate: currentTab === "daily" ? today : undefined,
              budgetMonth: currentTab !== "daily" ? monthKey : undefined
            }
          });
        } else {
          // 创建新预算
          await request({
            url: "/budgets",
            method: "POST",
            data: {
              userId,
              periodType,
              periodKey,
              budgetDate: currentTab === "daily" ? today : undefined,
              budgetMonth: currentTab !== "daily" ? monthKey : undefined,
              plannedAmount: Number(amount)
            }
          });
        }
      }

      this.setData({ loading: false });
      wx.vibrateShort({ type: "heavy" });
      wx.showToast({ title: "预算已保存", icon: "success", duration: 2000 });
      this.loadBudgets();
    } catch (error) {
      console.error("保存失败:", error);
      this.setData({ loading: false });
      wx.showToast({ title: "保存失败", icon: "none" });
    }
  },

  async onResetBudgets() {
    wx.showModal({
      title: "确认重置",
      content: "确定要清空当前分类下的所有预算吗？",
      confirmText: "确定重置",
      cancelText: "取消",
      confirmColor: "#6FCF97",
      success: async (res) => {
        if (res.confirm) {
          const { currentTab } = this.data;
          const budgets = currentTab === "daily" ? "dailyBudgets" : currentTab === "monthly" ? "monthlyBudgets" : "financeBudgets";
          this.setData({ [budgets]: {} });
          wx.vibrateShort({ type: "light" });
          wx.showToast({ title: "已重置", icon: "success" });
        }
      }
    });
  },

  getBudgetCategories() {
    const { currentTab, customCategories } = this.data;
    const baseCategories = currentTab === "daily" ? BUDGET_CATEGORIES.daily :
                          currentTab === "monthly" ? BUDGET_CATEGORIES.monthly :
                          BUDGET_CATEGORIES.finance;
    return [...baseCategories, ...(customCategories[currentTab] || [])];
  },

  getBudgetValues() {
    const { currentTab, dailyBudgets, monthlyBudgets, financeBudgets } = this.data;
    if (currentTab === "daily") return dailyBudgets;
    if (currentTab === "monthly") return monthlyBudgets;
    return financeBudgets;
  },

  isCustomCategory(key) {
    return key.startsWith("custom_");
  }
});
