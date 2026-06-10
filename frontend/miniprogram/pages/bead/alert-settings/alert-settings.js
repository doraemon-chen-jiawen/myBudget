/**
 * 库存预警设置页面
 * 设置低库存阈值和缺货阈值
 */
const app = getApp();

Page({
  data: {
    // 低库存阈值
    lowStockThreshold: 50,
    // 缺货阈值
    outOfStockThreshold: 0,
    // 加载状态
    loading: false
  },

  onLoad() {
    this.loadSettings();
  },

  // 加载当前设置
  async loadSettings() {
    const userId = app.globalData.userId || wx.getStorageSync('userId');

    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/bead/inventory/alert-settings`,
        data: { userId }
      });

      if (res.data.code === 0) {
        const settings = res.data.data;
        this.setData({
          lowStockThreshold: settings.low_stock_threshold || 50,
          outOfStockThreshold: settings.out_of_stock_threshold || 0
        });
      }
    } catch (err) {
      console.error('加载设置失败:', err);
    }
  },

  // 低库存阈值输入
  onLowStockChange(e) {
    this.setData({
      lowStockThreshold: parseInt(e.detail.value) || 0
    });
  },

  // 缺货阈值输入
  onOutOfStockChange(e) {
    this.setData({
      outOfStockThreshold: parseInt(e.detail.value) || 0
    });
  },

  // 保存设置
  async saveSettings() {
    const { lowStockThreshold, outOfStockThreshold } = this.data;

    if (lowStockThreshold < 0 || outOfStockThreshold < 0) {
      wx.showToast({ title: '阈值不能为负数', icon: 'none' });
      return;
    }

    if (lowStockThreshold <= outOfStockThreshold) {
      wx.showToast({ title: '低库存阈值应大于缺货阈值', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const userId = app.globalData.userId || wx.getStorageSync('userId');
      await wx.request({
        url: `${app.globalData.apiBase}/api/bead/inventory/alert-settings`,
        method: 'POST',
        data: {
          userId,
          lowStockThreshold,
          outOfStockThreshold
        }
      });

      wx.showToast({ title: '设置已保存', icon: 'success' });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      console.error('保存设置失败:', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  }
});
