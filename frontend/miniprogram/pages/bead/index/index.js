const { request } = require("../../../utils/request");
const app = getApp();

Page({
  data: {
    stats: {
      totalQuantity: 0,
      colorCount: 0,
      lowStock: 0,
      outOfStock: 0
    },
    hasAlert: false,
    loading: true
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabs();
    }
    this.loadStats();
  },

  async loadStats() {
    const userId = app.globalData.userId || wx.getStorageSync('userId');
    if (!userId) {
      this.setData({ loading: false });
      return;
    }

    try {
      const data = await request({
        url: '/bead/inventory',
        method: 'GET',
        data: { userId },
        silent: true
      });

      const stats = data.stats || data;
      const hasAlert = (stats.lowStock || 0) > 0 || (stats.outOfStock || 0) > 0;

      this.setData({
        stats: {
          totalQuantity: stats.totalQuantity || 0,
          colorCount: stats.colorCount || 0,
          lowStock: stats.lowStock || 0,
          outOfStock: stats.outOfStock || 0
        },
        hasAlert,
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  goToWarehouse() {
    wx.switchTab({ url: '/pages/bead/warehouse/warehouse' });
  },

  goToOcr() {
    wx.navigateTo({ url: '/pages/bead/ocr/ocr' });
  },

  onPullDownRefresh() {
    this.loadStats().then(() => wx.stopPullDownRefresh());
  }
});