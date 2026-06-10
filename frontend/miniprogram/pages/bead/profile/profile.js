const ANIMAL_EMOJIS = ['🦊', '🐶', '🐱', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄', '🐝', '🦋'];
function randomAnimal() {
  return ANIMAL_EMOJIS[Math.floor(Math.random() * ANIMAL_EMOJIS.length)];
}

const app = getApp();

Page({
  data: {
    nickname: '',
    avatarAnimal: randomAnimal(),
    menuList: [
      { key: 'ocr', name: '图纸识别', icon: '🔍', desc: '上传图纸识别图例', hasAlert: false },
      { key: 'orderOcr', name: '订单入库', icon: '📦', desc: 'OCR识别订单批量入库', hasAlert: false },
      { key: 'alert', name: '库存预警', icon: '🔔', desc: '设置预警阈值', hasAlert: false },
      { key: 'log', name: '库存日志', icon: '📋', desc: '查看出入库记录', hasAlert: false }
    ],
    hasInventoryAlert: false
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabs();
    }
    this.loadUserInfo();
    this.checkInventoryAlert();
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({
      nickname: userInfo ? userInfo.nickname : '未登录',
      avatarAnimal: randomAnimal()
    });
  },

  async checkInventoryAlert() {
    const userId = app.globalData.userId || wx.getStorageSync('userId');
    if (!userId) return;

    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/bead/inventory`,
        data: { userId }
      });

      if (res.data && res.data.code === 0) {
        const stats = res.data.data.stats;
        const hasAlert = (stats.lowStock || 0) > 0 || (stats.outOfStock || 0) > 0;

        const menuList = this.data.menuList.map(item => {
          if (item.key === 'alert' || item.key === 'log') {
            return { ...item, hasAlert: hasAlert };
          }
          return item;
        });

        this.setData({
          menuList,
          hasInventoryAlert: hasAlert
        });
      }
    } catch (err) {
      console.error('检查库存预警失败:', err);
    }
  },

  onMenuTap(e) {
    const key = e.currentTarget.dataset.key;
    const routes = {
      ocr: '/pages/bead/ocr/ocr',
      orderOcr: '/pages/bead/order-ocr/order-ocr',
      alert: '/pages/bead/alert-settings/alert-settings',
      log: '/pages/bead/inventory-logs/inventory-logs'
    };

    if (routes[key]) {
      wx.navigateTo({ url: routes[key] });
    }
  },

  onSwitchModule() {
    wx.reLaunch({ url: '/pages/portal/portal' });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userId');
          wx.removeStorageSync('token');
          wx.removeStorageSync('loginTime');
          wx.showToast({ title: '已退出登录', icon: 'success' });
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/login/login' });
          }, 1000);
        }
      }
    });
  }
});