const { request } = require("../../utils/request");

function formatDate(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

Page({
  data: {
    today: "",
    year: "",
    month: "",
    day: "",
    weekday: "",
    budgetTotal: 0,
    actualTotal: 0,
    remainTotal: 0,
    monthBudgetTotal: 0,
    monthActualTotal: 0,
    monthRemainTotal: 0,
    quickItems: [],
    familyGroups: [],
    selectedFamilyIndex: -1,
    showFamilySelector: false,
    loading: false,
    visibleIngots: 15,
    isOverBudget: false,
    showFlyingAnimation: false,
    showBrokeAnimation: false,
    ingots: [
      { x: -8, y: 105, r: -18, s: 1.0, z: 1 },
      { x: 18, y: 115, r: 28, s: 1.0, z: 1 },
      { x: 42, y: 102, r: -10, s: 1.0, z: 1 },
      { x: 64, y: 112, r: 35, s: 1.0, z: 1 },
      { x: 88, y: 108, r: -25, s: 1.0, z: 1 },
      { x: 5, y: 82, r: 22, s: 0.95, z: 2 },
      { x: 30, y: 78, r: -30, s: 0.95, z: 2 },
      { x: 55, y: 88, r: 15, s: 0.95, z: 2 },
      { x: 78, y: 80, r: -20, s: 0.95, z: 2 },
      { x: 15, y: 58, r: -15, s: 0.9, z: 3 },
      { x: 42, y: 54, r: 25, s: 0.9, z: 3 },
      { x: 65, y: 62, r: -28, s: 0.9, z: 3 },
      { x: 28, y: 35, r: 20, s: 0.85, z: 4 },
      { x: 55, y: 38, r: -12, s: 0.85, z: 4 },
      { x: 40, y: 15, r: -8, s: 0.8, z: 5 }
    ],
    showOtherModal: false,
    otherForm: { amount: "", note: "", selectedCategory: null },
    monthlyCategories: [],
    yearlyCategories: [],
    // 收入登记相关
    showIncomeModal: false,
    incomeCategories: [],
    incomeForm: { categoryKey: "", label: "", amount: "", note: "" },
    selectedIncomeCategory: null
  },

  onLoad() {
    const date = formatDate();
    const now = new Date();
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    this.setData({
      today: date,
      year: now.getFullYear(),
      month: `${now.getMonth() + 1}`.padStart(2, "0"),
      day: `${now.getDate()}`.padStart(2, "0"),
      weekday: weekdays[now.getDay()]
    });
    // this.loadUserFamilies();
  },

  async loadUserFamilies() {
    const { familyAPI } = require("../../utils/family");
    try {
      const families = await familyAPI.getUserFamilies();
      this.setData({
        familyGroups: families,
        selectedFamilyIndex: families.length > 0 ? 0 : -1
      });
    } catch (error) {
      console.error("加载家庭群组失败:", error);
    }
  },

  async onShow() {
    await this.runAutoFillAndRefresh();
  },

  getUserId() {
    const id = Number(wx.getStorageSync("userId"));
    return Number.isFinite(id) && id > 0 ? id : null;
  },

  buildUserPayload() {
    const userId = this.getUserId();
    const payload = userId ? { userId } : {};
    if (this.data.selectedFamilyIndex >= 0 && this.data.familyGroups.length > 0) {
      const family = this.data.familyGroups[this.data.selectedFamilyIndex];
      payload.familyGroupId = family.id;
    }
    return payload;
  },

  onSwitchFamily(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedFamilyIndex: index, showFamilySelector: false });
    const today = formatDate();
    this.refreshTodayData(today);
  },

  onToggleFamilySelector() {
    this.setData({ showFamilySelector: !this.data.showFamilySelector });
  },

  async runAutoFillAndRefresh() {
    const today = formatDate();

    // try {
    //   await request({
    //     url: "/auto-fill/run",
    //     method: "POST",
    //     data: this.buildUserPayload(),
    //     loadingTitle: "自动补记中"
    //   });
    // } catch (error) {
    //   // 自动补记失败时仍尝试刷新首页数据，避免页面空白。
    // }

    await this.refreshTodayData(today);
  },

  async refreshTodayData(today) {
    try {
      const data = await request({
        url: "/home/index",
        method: "GET",
        data: {
          date: today,
          ...this.buildUserPayload()
        },
        loadingTitle: "加载首页"
      });

      const newQuickItems = (data?.quickItems || []).map((item) => ({
        key: item.key,
        label: item.label,
        icon: item.icon || "",
        amount: Number(item.amount || 0),
        currentAmount: Number(item.amount || 0),
        isOther: item.key === "other" ? true : (item.isOther || false)
      }));

      // Merge with existing calibrated amounts
      const existingItems = this.data.quickItems || [];
      const existingMap = {};
      for (const ei of existingItems) {
        existingMap[ei.key] = ei.currentAmount;
      }

      this.setData({
        today: data?.today || today,
        budgetTotal: Number(data?.budgetTotal || 0),
        actualTotal: Number(data?.actualTotal || 0),
        remainTotal: Number(data?.remainTotal || 0),
        monthBudgetTotal: Number(data?.monthBudgetTotal || 0),
        monthActualTotal: Number(data?.monthActualTotal || 0),
        monthRemainTotal: Number(data?.monthRemainTotal || 0),
        quickItems: newQuickItems.map((item) => {
          if (existingMap[item.key] !== undefined && existingMap[item.key] !== item.amount) {
            item.currentAmount = existingMap[item.key];
          }
          return item;
        }),
        monthlyCategories: data?.monthlyCategories || [],
        yearlyCategories: data?.yearlyCategories || []
      });

      this.updateTreasure();
    } catch (error) {
      // 错误提示已在 request 内统一处理，此处不再重复 toast。
    }
  },

  async onTapQuickRecord(event) {
    const { key, amount, isOther } = event.currentTarget.dataset;
    const today = formatDate();

    // 如果是"其他"项，显示模态框让用户选择分类或输入金额和备注
    if (key === "other" || isOther === true || isOther === "true") {
      this.setData({
        showOtherModal: true,
        otherForm: { amount: "", note: "", selectedCategory: null }
      });
      return;
    }

    try {
      const data = await request({
        url: "/home/quick-record",
        method: "POST",
        data: {
          key,
          amount: Number(amount),
          date: today,
          ...this.buildUserPayload()
        },
        loadingTitle: "记账中"
      });

      // Save first record date if not set
      if (!wx.getStorageSync("firstRecordDate")) {
        wx.setStorageSync("firstRecordDate", formatDate());
      }

      wx.showToast({
        title: `已记录 ¥${amount}`,
        icon: "success"
      });

      this.triggerFlyingAnimation();
      const items = this.data.quickItems.map((item) => {
        if (item.key === key) {
          return { ...item, currentAmount: item.amount };
        }
        return item;
      });

      const newQuickItems = (data?.quickItems || []).map((item) => ({
        key: item.key,
        label: item.label,
        icon: item.icon || "",
        amount: Number(item.amount || 0),
        currentAmount: Number(item.amount || 0),
        isOther: item.key === "other" ? true : (item.isOther || false)
      }));

      const existingMap = {};
      for (const ei of items) {
        existingMap[ei.key] = ei.currentAmount;
      }

      this.setData({
        today: data?.today || today,
        budgetTotal: Number(data?.budgetTotal || 0),
        actualTotal: Number(data?.actualTotal || 0),
        remainTotal: Number(data?.remainTotal || 0),
        monthBudgetTotal: Number(data?.monthBudgetTotal || 0),
        monthActualTotal: Number(data?.monthActualTotal || 0),
        monthRemainTotal: Number(data?.monthRemainTotal || 0),
        quickItems: newQuickItems.map((item) => {
          if (existingMap[item.key] !== undefined && existingMap[item.key] !== item.amount) {
            item.currentAmount = existingMap[item.key];
          }
          return item;
        }),
        monthlyCategories: data?.monthlyCategories || [],
        yearlyCategories: data?.yearlyCategories || []
      });

      this.updateTreasure();
    } catch (error) {
      // 错误提示已在 request 内统一处理。
    }
  },

  onCalibrate(event) {
    const { key, delta } = event.currentTarget.dataset;
    const deltaNum = Number(delta);
    const items = this.data.quickItems.map((item) => {
      if (item.key === key) {
        const newAmount = Math.max(0, item.currentAmount + deltaNum);
        return { ...item, currentAmount: newAmount };
      }
      return item;
    });
    this.setData({ quickItems: items });
    wx.vibrateShort({ type: "light" });
  },

  updateTreasure() {
    const { remainTotal, budgetTotal } = this.data;
    const isOverBudget = remainTotal < 0;
    if (isOverBudget) {
      this.setData({ isOverBudget: true, visibleIngots: 0 });
      return;
    }
    const ratio = budgetTotal > 0 ? Math.max(0, Math.min(1, remainTotal / budgetTotal)) : 0;
    // <10% 只留 1 个元宝
    const visibleIngots = ratio < 0.1 ? 1 : (5 + Math.round(ratio * 10));
    this.setData({ isOverBudget: false, visibleIngots });
  },

  triggerFlyingAnimation() {
    if (this.data.isOverBudget) {
      // 透支时显示"穷鬼别花了"抖动文字
      this.setData({ showBrokeAnimation: true });
      wx.vibrateShort({ type: "heavy" });
      setTimeout(() => {
        this.setData({ showBrokeAnimation: false });
      }, 1200);
      return;
    }
    this.setData({ showFlyingAnimation: true });
    wx.vibrateShort({ type: "heavy" });
    setTimeout(() => {
      this.setData({ showFlyingAnimation: false });
    }, 1200);
  },

  // "其他"项模态框处理
  onOtherFormInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`otherForm.${field}`]: e.detail.value });
  },

  // 选择分类
  onSelectCategory(e) {
    const dataset = e.currentTarget.dataset;
    const category = {
      key: dataset.key,
      label: dataset.label,
      icon: dataset.icon,
      defaultAmount: Number(dataset.defaultAmount) || 0
    };

    this.setData({
      otherForm: {
        ...this.data.otherForm,
        selectedCategory: category,
        amount: category.defaultAmount > 0 ? category.defaultAmount.toString() : "",
        note: category.key === 'other' ? this.data.otherForm.note : ""
      }
    });
  },

  onCloseOtherModal() {
    this.setData({
      showOtherModal: false,
      otherForm: { amount: "", note: "", selectedCategory: null }
    });
  },

  async onSaveOtherRecord() {
    const { otherForm } = this.data;
    const amount = Number(otherForm.amount);
    const note = otherForm.note?.trim();

    // 检查是否选择了分类
    if (!otherForm.selectedCategory) {
      wx.showToast({ title: "请先选择分类", icon: "none" });
      return;
    }

    // 检查金额
    if (!amount || amount <= 0) {
      wx.showToast({ title: "请输入有效金额", icon: "none" });
      return;
    }

    // 如果选择了"其他"，需要备注
    if (otherForm.selectedCategory.key === 'other' && !note) {
      wx.showToast({ title: "请输入备注", icon: "none" });
      return;
    }

    const today = formatDate();
    const key = otherForm.selectedCategory.key;
    const finalNote = note || "自定义记账";

    try {
      const data = await request({
        url: "/home/quick-record",
        method: "POST",
        data: {
          key,
          amount,
          date: today,
          note: finalNote,
          ...this.buildUserPayload()
        },
        loadingTitle: "记账中"
      });

      // Save first record date if not set
      if (!wx.getStorageSync("firstRecordDate")) {
        wx.setStorageSync("firstRecordDate", formatDate());
      }

      wx.showToast({
        title: `已记录 ¥${amount}`,
        icon: "success"
      });

      this.triggerFlyingAnimation();

      // 更新首页数据
      const newQuickItems = (data?.quickItems || []).map((item) => ({
        key: item.key,
        label: item.label,
        icon: item.icon || "",
        amount: Number(item.amount || 0),
        currentAmount: Number(item.amount || 0),
        isOther: item.key === "other" ? true : (item.isOther || false)
      }));

      this.setData({
        today: data?.today || today,
        budgetTotal: Number(data?.budgetTotal || 0),
        actualTotal: Number(data?.actualTotal || 0),
        remainTotal: Number(data?.remainTotal || 0),
        monthBudgetTotal: Number(data?.monthBudgetTotal || 0),
        monthActualTotal: Number(data?.monthActualTotal || 0),
        monthRemainTotal: Number(data?.monthRemainTotal || 0),
        quickItems: newQuickItems,
        monthlyCategories: data?.monthlyCategories || [],
        yearlyCategories: data?.yearlyCategories || []
      });

      this.updateTreasure();
    } catch (error) {
      // 错误提示已在 request 内统一处理。
    }
  },

  // ---------- 收入登记 ----------

  async onOpenIncomeModal() {
    const userId = Number(wx.getStorageSync("userId"));
    if (!userId) {
      wx.showToast({ title: "请先登录", icon: "none" });
      return;
    }

    try {
      const categories = await request({
        url: "/income-categories",
        method: "GET",
        data: { userId },
        silent: true
      });

      this.setData({
        showIncomeModal: true,
        incomeCategories: categories || [],
        incomeForm: { categoryKey: "", label: "", amount: "", note: "" },
        selectedIncomeCategory: null
      });
    } catch (error) {
      console.error("加载收入分类失败:", error);
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },

  onCloseIncomeModal() {
    this.setData({
      showIncomeModal: false,
      incomeForm: { categoryKey: "", label: "", amount: "", note: "" },
      selectedIncomeCategory: null
    });
  },

  onSelectIncomeCategory(e) {
    const dataset = e.currentTarget.dataset;
    const category = {
      key: dataset.key,
      label: dataset.label,
      icon: dataset.icon || "💰",
      defaultAmount: Number(dataset.defaultAmount) || 0
    };

    this.setData({
      selectedIncomeCategory: category,
      incomeForm: {
        ...this.data.incomeForm,
        categoryKey: category.key,
        label: category.label,
        amount: category.defaultAmount > 0 ? category.defaultAmount.toString() : ""
      }
    });
  },

  onIncomeFormInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`incomeForm.${field}`]: e.detail.value });
  },

  async onSaveIncomeRecord() {
    const { incomeForm, selectedIncomeCategory } = this.data;
    const amount = Number(incomeForm.amount);
    const note = incomeForm.note?.trim();

    if (!selectedIncomeCategory) {
      wx.showToast({ title: "请先选择收入分类", icon: "none" });
      return;
    }

    if (!amount || amount <= 0) {
      wx.showToast({ title: "请输入有效金额", icon: "none" });
      return;
    }

    const userId = Number(wx.getStorageSync("userId"));
    const today = formatDate();

    try {
      await request({
        url: "/records",
        method: "POST",
        data: {
          userId,
          amount,
          recordType: "income",
          category: selectedIncomeCategory.label,
          note: note || "收入登记",
          recordDate: today,
          categoryKey: selectedIncomeCategory.key
        },
        loadingTitle: "登记中"
      });

      wx.showToast({
        title: `已登记 ¥${amount}`,
        icon: "success"
      });

      this.onCloseIncomeModal();
      this.refreshTodayData(today);
    } catch (error) {
      console.error("收入登记失败:", error);
      wx.showToast({ title: "登记失败", icon: "none" });
    }
  }
});
