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
    loading: false
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
        amount: Number(item.amount || 0),
        currentAmount: Number(item.amount || 0)
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
        })
      });
    } catch (error) {
      // 错误提示已在 request 内统一处理，此处不再重复 toast。
    }
  },

  async onTapQuickRecord(event) {
    const { key, amount } = event.currentTarget.dataset;
    const today = formatDate();

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
        amount: Number(item.amount || 0),
        currentAmount: Number(item.amount || 0)
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
        })
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
  }
});
