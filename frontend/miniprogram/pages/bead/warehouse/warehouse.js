const { request } = require("../../../utils/request");

Page({
  data: {
    stats: { totalBeads: 0, colorCount: 0, lowStock: 0, outOfStock: 0, statDrawings: 0 },
    inventory: [],
    shortageList: [],
    shortageCount: 0,
    shortageTotal: 0,
    loading: false,

    // 入库弹窗
    showStockIn: false,
    stockInItems: [{ colorCode: '', quantity: '' }],

    // 出库弹窗
    showStockOut: false,
    stockOutItems: [{ colorCode: '', quantity: '' }],

    // 统计范围弹窗
    showStatConfig: false,
    statConversions: []
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabs();
    }
    this.loadInventory();
  },

  async loadInventory() {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;
    this.setData({ loading: true });
    try {
      const data = await request({
        url: '/bead/inventory',
        method: 'GET',
        data: { userId },
        silent: true
      });
      this.setData({
        stats: data.stats || {},
        inventory: data.inventory || [],
        loading: false
      });
      this.loadShortageList();
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  async loadShortageList() {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;
    try {
      const data = await request({
        url: '/bead/inventory/shortage',
        method: 'GET',
        data: { userId },
        silent: true
      });
      const shortageCount = data.length;
      const shortageTotal = data.reduce((sum, item) => sum + item.shortage, 0);
      this.setData({
        shortageList: data,
        shortageCount,
        shortageTotal
      });
    } catch (e) {
      // 缺货列表加载失败不影响主流程
    }
  },

  // ========== 入库 ==========

  onOpenStockIn() {
    this.setData({ showStockIn: true, stockInItems: [{ colorCode: '', quantity: '' }] });
  },

  onAddStockInItem() {
    const items = this.data.stockInItems;
    items.push({ colorCode: '', quantity: '' });
    this.setData({ stockInItems: items });
  },

  onRemoveStockInItem(e) {
    const index = e.currentTarget.dataset.index;
    const items = this.data.stockInItems;
    if (items.length <= 1) return;
    items.splice(index, 1);
    this.setData({ stockInItems: items });
  },

  onStockInInput(e) {
    const { index, field } = e.currentTarget.dataset;
    const items = this.data.stockInItems;
    items[index][field] = e.detail.value;
    this.setData({ stockInItems: items });
  },

  async onSubmitStockIn() {
    const userId = wx.getStorageSync('userId');
    const items = this.data.stockInItems.filter(i => i.colorCode && Number(i.quantity) > 0);
    if (items.length === 0) {
      wx.showToast({ title: '请至少填写一条入库数据', icon: 'none' });
      return;
    }

    try {
      await request({
        url: '/bead/inventory/stock-in',
        method: 'POST',
        data: {
          userId,
          items: items.map(i => ({ colorCode: i.colorCode.toUpperCase(), quantity: Number(i.quantity) })),
          note: '手动入库'
        }
      });
      wx.showToast({ title: '入库成功', icon: 'success' });
      this.setData({ showStockIn: false });
      this.loadInventory();
    } catch (e) {
      wx.showToast({ title: '入库失败', icon: 'none' });
    }
  },

  // ========== 出库 ==========

  onOpenStockOut() {
    this.setData({
      showStockOut: true,
      stockOutItems: [{ colorCode: '', quantity: '' }]
    });
  },

  onAddStockOutItem() {
    const items = this.data.stockOutItems;
    items.push({ colorCode: '', quantity: '' });
    this.setData({ stockOutItems: items });
  },

  onRemoveStockOutItem(e) {
    const index = e.currentTarget.dataset.index;
    const items = this.data.stockOutItems;
    if (items.length <= 1) return;
    items.splice(index, 1);
    this.setData({ stockOutItems: items });
  },

  onStockOutInput(e) {
    const { index, field } = e.currentTarget.dataset;
    const items = this.data.stockOutItems;
    items[index][field] = e.detail.value;
    this.setData({ stockOutItems: items });
  },

  async onSubmitStockOut() {
    const userId = wx.getStorageSync('userId');
    const items = this.data.stockOutItems.filter(i => i.colorCode && Number(i.quantity) > 0);
    if (items.length === 0) {
      wx.showToast({ title: '请至少填写一条出库数据', icon: 'none' });
      return;
    }

    // 二次确认
    const confirm = await new Promise(resolve => {
      wx.showModal({
        title: '确认出库',
        content: `确认出库 ${items.length} 条记录？`,
        confirmColor: '#FF6B6B',
        success: res => resolve(res.confirm)
      });
    });
    if (!confirm) return;

    try {
      await request({
        url: '/bead/inventory/stock-out',
        method: 'POST',
        data: {
          userId,
          items: items.map(i => ({ colorCode: i.colorCode.toUpperCase(), quantity: Number(i.quantity) }))
        }
      });
      wx.showToast({ title: '出库成功', icon: 'success' });
      this.setData({ showStockOut: false });
      this.loadInventory();
    } catch (e) {
      wx.showToast({ title: e.message || '出库失败', icon: 'none' });
    }
  },

  // ========== 订单入库跳转 ==========

  onOpenOcrStockIn() {
    wx.navigateTo({ url: '/pages/bead/order-ocr/order-ocr' });
  },

  // ========== 统计范围 ==========

  async onOpenStatConfig() {
    const userId = wx.getStorageSync('userId');
    try {
      const data = await request({
        url: '/bead/inventory/stat-config',
        method: 'GET',
        data: { userId },
        silent: true
      });
      this.setData({
        showStatConfig: true,
        statConversions: data.conversions || []
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onCloseStatConfig() {
    this.setData({ showStatConfig: false });
  },

  onToggleStatConversion(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.statConversions;
    list[index].isStat = list[index].isStat ? 0 : 1;
    this.setData({ statConversions: list });
  },

  async onSaveStatConfig() {
    const userId = wx.getStorageSync('userId');
    const configs = [];
    this.data.statConversions.forEach(c => {
      if (c.isStat) configs.push({ conversionId: c.id, isStat: 1 });
    });

    try {
      await request({
        url: '/bead/inventory/stat-config',
        method: 'POST',
        data: { userId, configs }
      });
      wx.showToast({ title: '统计范围已更新', icon: 'success' });
      this.setData({ showStatConfig: false });
      this.loadInventory();
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    }
  },

  onCloseStockIn() {
    this.setData({ showStockIn: false });
  },

  onCloseStockOut() {
    this.setData({ showStockOut: false });
  }
});