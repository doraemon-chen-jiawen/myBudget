const { request } = require("../../../utils/request");

Page({
  data: {
    sizes: [
      { key: '', label: '全部' },
      { key: '58x58', label: '58×58' },
      { key: '58x87', label: '58×87' },
      { key: '58x116', label: '58×116' },
      { key: '87x116', label: '87×116' }
    ],
    selectedSize: '',
    assembledOptions: [
      { key: '', label: '全部' },
      { key: '0', label: '未拼接' },
      { key: '1', label: '已完成' }
    ],
    selectedAssembled: '',
    drawingList: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    hasMore: true
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabs();
    }
    this.loadDrawings(true);
  },

  async loadDrawings(refresh = false) {
    if (this.data.loading) return;
    const page = refresh ? 1 : this.data.page;
    if (!refresh && !this.data.hasMore) return;

    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    this.setData({ loading: true });
    try {
      const params = {
        userId,
        page,
        pageSize: this.data.pageSize
      };
      if (this.data.selectedSize) params.size = this.data.selectedSize;
      if (this.data.selectedAssembled !== '') params.isAssembled = this.data.selectedAssembled;

      const result = await request({
        url: '/bead/conversions/enhanced',
        method: 'GET',
        data: params,
        silent: true
      });

      const list = (result.list || []).map(item => {
        if (item.pixel_image && !item.pixel_image.startsWith('http')) {
          item.pixel_image = getApp().globalData.apiBaseUrl + item.pixel_image;
        }
        return item;
      });
      const mergedList = refresh ? list : [...this.data.drawingList, ...list];
      this.setData({
        drawingList: mergedList,
        total: result.total || 0,
        page: page + 1,
        hasMore: list.length < (result.total || 0),
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  onSizeTap(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ selectedSize: key });
    this.loadDrawings(true);
  },

  onAssembledTap(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ selectedAssembled: key });
    this.loadDrawings(true);
  },

  onDrawingTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/bead/drawing-detail/drawing-detail?id=${id}&source=conversion` });
  },

  onCreateDrawing() {
    wx.navigateTo({ url: '/pages/bead/ocr/ocr' });
  },

  async onDeleteDrawing(e) {
    const id = e.currentTarget.dataset.id;
    const res = await new Promise(resolve => {
      wx.showModal({
        title: '确认删除',
        content: '删除后无法恢复，确定删除这张图纸吗？',
        confirmColor: '#FF6B6B',
        success: resolve
      });
    });

    if (!res.confirm) return;

    try {
      await request({
        url: `/bead/conversions/${id}`,
        method: 'DELETE'
      });
      wx.showToast({ title: '已删除', icon: 'success' });
      this.loadDrawings(true);
    } catch (err) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  onPullDownRefresh() {
    this.loadDrawings(true).then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadDrawings();
  }
});