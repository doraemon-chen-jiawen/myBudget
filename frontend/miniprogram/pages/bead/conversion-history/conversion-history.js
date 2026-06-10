/**
 * 转换记录页面
 * 展示历史图片转换和图纸识别记录
 */
const app = getApp();

Page({
  data: {
    // 转换记录列表
    records: [],
    // 加载状态
    loading: false,
    // 当前页
    page: 1,
    // 每页数量
    pageSize: 20,
    // 是否还有更多
    hasMore: true
  },

  onLoad() {
    this.loadRecords(true);
  },

  // 加载转换记录
  async loadRecords(refresh = false) {
    if (this.data.loading) return;
    if (refresh) {
      this.setData({ page: 1, records: [], hasMore: true });
    }
    if (!this.data.hasMore) return;

    this.setData({ loading: true });

    const userId = app.globalData.userId || wx.getStorageSync('userId');
    const { page, pageSize } = this.data;

    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/bead/conversions`,
        data: { userId, page, pageSize }
      });

      if (res.data.code === 0) {
        const newData = res.data.data;
        const records = refresh ? newData.list : [...this.data.records, ...newData.list];

        this.setData({
          records,
          hasMore: records.length < newData.total,
          page: page + 1
        });
      }
    } catch (err) {
      console.error('加载记录失败:', err);
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 查看记录详情
  viewRecord(e) {
    const id = e.currentTarget.dataset.id;
    // TODO: 跳转到记录详情页，展示完整信息
    wx.showToast({ title: '记录详情页开发中', icon: 'none' });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadRecords(true);
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadRecords();
  },

  // 格式化时间
  formatTime(timeStr) {
    const date = new Date(timeStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  }
});
