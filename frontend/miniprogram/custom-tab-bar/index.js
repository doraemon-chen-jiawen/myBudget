Component({
  data: {
    currentModule: '', // 'budget' | 'bead'
    activeTab: 0,
    tabs: []
  },

  lifetimes: {
    attached() {
      this.initTabs();
    }
  },

  pageLifetimes: {
    show() {
      this.initTabs();
    }
  },

  methods: {
    initTabs() {
      const currentModule = wx.getStorageSync('currentModule') || 'budget';
      const tabConfig = {
        budget: [
          { pagePath: '/pages/index/index', text: '首页', icon: '🏠', activeIcon: '🏠' },
          { pagePath: '/pages/profile/profile', text: '我的', icon: '👤', activeIcon: '👤' }
        ],
        bead: [
          { pagePath: '/pages/bead/index/index', text: '首页', icon: '📊', activeIcon: '📊' },
          { pagePath: '/pages/bead/warehouse/warehouse', text: '豆仓', icon: '🫘', activeIcon: '🫘' },
          { pagePath: '/pages/bead/drawing/drawing', text: '图纸', icon: '📐', activeIcon: '📐' },
          { pagePath: '/pages/bead/profile/profile', text: '我的', icon: '👤', activeIcon: '👤' }
        ]
      };

      const tabs = tabConfig[currentModule] || tabConfig.budget;

      // 确定当前激活的 tab
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const currentPath = currentPage ? '/' + currentPage.route : '';
      let activeTab = tabs.findIndex(tab => tab.pagePath === currentPath);
      if (activeTab === -1) activeTab = 0;

      this.setData({ currentModule, tabs, activeTab });
    },

    onTabTap(e) {
      const index = e.currentTarget.dataset.index;
      const tab = this.data.tabs[index];
      if (index === this.data.activeTab) return;

      wx.switchTab({ url: tab.pagePath });
    }
  }
});