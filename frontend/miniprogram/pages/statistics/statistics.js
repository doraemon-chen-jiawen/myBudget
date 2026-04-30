const { request } = require("../../utils/request");

Page({
  data: {
    dimension: "month",
    dimensionTabs: [
      { key: "day", label: "日" },
      { key: "week", label: "周" },
      { key: "month", label: "月" },
      { key: "year", label: "年" }
    ],
    activeDimIndex: 2,
    currentDate: "",
    dateLabel: "",
    summary: { budgetTotal: 0, actualTotal: 0, incomeTotal: 0, remainTotal: 0, balanceTotal: 0 },
    categories: [],
    familyMembers: [],
    selectedMemberIndex: 0,
    familyGroupId: null,
    loading: false,
    showCalendar: false,
    showBarChart: false,
    calendarYear: 0,
    calendarMonth: 0,
    calendarData: [],
    dailyBudget: 0,
    barChartYear: 0,
    barChartData: [],
    barChartMaxAmount: 0,
    selectedDate: null,
    dayDetail: null,
    showCalendarPicker: false
  },

  async onLoad() {
    const now = new Date();
    const currentDate = this.formatDate(now);
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    this.setData({
      currentDate,
      dateLabel: `${year}年${month}月`,
      calendarYear: year,
      calendarMonth: month,
      barChartYear: year,
      showCalendar: false,
      showBarChart: false
    });
    await this.loadFamilyInfo();
    this.loadStatistics();
    this.loadCalendarData();
  },

  formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  },

  parseDate(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return new Date();
  },

  getDateLabel() {
    const { dimension, currentDate } = this.data;
    if (dimension === 'day') {
      return currentDate;
    } else if (dimension === 'month') {
      const parts = currentDate.split('-');
      return `${parts[0]}年${parseInt(parts[1])}月`;
    } else if (dimension === 'year') {
      return currentDate.split('-')[0] + '年';
    } else if (dimension === 'week') {
      const d = this.parseDate(currentDate);
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      const formatD = (date) => `${date.getMonth() + 1}/${date.getDate()}`;
      return `${formatD(startOfWeek)}-${formatD(endOfWeek)}`;
    }
    return currentDate;
  },

  async loadFamilyInfo() {
    const userId = wx.getStorageSync("userId");
    if (!userId) return;
    try {
      const groups = await request({
        url: "/family-groups",
        method: "GET",
        data: { userId },
        showLoading: false,
        silent: true
      });
      if (groups && groups.length > 0) {
        const group = groups[0];
        const members = await request({
          url: `/family-groups/${group.id}/members`,
          method: "GET",
          showLoading: false,
          silent: true
        });
        const memberList = [
          { userId: null, nickname: "全部", isAll: true }
        ];
        for (const m of (members || [])) {
          memberList.push({
            userId: m.user_id,
            nickname: m.nickname || `用户${m.user_id}`,
            isAll: false
          });
        }
        this.setData({
          familyGroupId: group.id,
          familyMembers: memberList
        });
      }
    } catch (e) {
      // no family group, that's ok
    }
  },

  async loadStatistics() {
    const userId = wx.getStorageSync("userId");
    if (!userId) return;

    this.setData({ loading: true });
    try {
      const params = {
        userId,
        dimension: this.data.dimension,
        date: this.data.currentDate
      };
      if (this.data.familyGroupId) {
        params.familyGroupId = this.data.familyGroupId;
        const member = this.data.familyMembers[this.data.selectedMemberIndex];
        if (member && !member.isAll && member.userId) {
          params.memberUserId = member.userId;
        }
      }

      const data = await request({
        url: "/statistics/overview",
        method: "GET",
        data: params,
        showLoading: false,
        silent: true
      });

      const summary = data.summary || { budgetTotal: 0, actualTotal: 0, incomeTotal: 0, remainTotal: 0, balanceTotal: 0 };
      const ratio = summary.budgetTotal > 0 ? summary.actualTotal / summary.budgetTotal : 0;
      const overallPercent = summary.budgetTotal > 0 ? (ratio * 100).toFixed(1) : 0;
      const progressWidth = Math.min(ratio * 100, 100);
      const progressColor = ratio > 1 ? "#FF6B6B" : ratio >= 0.8 ? "#5B8FF9" : "#6FCF97";

      this.setData({
        summary,
        categories: data.categories || [],
        periodLabel: data.period?.label || "",
        overallPercent,
        progressWidth,
        progressColor,
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  onSwitchDimension(e) {
    const index = e.currentTarget.dataset.index;
    const tab = this.data.dimensionTabs[index];

    const parts = this.data.currentDate.split('-');
    const calendarYear = parseInt(parts[0]);
    const calendarMonth = parseInt(parts[1]);

    this.setData({
      activeDimIndex: index,
      dimension: tab.key,
      showCalendar: false,
      showBarChart: tab.key === 'year',
      calendarYear,
      calendarMonth
    });

    this.setData({ dateLabel: this.getDateLabel.call(this) });

    if (tab.key === 'day') {
      this.loadCalendarData();
    } else if (tab.key === 'year') {
      this.loadBarChartData();
    }

    this.loadStatistics();
  },

  onSelectMember(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedMemberIndex: index });
    this.loadStatistics();
  },

  onPrevDate() {
    const d = this.parseDate(this.data.currentDate);
    if (this.data.dimension === "day") {
      d.setDate(d.getDate() - 1);
    } else if (this.data.dimension === "week") {
      d.setDate(d.getDate() - 7);
    } else if (this.data.dimension === "year") {
      d.setFullYear(d.getFullYear() - 1);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    const newDate = this.formatDate(d);

    let calendarYear = d.getFullYear();
    let calendarMonth = d.getMonth() + 1;
    let barChartYear = this.data.barChartYear;
    if (this.data.dimension === 'year') {
      barChartYear = d.getFullYear();
    }

    this.setData({
      currentDate: newDate,
      dateLabel: this.getDateLabel.call(this),
      calendarYear,
      calendarMonth,
      barChartYear
    });
    this.loadStatistics();
    if (this.data.dimension === 'day') {
      this.loadCalendarData();
    } else if (this.data.dimension === 'year') {
      this.loadBarChartData();
    }
  },

  onNextDate() {
    const d = this.parseDate(this.data.currentDate);
    const now = new Date();
    if (this.data.dimension === "day") {
      d.setDate(d.getDate() + 1);
    } else if (this.data.dimension === "week") {
      d.setDate(d.getDate() + 7);
    } else if (this.data.dimension === "year") {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    if (d > now) return;
    const newDate = this.formatDate(d);

    let calendarYear = d.getFullYear();
    let calendarMonth = d.getMonth() + 1;
    let barChartYear = this.data.barChartYear;
    if (this.data.dimension === 'year') {
      barChartYear = d.getFullYear();
    }

    this.setData({
      currentDate: newDate,
      dateLabel: this.getDateLabel.call(this),
      calendarYear,
      calendarMonth,
      barChartYear
    });
    this.loadStatistics();
    if (this.data.dimension === 'day') {
      this.loadCalendarData();
    } else if (this.data.dimension === 'year') {
      this.loadBarChartData();
    }
  },

  getPercentColor(percent) {
    if (percent > 100) return "#FF6B6B";
    if (percent >= 80) return "#5B8FF9";
    return "#6FCF97";
  },

  async loadCalendarData() {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    try {
      const params = {
        userId,
        year: this.data.calendarYear,
        month: this.data.calendarMonth
      };
      if (this.data.familyGroupId) {
        params.familyGroupId = this.data.familyGroupId;
        const member = this.data.familyMembers[this.data.selectedMemberIndex];
        if (member && !member.isAll && member.userId) {
          params.memberUserId = member.userId;
        }
      }

      const data = await request({
        url: '/statistics/calendar/monthly',
        method: 'GET',
        data: params,
        showLoading: false,
        silent: true
      });

      this.setData({
        calendarData: data.dailyData || [],
        dailyBudget: data.dailyBudget || 0
      });
    } catch (e) {
      console.error('加载日历数据失败', e);
    }
  },

  async loadBarChartData() {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    try {
      const params = {
        userId,
        year: this.data.barChartYear
      };
      if (this.data.familyGroupId) {
        params.familyGroupId = this.data.familyGroupId;
        const member = this.data.familyMembers[this.data.selectedMemberIndex];
        if (member && !member.isAll && member.userId) {
          params.memberUserId = member.userId;
        }
      }

      const data = await request({
        url: '/statistics/bar-chart/yearly',
        method: 'GET',
        data: params,
        showLoading: false,
        silent: true
      });

      this.setData({
        barChartData: data.monthlyData || [],
        barChartMaxAmount: data.maxAmount || 0
      });
    } catch (e) {
      console.error('加载柱状图数据失败', e);
    }
  },

  onCalendarDayTap(e) {
    const { date } = e.detail;
    this.setData({
      selectedDate: date,
      currentDate: date,
      showCalendarPicker: false,
      dimension: 'day',
      activeDimIndex: 0
    });
    this.setData({ dateLabel: this.getDateLabel.call(this) });
    this.loadStatistics();
  },

  async loadDayDetail(date) {
    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    try {
      const params = { userId, date };
      const data = await request({
        url: '/statistics/day-detail',
        method: 'GET',
        data: params,
        showLoading: false,
        silent: true
      });

      this.setData({ dayDetail: data });

      const content = data.categories.map(c => `${c.categoryLabel}: ¥${c.amount} (${c.percent}%)`).join('\n');
      wx.showModal({
        title: `${date} 支出详情`,
        content: `总计: ¥${data.totalExpense}\n\n${content}`,
        showCancel: false
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onBarChartTap(e) {
    const { month } = e.detail;
    const date = `${this.data.barChartYear}-${String(month).padStart(2, '0')}-01`;
    this.setData({
      dimension: 'month',
      activeDimIndex: 2,
      currentDate: date,
      calendarYear: this.data.barChartYear,
      calendarMonth: month,
      showCalendar: true,
      showBarChart: false,
      dateLabel: this.getDateLabel.call(this)
    });

    this.loadCalendarData();
    this.loadStatistics();
  },

  onNavigateToBackfill() {
    wx.navigateTo({
      url: '/pages/backfill/backfill'
    });
  },

  onOpenCalendarPicker() {
    this.setData({ showCalendarPicker: true });
  },

  onCloseCalendarPicker() {
    this.setData({ showCalendarPicker: false });
  },

  onPrevCalendarMonth() {
    let { calendarYear, calendarMonth } = this.data;
    calendarMonth--;
    if (calendarMonth < 1) {
      calendarMonth = 12;
      calendarYear--;
    }
    this.setData({ calendarYear, calendarMonth });
    this.loadCalendarData();
  },

  onNextCalendarMonth() {
    const now = new Date();
    let { calendarYear, calendarMonth } = this.data;
    calendarMonth++;
    if (calendarMonth > 12) {
      calendarMonth = 1;
      calendarYear++;
    }
    if (calendarYear > now.getFullYear() || (calendarYear === now.getFullYear() && calendarMonth > now.getMonth() + 1)) {
      return;
    }
    this.setData({ calendarYear, calendarMonth });
    this.loadCalendarData();
  }
});
