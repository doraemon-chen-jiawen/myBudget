const { request } = require('../../utils/request');

Page({
  data: {
    dateRangeMode: false,
    startDate: '',
    endDate: '',
    selectedDate: '',
    amountMode: 'custom',
    customAmount: '',
    dailyBudget: 0,
    selectedCategory: null,
    note: '',
    categories: [],
    loading: false,
    previewDays: 0,
    previewDailyAmount: 0,
    previewTotal: 0,
    previewItems: []
  },

  onLoad() {
    this.loadBackfillSetup();
    this.initDefaultDate();
  },

  async loadBackfillSetup() {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    try {
      const data = await request({
        url: '/backfill/setup',
        method: 'GET',
        data: { userId },
        showLoading: false,
        silent: true
      });

      this.setData({
        dailyBudget: data.dailyBudget || 0,
        categories: data.categories || []
      });

      if (data.categories && data.categories.length > 0) {
        this.setData({ selectedCategory: data.categories[0] });
      }
    } catch (e) {
      console.error('加载补记配置失败', e);
    }
  },

  initDefaultDate() {
    const today = new Date();
    const dateStr = this.formatDate(today);
    this.setData({ selectedDate: dateStr, startDate: dateStr });
    this.calculatePreview();
  },

  formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  onDateRangeModeSwitch(e) {
    const mode = e.currentTarget.dataset.mode;
    const dateRangeMode = mode === 'range';
    this.setData({ dateRangeMode });
    this.calculatePreview();
  },

  onDateChange(e) {
    this.setData({ selectedDate: e.detail.value });
    this.calculatePreview();
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value });
    this.calculatePreview();
  },

  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value });
    this.calculatePreview();
  },

  onAmountModeSwitch(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ amountMode: mode });

    // When switching to budget mode, auto-select the first category as default
    if (mode === 'budget' && this.data.categories && this.data.categories.length > 0) {
      this.setData({ selectedCategory: this.data.categories[0] });
    }

    this.calculatePreview();
  },

  onAmountInput(e) {
    this.setData({ customAmount: e.detail.value });
    this.calculatePreview();
  },

  onSelectCategory(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({ selectedCategory: item });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  calculatePreview() {
    let days = 0;

    if (this.data.dateRangeMode) {
      if (this.data.startDate && this.data.endDate) {
        const start = new Date(this.data.startDate);
        const end = new Date(this.data.endDate);
        days = Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
      }
    } else {
      if (this.data.selectedDate) {
        days = 1;
      }
    }

    let previewItems = [];
    let dailyAmount = 0;

    if (this.data.amountMode === 'custom') {
      dailyAmount = Number(this.data.customAmount) || 0;
    } else {
      // Budget mode: calculate total from all category budgets
      const categories = this.data.categories || [];
      previewItems = categories
        .filter(c => c.budgetAmount > 0)
        .map(c => ({
          categoryKey: c.categoryKey,
          label: c.label,
          icon: c.icon,
          amount: c.budgetAmount,
          totalAmount: c.budgetAmount * days
        }));
      dailyAmount = previewItems.reduce((sum, item) => sum + item.amount, 0);
    }

    const total = days * dailyAmount;

    this.setData({
      previewDays: days,
      previewDailyAmount: dailyAmount,
      previewTotal: total,
      previewItems: previewItems
    });
  },

  async onSubmit() {
    if (!this.validateForm()) return;

    const userId = wx.getStorageSync('userId');
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const data = await request({
        url: '/backfill/create',
        method: 'POST',
        data: {
          userId,
          startDate: this.data.dateRangeMode ? this.data.startDate : this.data.selectedDate,
          endDate: this.data.dateRangeMode ? this.data.endDate : undefined,
          amountMode: this.data.amountMode,
          customAmount: this.data.amountMode === 'custom' ? Number(this.data.customAmount) : undefined,
          categoryKey: this.data.selectedCategory?.categoryKey,
          note: this.data.note || undefined
        },
        loadingTitle: '补记中'
      });

      wx.showModal({
        title: '补记成功',
        content: `已创建 ${data.createdCount} 条补记记录`,
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    } catch (e) {
      console.error('补记失败', e);
    } finally {
      this.setData({ loading: false });
    }
  },

  validateForm() {
    if (!this.data.dateRangeMode) {
      if (!this.data.selectedDate) {
        wx.showToast({ title: '请选择日期', icon: 'none' });
        return false;
      }
    } else {
      if (!this.data.startDate || !this.data.endDate) {
        wx.showToast({ title: '请选择开始和结束日期', icon: 'none' });
        return false;
      }
      if (this.data.startDate > this.data.endDate) {
        wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' });
        return false;
      }
    }

    if (this.data.amountMode === 'custom') {
      if (!this.data.customAmount || Number(this.data.customAmount) <= 0) {
        wx.showToast({ title: '请输入有效金额', icon: 'none' });
        return false;
      }
      // Custom mode requires category selection
      if (!this.data.selectedCategory) {
        wx.showToast({ title: '请选择分类', icon: 'none' });
        return false;
      }
    } else {
      // Budget mode doesn't need category selection (auto-set)
      if (this.data.dailyBudget <= 0) {
        wx.showToast({ title: '日预算未设置', icon: 'none' });
        return false;
      }
    }

    return true;
  }
});
