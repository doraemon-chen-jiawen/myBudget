Page({
  data: {
    modules: [
      {
        key: 'budget',
        name: '记账助手',
        desc: '日常收支记录与预算管理',
        icon: '💰',
        color: '#6FCF97'
      },
      {
        key: 'bead',
        name: '拼豆助手',
        desc: '图纸浏览、像素转换、豆仓管理',
        icon: '🫘',
        color: '#F2994A'
      }
    ]
  },

  onShow() {
    this.hideTabBar();
  },

  hideTabBar() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ tabs: [] });
    }
  },

  onSelectModule(e) {
    const moduleKey = e.currentTarget.dataset.key;
    wx.setStorageSync('currentModule', moduleKey);

    const routes = {
      budget: '/pages/index/index',
      bead: '/pages/bead/index/index'
    };

    wx.reLaunch({ url: routes[moduleKey] });
  }
});