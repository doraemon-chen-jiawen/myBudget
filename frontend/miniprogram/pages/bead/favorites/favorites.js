/**
 * 我的收藏页面
 * 展示收藏的图纸，支持取消收藏和设置是否纳入库存统计
 */
const app = getApp();

Page({
  data: {
    // 收藏列表
    favorites: [],
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
    this.loadFavorites(true);
  },

  // 加载收藏列表
  async loadFavorites(refresh = false) {
    if (this.data.loading) return;
    if (refresh) {
      this.setData({ page: 1, favorites: [], hasMore: true });
    }
    if (!this.data.hasMore) return;

    this.setData({ loading: true });

    const userId = app.globalData.userId || wx.getStorageSync('userId');
    const { page, pageSize } = this.data;

    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/bead/favorites`,
        data: { userId, page, pageSize }
      });

      if (res.data.code === 0) {
        const newData = res.data.data;
        const favorites = refresh ? newData.list : [...this.data.favorites, ...newData.list];

        this.setData({
          favorites,
          hasMore: favorites.length < newData.total,
          page: page + 1
        });
      }
    } catch (err) {
      console.error('加载收藏失败:', err);
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 取消收藏
  async removeFavorite(e) {
    const drawingId = e.currentTarget.dataset.id;
    const confirmed = await this.showConfirm('确定要取消收藏吗？');
    if (!confirmed) return;

    const userId = app.globalData.userId || wx.getStorageSync('userId');

    try {
      await wx.request({
        url: `${app.globalData.apiBase}/api/bead/favorites/${drawingId}`,
        method: 'DELETE',
        data: { userId }
      });

      wx.showToast({ title: '已取消收藏', icon: 'success' });
      this.loadFavorites(true);
    } catch (err) {
      console.error('取消收藏失败:', err);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },

  // 跳转详情
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/bead/drawing-detail/drawing-detail?id=${id}`
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadFavorites(true);
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 上拉加载更多
  onReachBottom() {
    this.loadFavorites();
  },

  // 显示确认对话框
  showConfirm(content) {
    return new Promise((resolve) => {
      wx.showModal({
        title: '确认',
        content,
        success: (res) => {
          resolve(res.confirm);
        }
      });
    });
  }
});
