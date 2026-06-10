/**
 * 库存日志页面
 * 展示所有出入库记录，支持筛选和分页
 */
const app = getApp();

Page({
  data: {
    // 日志列表
    logs: [],
    // 当前页
    page: 1,
    // 每页数量
    pageSize: 20,
    // 总数
    total: 0,
    // 筛选类型：all/in/out
    filterType: 'all',
    // 加载状态
    loading: false,
    // 是否还有更多
    hasMore: true
  },

  onLoad() {
    this.loadLogs();
  },

  // 加载日志
  async loadLogs(refresh = false) {
    if (this.data.loading) return;
    if (refresh) {
      this.setData({ page: 1, logs: [], hasMore: true });
    }
    if (!this.data.hasMore) return;

    this.setData({ loading: true });

    const userId = app.globalData.userId || wx.getStorageSync('userId');
    const { page, pageSize, filterType } = this.data;

    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/bead/inventory/logs`,
        data: {
          userId,
          page,
          pageSize,
          type: filterType === 'all' ? null : filterType
        }
      });

      if (res.data.code === 0) {
        const newData = res.data.data;
        const logs = refresh ? newData.list : [...this.data.logs, ...newData.list];

        this.setData({
          logs,
          total: newData.total,
          hasMore: logs.length < newData.total,
          page: page + 1
        });
      }
    } catch (err) {
      console.error('加载日志失败:', err);
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 切换筛选类型
  switchFilter(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ filterType: type });
    this.loadLogs(true);
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadLogs(true);
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadLogs();
  },

  // 格式化时间
  formatTime(timeStr) {
    const date = new Date(timeStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  },

  // 获取类型标签
  getTypeLabel(type) {
    return type === 'in' ? '入库' : '出库';
  },

  // 获取来源标签
  getSourceLabel(source) {
    const map = {
      'manual': '手动',
      'order': '订单'
    };
    return map[source] || source;
  }
});
