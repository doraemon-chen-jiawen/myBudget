const { request } = require("../../utils/request");

Page({
  data: {
    currentTab: "monthly",
    categories: { monthly: [], yearly: [] },
    budgetCategories: [],
    currentBudgetValues: {},
    budgetTotal: "0",
    monthlyTotal: "0",
    yearlyTotal: "0",
    daysInMonth: 30,
    monthlyBudgets: {},
    yearlyBudgets: {},
    budgetIds: {},
    loading: false,
    showEditModal: false,
    editItem: null,
    editForm: { label: "", amount: "" },
    showAddModal: false,
    addForm: { key: "", label: "", amount: "" },
    pendingDeletes: {
      monthly: {},
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

  async loadCategories() {
    const userId = Number(wx.getStorageSync("userId"));
    if (!userId) return;

    try {
      const allCategories = await request({
        url: "/income-categories",
        method: "GET",
        data: { userId },
        silent: true
      });

      const categories = { monthly: [], yearly: [] };
      allCategories.forEach(cat => {
        const pt = cat.period_type;
        if (categories[pt]) {
          categories[pt].push(this._mapCategory(cat));
        }
      });

      this.setData({ categories });
      this._updateVisibleData();
    } catch (error) {
      console.error("加载收入分类失败:", error);
    }
  },

  _mapCategory(cat) {
    return {
      id: cat.id,
      key: cat.category_key,
      label: cat.label,
      icon: cat.icon || "💰",
      allowNegative: cat.allow_negative === 1,
      defaultAmount: cat.default_amount != null ? String(cat.default_amount) : "",
      isCustom: cat.is_system === 0
    };
  },

  _updateVisibleData() {
    const { currentTab, categories, monthlyBudgets, yearlyBudgets } = this.data;
    const list = categories[currentTab] || [];
    const values = currentTab === "monthly" ? monthlyBudgets : yearlyBudgets;

    const validKeys = (cats) => new Set(cats.map(c => c.key));
    const monthlyKeys = validKeys(categories.monthly || []);
    const yearlyKeys = validKeys(categories.yearly || []);
    const monthlySum = this._sumByKeys(monthlyBudgets, monthlyKeys);
    const yearlySum = this._sumByKeys(yearlyBudgets, yearlyKeys);
    const tabSum = this._sumByKeys(values, validKeys(list));
    let budgetTotal = tabSum;

    this.setData({
      budgetCategories: list,
      currentBudgetValues: { ...values },
      budgetTotal: this._fmt(budgetTotal),
      monthlyTotal: this._fmt(monthlySum),
      yearlyTotal: this._fmt(yearlySum)
    });
  },

  _sumByKeys(values, keySet) {
    let sum = 0;
    if (!keySet || keySet.size === 0) return sum;
    for (const k of keySet) {
      const n = Number(values[k]);
      if (!isNaN(n)) sum += n;
    }
    return sum;
  },

  _fmt(n) {
    return n % 1 === 0 ? String(n) : n.toFixed(2);
  },

  async loadBudgets() {
    const userId = Number(wx.getStorageSync("userId"));
    if (!userId) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }

    try {
      this.setData({ loading: true });

      const [monthlyData, yearlyData] = await Promise.all([
        request({ url: "/income-budgets", method: "GET", data: { userId, periodType: "monthly" } }),
        request({ url: "/income-budgets", method: "GET", data: { userId, periodType: "yearly" } })
      ]);

      const monthlyBudgets = {};
      const yearlyBudgets = {};
      const budgetIds = {};

      monthlyData.forEach(item => {
        const key = this._parseKey(item.period_key);
        monthlyBudgets[key] = item.planned_amount;
        budgetIds[`monthly_${key}`] = item.id;
      });

      yearlyData.forEach(item => {
        const key = this._parseKey(item.period_key);
        yearlyBudgets[key] = item.planned_amount;
        budgetIds[`yearly_${key}`] = item.id;
      });

      this.setData({
        monthlyBudgets, yearlyBudgets, budgetIds,
        loading: false,
        pendingDeletes: { monthly: {}, yearly: {} }
      });
      this._updateVisibleData();
    } catch (error) {
      console.error("加载收入预算失败:", error);
      this.setData({ loading: false });
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },

  _parseKey(pk) {
    if (!pk) return pk;
    const i = pk.indexOf("_");
    return i >= 0 ? pk.substring(i + 1) : pk;
  },

  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({ currentTab: tab });
    this._updateVisibleData();
    wx.vibrateShort({ type: "light" });
  },

  onBudgetInput(e) {
    const { category } = e.currentTarget.dataset;
    const value = e.detail.value;
    const budgets = this.data.currentTab === "monthly" ? "monthlyBudgets" : "yearlyBudgets";
    this.setData({
      [`${budgets}.${category}`]: value,
      [`currentBudgetValues.${category}`]: value
    });
    this._refreshTotal();
  },

  _refreshTotal() {
    const { currentTab, currentBudgetValues, budgetCategories } = this.data;
    const validKeys = (cats) => new Set(cats.map(c => c.key));
    const tabSum = this._sumByKeys(currentBudgetValues, validKeys(budgetCategories));
    this.setData({ budgetTotal: this._fmt(tabSum) });
  },

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

      if (editItem.isCustom && editItem.id) {
        await request({
          url: `/income-categories/${editItem.id}`,
          method: "PUT",
          data: { userId, label: editForm.label.trim() }
        });
      }

      if (editForm.amount) {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const yearKey = `${now.getFullYear()}`;
        const periodType = currentTab;
        const budgetKey = `${periodType}_${editItem.key}`;
        const budgetId = this.data.budgetIds[budgetKey];

        const budgetData = {
          userId,
          periodType,
          periodKey: budgetKey,
          plannedAmount: Number(editForm.amount),
          budgetMonth: periodType === "monthly" ? monthKey : undefined,
          budgetYear: periodType === "yearly" ? yearKey : undefined
        };

        if (budgetId) {
          await request({ url: `/income-budgets/${budgetId}`, method: "PUT", data: budgetData });
        } else {
          await request({ url: "/income-budgets", method: "POST", data: budgetData });
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

  onDeleteBudget(e) {
    const { category } = e.currentTarget.dataset;
    const { currentTab, budgetIds, budgetCategories } = this.data;
    const budgetKey = `${currentTab}_${category}`;
    const budgetId = budgetIds[budgetKey];
    const catItem = budgetCategories.find(c => c.key === category);

    wx.showModal({
      title: "确认删除",
      content: "删除后将保存时生效，确定要删除此预算吗？",
      confirmColor: "#FF6B6B",
      success: (res) => {
        if (res.confirm) {
          const pendingDeletes = { ...this.data.pendingDeletes };
          pendingDeletes[currentTab] = pendingDeletes[currentTab] || {};
          pendingDeletes[currentTab][category] = {
            categoryId: catItem?.isCustom ? catItem.id : null,
            budgetId: budgetId
          };

          const budgetsKey = currentTab === "monthly" ? "monthlyBudgets" : "yearlyBudgets";

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

  onOpenAddModal() {
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

    try {
      this.setData({ loading: true });

      const newCat = await request({
        url: "/income-categories",
        method: "POST",
        data: {
          userId,
          periodType: currentTab,
          label: addForm.label.trim(),
          defaultAmount: addForm.amount ? Number(addForm.amount) : null,
          allowNegative: false
        }
      });

      if (addForm.amount) {
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const yearKey = `${now.getFullYear()}`;

        await request({
          url: "/income-budgets",
          method: "POST",
          data: {
            userId,
            periodType: currentTab,
            periodKey: `${currentTab}_${newCat.category_key}`,
            budgetMonth: currentTab === "monthly" ? monthKey : undefined,
            budgetYear: currentTab === "yearly" ? yearKey : undefined,
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
      wx.showToast({ title: "添加失败", icon: "none" });
    }
  },

  async onSaveBudgets() {
    const userId = Number(wx.getStorageSync("userId"));
    if (!userId) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }

    const { currentTab, monthlyBudgets, yearlyBudgets, budgetIds, pendingDeletes } = this.data;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const yearKey = `${now.getFullYear()}`;

    try {
      this.setData({ loading: true });

      const currentPendingDeletes = pendingDeletes[currentTab] || {};
      for (const [key, deleteInfo] of Object.entries(currentPendingDeletes)) {
        if (deleteInfo.budgetId) {
          try {
            await request({ url: `/income-budgets/${deleteInfo.budgetId}`, method: "DELETE", data: { userId } });
          } catch (error) {
            console.error("删除预算失败:", key, error);
          }
        }
        if (deleteInfo.categoryId) {
          try {
            await request({ url: `/income-categories/${deleteInfo.categoryId}`, method: "DELETE", data: { userId } });
          } catch (error) {
            console.error("删除分类失败:", key, error);
          }
        }
      }

      const newPendingDeletes = { ...pendingDeletes };
      delete newPendingDeletes[currentTab];

      const budgets = currentTab === "monthly" ? monthlyBudgets : yearlyBudgets;

      for (const [key, amount] of Object.entries(budgets)) {
        if (!amount && !newPendingDeletes[currentTab]?.[key]) continue;

        const budgetKey = `${currentTab}_${key}`;
        const budgetId = budgetIds[budgetKey];
        const periodKey = `${currentTab}_${key}`;

        const budgetData = {
          userId,
          periodType: currentTab,
          periodKey,
          plannedAmount: Number(amount) || 0,
          budgetMonth: currentTab === "monthly" ? monthKey : undefined,
          budgetYear: currentTab === "yearly" ? yearKey : undefined
        };

        if (budgetId) {
          await request({ url: `/income-budgets/${budgetId}`, method: "PUT", data: budgetData });
        } else if (amount) {
          await request({ url: "/income-budgets", method: "POST", data: budgetData });
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

  onResetBudgets() {
    wx.showModal({
      title: "确认重置",
      content: "确定要清空当前分类下的所有预算金额吗？",
      confirmText: "确定重置",
      cancelText: "取消",
      confirmColor: "#6FCF97",
      success: (res) => {
        if (res.confirm) {
          const { currentTab, pendingDeletes } = this.data;
          const budgetsKey = currentTab === "monthly" ? "monthlyBudgets" : "yearlyBudgets";
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
