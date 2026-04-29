const { request } = require("../../utils/request");

Page({
  data: {
    currentTab: "daily",
    // All categories grouped by period_type (from API)
    categories: { daily: [], monthly: [], finance_interest: [], yearly: [] },
    // Current tab's category list (for template wx:for)
    budgetCategories: [],
    // Current tab's budget values (for template input binding)
    currentBudgetValues: {},
    budgetTotal: "0",
    dailyTotal: "0",
    monthlyTotal: "0",
    daysInMonth: 30,
    dailyBudgets: {},
    monthlyBudgets: {},
    financeBudgets: {},
    yearlyBudgets: {},
    budgetIds: {},
    loading: false,
    // Edit modal
    showEditModal: false,
    editItem: null,
    editForm: { label: "", amount: "" },
    // Add modal
    showAddModal: false,
    addForm: { key: "", label: "", amount: "" },
    // Pending delete operations per tab
    pendingDeletes: {
      daily: {},
      monthly: {},
      finance: {},
      yearly: {}
    }
  },

  onLoad() {
    this.loadCategories();
    this.loadBudgets();
  },

  onShow() {
    this.loadCategories();
    this.loadBudgets();
  },

  // ---------- Categories ----------

  async loadCategories() {
    const userId = Number(wx.getStorageSync("userId"));
    if (!userId) return;

    try {
      const allCategories = await request({
        url: "/budget-categories",
        method: "GET",
        data: { userId },
        silent: true
      });

      const categories = { daily: [], monthly: [], finance_interest: [], yearly: [] };
      allCategories.forEach((cat, index) => {
        try {

          if (typeof cat.quick_amounts === "string") {
            cat.quick_amounts = JSON.parse(cat.quick_amounts);
          }
        } catch (e) {
          cat.quick_amounts = [];
        }

        const pt = cat.period_type;

        if (categories[pt]) {
          const mapped = this._mapCategory(cat);
          categories[pt].push(mapped);
        } else {
          console.warn(`【分类加载】未知的 period_type: ${pt}, 分类:`, cat);
        }
      });

      this.setData({ categories });
      this._updateVisibleData();
    } catch (error) {
      console.error("【分类加载】加载分类失败:", error);
    }
  },

  _mapCategory(cat) {
    return {
      id: cat.id,
      key: cat.category_key,
      label: cat.label,
      icon: cat.icon,
      hint: cat.hint || "",
      color: cat.color,
      bgColor: cat.bg_color,
      colorLight: cat.color_light,
      quickAmounts: cat.quick_amounts || [],
      defaultAmount: cat.default_amount != null ? String(cat.default_amount) : "",
      isCustom: cat.is_system === 0
    };
  },

  _updateVisibleData() {
    const { currentTab, categories, dailyBudgets, monthlyBudgets, financeBudgets, yearlyBudgets } = this.data;
    const periodType = currentTab === "finance" ? "finance_interest" : currentTab;
    const list = categories[periodType] || [];
    const values =
      currentTab === "daily" ? dailyBudgets :
      currentTab === "monthly" ? monthlyBudgets :
      currentTab === "yearly" ? yearlyBudgets : financeBudgets;

    console.log('【更新可见数据】currentTab:', currentTab);
    console.log('【更新可见数据】periodType:', periodType);
    console.log('【更新可见数据】list (budgetCategories):', list);
    console.log('【更新可见数据】list 长度:', list.length);

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const validKeys = (cats) => new Set(cats.map(c => c.key));
    const dailyKeys = validKeys(categories.daily || []);
    const monthlyKeys = validKeys(categories.monthly || []);
    const yearlyKeys = validKeys(categories.yearly || []);
    const dailySum = this._sumByKeys(dailyBudgets, dailyKeys);
    const monthlySum = this._sumByKeys(monthlyBudgets, monthlyKeys);
    const yearlySum = this._sumByKeys(yearlyBudgets, yearlyKeys);
    const tabSum = this._sumByKeys(values, validKeys(list));
    let budgetTotal = tabSum;

    if (currentTab === "monthly") {
      budgetTotal = monthlySum + dailySum * daysInMonth;
    } else if (currentTab === "yearly") {
      budgetTotal = yearlySum;
    }

    const fmt = (n) => n % 1 === 0 ? String(n) : n.toFixed(2);

    console.log('【更新可见数据】即将设置 budgetCategories:', list);
    console.log('【更新可见数据】即将设置 currentBudgetValues:', values);

    this.setData({
      budgetCategories: list,
      currentBudgetValues: { ...values },
      budgetTotal: fmt(budgetTotal),
      dailyTotal: fmt(dailySum),
      monthlyTotal: fmt(monthlySum),
      yearlyTotal: fmt(yearlySum),
      daysInMonth
    });

    console.log('【更新可见数据】设置完成');
  },

  _sumByKeys(values, keySet) {
    let sum = 0;
    if (!keySet || keySet.size === 0) return sum;
    for (const k of keySet) {
      const n = Number(values[k]);
      if (n > 0) sum += n;
    }
    return sum;
  },

  // ---------- Budgets ----------

  async loadBudgets() {
    const userId = Number(wx.getStorageSync("userId"));
    if (!userId) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }

    try {
      this.setData({ loading: true });

      // Auto-create defaults for daily, monthly and yearly
      for (const pt of ["daily", "monthly", "yearly"]) {
        try {
          await request({
            url: "/budgets/initialize-defaults",
            method: "POST",
            data: { userId, periodType: pt },
            showLoading: false,
            silent: true
          });
        } catch (_) { /* already initialized is fine */ }
      }

      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const [dailyData, monthlyData, financeData, yearlyData] = await Promise.all([
        request({ url: "/budgets", method: "GET", data: { userId, periodType: "daily" } }),
        request({ url: "/budgets", method: "GET", data: { userId, periodType: "monthly" } }),
        request({ url: "/budgets", method: "GET", data: { userId, periodType: "finance_interest" } }),
        request({ url: "/budgets", method: "GET", data: { userId, periodType: "yearly" } })
      ]);

      const dailyBudgets = {};
      const monthlyBudgets = {};
      const financeBudgets = {};
      const yearlyBudgets = {};
      const budgetIds = {};

      const parseKey = (pk) => {
        if (!pk) return pk;
        const i = pk.indexOf("_");
        return i >= 0 ? pk.substring(i + 1) : pk;
      };

      dailyData.forEach(item => {
        const key = parseKey(item.period_key);
        dailyBudgets[key] = item.planned_amount;
        budgetIds[`daily_${key}`] = item.id;
      });
      monthlyData.forEach(item => {
        const key = parseKey(item.period_key);
        monthlyBudgets[key] = item.planned_amount;
        budgetIds[`monthly_${key}`] = item.id;
      });
      financeData.forEach(item => {
        const key = parseKey(item.period_key);
        financeBudgets[key] = item.planned_amount;
        budgetIds[`finance_${key}`] = item.id;
      });
      yearlyData.forEach(item => {
        const key = parseKey(item.period_key);
        yearlyBudgets[key] = item.planned_amount;
        budgetIds[`yearly_${key}`] = item.id;
      });

      this.setData({
        dailyBudgets, monthlyBudgets, financeBudgets, yearlyBudgets, budgetIds,
        loading: false,
        pendingDeletes: { daily: {}, monthly: {}, finance: {}, yearly: {} }
      });
      this._updateVisibleData();
    } catch (error) {
      console.error("加载预算失败:", error);
      this.setData({ loading: false });
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },

  // ---------- Tab ----------

  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ currentTab: tab });
    this._updateVisibleData();
    wx.vibrateShort({ type: "light" });
  },

  // ---------- Input ----------

  onBudgetInput(e) {
    const { category, type } = e.currentTarget.dataset;
    const value = e.detail.value;
    const budgets =
      type === "daily" ? "dailyBudgets" :
      type === "monthly" ? "monthlyBudgets" :
      type === "yearly" ? "yearlyBudgets" :
      "financeBudgets";
    this.setData({
      [`${budgets}.${category}`]: value,
      [`currentBudgetValues.${category}`]: value
    });
    this._refreshTotal();
  },

  onQuickAmount(e) {
    const { category, amount } = e.currentTarget.dataset;
    const type = this.data.currentTab;
    const budgets =
      type === "daily" ? "dailyBudgets" :
      type === "monthly" ? "monthlyBudgets" :
      type === "yearly" ? "yearlyBudgets" :
      "financeBudgets";
    this.setData({
      [`${budgets}.${category}`]: amount,
      [`currentBudgetValues.${category}`]: amount
    });
    this._refreshTotal();
    wx.vibrateShort({ type: "light" });
  },

  _refreshTotal() {
    const { currentTab, currentBudgetValues, dailyBudgets, monthlyBudgets, yearlyBudgets, budgetCategories, categories, daysInMonth } = this.data;
    const validKeys = (cats) => new Set(cats.map(c => c.key));
    const currentKeys = validKeys(budgetCategories);
    const tabSum = this._sumByKeys(currentBudgetValues, currentKeys);
    let total = tabSum;
    let dailySum = 0;
    let monthlySum = 0;
    let yearlySum = 0;
    if (currentTab === "daily") {
      dailySum = tabSum;
    } else if (currentTab === "monthly") {
      dailySum = this._sumByKeys(dailyBudgets, validKeys(categories.daily || []));
      monthlySum = this._sumByKeys(monthlyBudgets, validKeys(categories.monthly || []));
      total = monthlySum + dailySum * daysInMonth;
    } else if (currentTab === "yearly") {
      yearlySum = tabSum;
      total = yearlySum;
    }
    const fmt = (n) => n % 1 === 0 ? String(n) : n.toFixed(2);
    this.setData({
      budgetTotal: fmt(total),
      dailyTotal: fmt(dailySum),
      monthlyTotal: fmt(monthlySum),
      yearlyTotal: fmt(yearlySum)
    });
  },

  // ---------- Edit ----------

  onEditBudget(e) {
    const { category } = e.currentTarget.dataset;
    const item = this.data.budgetCategories.find(c => c.key === category);
    if (!item) return;

    const values = this.data.currentBudgetValues;
    this.setData({
      showEditModal: true,
      editItem: item,
      editForm: {
        label: item.label,
        amount: values[category] || ""
      }
    });
  },

  onCloseEditModal() {
    this.setData({ showEditModal: false, editItem: null, editForm: { label: "", amount: "" } });
  },

  onEditFormInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`editForm.${field}`]: e.detail.value });
  },

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

      // Update custom category label via API
      if (editItem.isCustom && editItem.id) {
        await request({
          url: `/budget-categories/${editItem.id}`,
          method: "PUT",
          data: { userId, label: editForm.label.trim() }
        });
      }

      // Update budget amount
      if (editForm.amount && currentTab !== "finance") {
        const budgetKey = `${currentTab}_${editItem.key}`;
        const budgetId = this.data.budgetIds[budgetKey];

        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const yearKey = `${now.getFullYear()}`;

        if (budgetId) {
          await request({
            url: `/budgets/${budgetId}`,
            method: "PUT",
            data: {
              userId,
              periodType: currentTab,
              periodKey: budgetKey,
              plannedAmount: Number(editForm.amount),
              budgetDate: currentTab === "daily" ? today : undefined,
              budgetMonth: (currentTab === "monthly" || currentTab === "finance") ? monthKey : undefined,
              budgetYear: currentTab === "yearly" ? yearKey : undefined
            }
          });
        } else {
          await request({
            url: "/budgets",
            method: "POST",
            data: {
              userId,
              periodType: currentTab,
              periodKey: `${currentTab}_${editItem.key}`,
              budgetDate: currentTab === "daily" ? today : undefined,
              budgetMonth: (currentTab === "monthly" || currentTab === "finance") ? monthKey : undefined,
              budgetYear: currentTab === "yearly" ? yearKey : undefined,
              plannedAmount: Number(editForm.amount)
            }
          });
        }
      }

      this.setData({ loading: false });
      this.onCloseEditModal();
      wx.showToast({ title: "保存成功", icon: "success" });
      this.loadCategories();
      this.loadBudgets();
    } catch (error) {
      console.error("保存失败:", error);
      this.setData({ loading: false });
      wx.showToast({ title: "保存失败", icon: "none" });
    }
  },

  // ---------- Delete ----------

  onDeleteBudget(e) {
    const { category } = e.currentTarget.dataset;
    const { currentTab, budgetIds, budgetCategories } = this.data;
    const budgetKey = `${currentTab}_${category}`;
    const budgetId = budgetIds[budgetKey];
    const catItem = budgetCategories.find(c => c.key === category);

    wx.showModal({
      title: "确认删除",
      content: "删除后将保存时生效，确定要删除此预算和分类吗？",
      confirmColor: "#FF6B6B",
      success: (res) => {
        if (res.confirm) {
          // Add to pending deletes for current tab
          const pendingDeletes = this.data.pendingDeletes || {};
          pendingDeletes[currentTab] = pendingDeletes[currentTab] || {};
          pendingDeletes[currentTab][category] = {
            categoryId: catItem?.id,
            budgetId: budgetId
          };

          // Clear budget value locally
          const budgetsKey =
            currentTab === "daily" ? "dailyBudgets" :
            currentTab === "monthly" ? "monthlyBudgets" :
            currentTab === "yearly" ? "yearlyBudgets" :
            "financeBudgets";

          this.setData({
            pendingDeletes,
            [`${budgetsKey}.${category}`]: "",
            [`currentBudgetValues.${category}`]: ""
          });

          this._refreshTotal();
          wx.vibrateShort({ type: "light" });
          wx.showToast({ title: "已标记删除，点击保存生效", icon: "none", duration: 2000 });
        }
      }
    });
  },

  // ---------- Add ----------

  onOpenAddModal() {
    if (this.data.currentTab === "finance") {
      wx.showToast({ title: "理财预算暂不支持添加自定义分类", icon: "none" });
      return;
    }
    this.setData({
      showAddModal: true,
      addForm: { key: "", label: "", amount: "" }
    });
  },

  onCloseAddModal() {
    this.setData({ showAddModal: false, addForm: { key: "", label: "", amount: "" } });
  },

  onAddFormInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`addForm.${field}`]: e.detail.value });
  },

  async onSaveAdd() {
    const { addForm, currentTab } = this.data;
    if (!addForm.label.trim()) {
      wx.showToast({ title: "请输入分类名称", icon: "none" });
      return;
    }

    const userId = Number(wx.getStorageSync("userId"));
    const periodType = currentTab;

    try {
      this.setData({ loading: true });

      // Create category via API
      const newCat = await request({
        url: "/budget-categories",
        method: "POST",
        data: {
          userId,
          periodType,
          label: addForm.label.trim(),
          defaultAmount: addForm.amount ? Number(addForm.amount) : null
        }
      });

      // Create budget if amount provided
      if (addForm.amount) {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const yearKey = `${now.getFullYear()}`;

        await request({
          url: "/budgets",
          method: "POST",
          data: {
            userId,
            periodType,
            periodKey: `${periodType}_${newCat.category_key}`,
            budgetDate: periodType === "daily" ? today : undefined,
            budgetMonth: (periodType === "monthly" || periodType === "finance_interest") ? monthKey : undefined,
            budgetYear: periodType === "yearly" ? yearKey : undefined,
            plannedAmount: Number(addForm.amount)
          }
        });
      }

      this.setData({ loading: false });
      this.onCloseAddModal();
      wx.showToast({ title: "添加成功", icon: "success" });
      this.loadCategories();
      this.loadBudgets();
    } catch (error) {
      console.error("添加失败:", error);
      this.setData({ loading: false });
      const msg = error.data?.message || error.message || "添加失败";
      wx.showToast({ title: msg, icon: "none" });
    }
  },

  // ---------- Save all ----------

  async onSaveBudgets() {
    const userId = Number(wx.getStorageSync("userId"));
    if (!userId) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }

    const { currentTab, dailyBudgets, monthlyBudgets, financeBudgets, yearlyBudgets, budgetIds, pendingDeletes } = this.data;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const yearKey = `${now.getFullYear()}`;

    try {
      this.setData({ loading: true });

      // First, execute pending deletes for current tab only
      const currentPendingDeletes = pendingDeletes[currentTab] || {};
      for (const [key, deleteInfo] of Object.entries(currentPendingDeletes)) {
        if (deleteInfo.budgetId) {
          try {
            await request({
              url: `/budgets/${deleteInfo.budgetId}`,
              method: "DELETE",
              data: { userId }
            });
          } catch (error) {
            console.error("删除预算失败:", key, error);
          }
        }
        if (deleteInfo.categoryId) {
          try {
            await request({
              url: `/budget-categories/${deleteInfo.categoryId}`,
              method: "DELETE",
              data: { userId }
            });
          } catch (error) {
            console.error("删除分类失败:", key, error);
          }
        }
      }

      // Clear pending deletes for current tab after processing
      const newPendingDeletes = { ...pendingDeletes };
      delete newPendingDeletes[currentTab];

      // Then save/update budget values
      let budgets, periodType;
      if (currentTab === "daily") { budgets = dailyBudgets; periodType = "daily"; }
      else if (currentTab === "monthly") { budgets = monthlyBudgets; periodType = "monthly"; }
      else if (currentTab === "yearly") { budgets = yearlyBudgets; periodType = "yearly"; }
      else { budgets = financeBudgets; periodType = "finance_interest"; }

      for (const [key, amount] of Object.entries(budgets)) {
        if (!amount) continue;

        const budgetKey = `${currentTab}_${key}`;
        const budgetId = budgetIds[budgetKey];

        if (currentTab === "finance" && !budgetId) continue;

        const periodKey = `${currentTab}_${key}`;

        if (budgetId) {
          await request({
            url: `/budgets/${budgetId}`,
            method: "PUT",
            data: {
              userId, periodType, periodKey,
              plannedAmount: Number(amount),
              budgetDate: currentTab === "daily" ? today : undefined,
              budgetMonth: (currentTab === "monthly" || currentTab === "finance") ? monthKey : undefined,
              budgetYear: currentTab === "yearly" ? yearKey : undefined
            }
          });
        } else {
          await request({
            url: "/budgets",
            method: "POST",
            data: {
              userId, periodType, periodKey,
              budgetDate: currentTab === "daily" ? today : undefined,
              budgetMonth: (currentTab === "monthly" || currentTab === "finance") ? monthKey : undefined,
              budgetYear: currentTab === "yearly" ? yearKey : undefined,
              plannedAmount: Number(amount)
            }
          });
        }
      }

      this.setData({ loading: false, pendingDeletes: newPendingDeletes });
      wx.vibrateShort({ type: "heavy" });
      wx.showToast({ title: "预算已保存", icon: "success", duration: 2000 });
      this.loadCategories();
      this.loadBudgets();
    } catch (error) {
      console.error("保存失败:", error);
      this.setData({ loading: false });
      wx.showToast({ title: "保存失败", icon: "none" });
    }
  },

  // ---------- Reset ----------

  onResetBudgets() {
    wx.showModal({
      title: "确认重置",
      content: "确定要清空当前分类下的所有预算金额吗？已标记的删除也会被取消。",
      confirmText: "确定重置",
      cancelText: "取消",
      confirmColor: "#6FCF97",
      success: (res) => {
        if (res.confirm) {
          const { currentTab, pendingDeletes } = this.data;
          const budgetsKey =
            currentTab === "daily" ? "dailyBudgets" :
            currentTab === "monthly" ? "monthlyBudgets" :
            currentTab === "yearly" ? "yearlyBudgets" :
            "financeBudgets";

          // Clear pending deletes for current tab only
          const newPendingDeletes = { ...pendingDeletes };
          delete newPendingDeletes[currentTab];

          this.setData({ [budgetsKey]: {}, currentBudgetValues: {}, pendingDeletes: newPendingDeletes });
          this._refreshTotal();
          wx.vibrateShort({ type: "light" });
          wx.showToast({ title: "已重置", icon: "success" });
        }
      }
    });
  }
});
