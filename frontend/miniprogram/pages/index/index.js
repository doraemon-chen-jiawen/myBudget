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
    month: "",
    day: "",
    budgetTotal: 0,
    actualTotal: 0,
    remainTotal: 0,
    quickItems: []
  },

  onLoad() {
    const date = formatDate();
    const now = new Date();
    this.setData({
      today: date,
      month: `${now.getMonth() + 1}`.padStart(2, "0"),
      day: `${now.getDate()}`.padStart(2, "0")
    });
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
    return userId ? { userId } : {};
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

      this.setData({
        today: data?.today || today,
        budgetTotal: Number(data?.budgetTotal || 0),
        actualTotal: Number(data?.actualTotal || 0),
        remainTotal: Number(data?.remainTotal || 0),
        quickItems: (data?.quickItems || []).map((item) => ({
          key: item.key,
          label: item.label,
          amount: Number(item.amount || 0),
          count: Number(item.count || 0)
        }))
      });
    } catch (error) {
      // 错误提示已在 request 内统一处理，此处不再重复 toast。
    }
  },

  async onTapQuickRecord(event) {
    const { key } = event.currentTarget.dataset;
    const today = formatDate();

    try {
      const data = await request({
        url: "/home/quick-record",
        method: "POST",
        data: {
          key,
          date: today,
          ...this.buildUserPayload()
        },
        loadingTitle: "记账中"
      });

      wx.showToast({
        title: "已记录",
        icon: "success"
      });

      this.setData({
        today: data?.today || today,
        budgetTotal: Number(data?.budgetTotal || 0),
        actualTotal: Number(data?.actualTotal || 0),
        remainTotal: Number(data?.remainTotal || 0),
        quickItems: (data?.quickItems || []).map((item) => ({
          key: item.key,
          label: item.label,
          amount: Number(item.amount || 0),
          count: Number(item.count || 0)
        }))
      });
    } catch (error) {
      // 错误提示已在 request 内统一处理。
    }
  }
});
