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
    dailyQuote: "",
    quoteType: "", // "good" or "bad"
    // "其他"项的模态框
    showOtherModal: false,
    otherForm: { amount: "", note: "", selectedCategory: null },
    // 可选分类数据
    monthlyCategories: [],
    yearlyCategories: []
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
    this.loadUserFamilies();
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

    try {
      await request({
        url: "/auto-fill/run",
        method: "POST",
        data: this.buildUserPayload(),
        loadingTitle: "自动补记中"
      });
    } catch (error) {
      // 自动补记失败时仍尝试刷新首页数据，避免页面空白。
    }

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

      this.updateQuote();
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

      // Reset calibrated amount to default after recording
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

  updateQuote() {
    const { remainTotal, monthRemainTotal } = this.data;
    const isUnderBudget = remainTotal >= 0 && monthRemainTotal >= 0;

    const goodQuotes = [
      "省钱是通往自由的第一步",
      "克制是一种高级的自由",
      "今天省下的每一分，都是未来的底气",
      "自律即富裕",
      "钱包鼓了，腰杆就直了",
      "省到就是赚到",
      "克制消费，是一种优雅的自律"
    ];

    const badQuotes = [
      "钱不是万能的，但没钱是万万不能的",
      "你花的不是钱，是未来的自由",
      "别让钱包为冲动买单",
      "今天买买买，明天吃土土",
      "每一笔多余的花销，都是明天的后悔",
      "手痒痒的时候，看看余额",
      "省钱不丢人，月光才尴尬"
    ];

    const pool = isUnderBudget ? goodQuotes : badQuotes;
    const dayIndex = new Date().getDate() % pool.length;
    this.setData({
      dailyQuote: pool[dayIndex],
      quoteType: isUnderBudget ? "good" : "bad"
    });
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

      this.onCloseOtherModal();

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
    } catch (error) {
      // 错误提示已在 request 内统一处理。
    }
  }
});
