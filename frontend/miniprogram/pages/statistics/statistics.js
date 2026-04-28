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
    periodLabel: "",
    summary: { budgetTotal: 0, actualTotal: 0, remainTotal: 0 },
    categories: [],
    familyMembers: [],
    selectedMemberIndex: 0,
    familyGroupId: null,
    loading: false
  },

  onLoad() {
    const now = new Date();
    this.setData({
      currentDate: this.formatDate(now)
    });
    this.loadFamilyInfo();
    this.loadStatistics();
  },

  formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  },

  async loadFamilyInfo() {
    const userId = wx.getStorageSync("userId");
    if (!userId) return;
    try {
      const groups = await request({
        url: "/family-groups",
        method: "GET",
        data: { ownerUserId: userId },
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

      const summary = data.summary || { budgetTotal: 0, actualTotal: 0, remainTotal: 0 };
      const ratio = summary.budgetTotal > 0 ? summary.actualTotal / summary.budgetTotal : 0;
      const overallPercent = summary.budgetTotal > 0 ? (ratio * 100).toFixed(1) : 0;
      const progressWidth = Math.min(ratio * 100, 100);
      const progressColor = ratio >= 1 ? "#FF6B6B" : ratio >= 0.8 ? "#FFB38A" : "#6FCF97";

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
    this.setData({ activeDimIndex: index, dimension: tab.key });
    this.loadStatistics();
  },

  onSelectMember(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedMemberIndex: index });
    this.loadStatistics();
  },

  onPrevDate() {
    const d = new Date(this.data.currentDate);
    if (this.data.dimension === "day") {
      d.setDate(d.getDate() - 1);
    } else if (this.data.dimension === "week") {
      d.setDate(d.getDate() - 7);
    } else if (this.data.dimension === "year") {
      d.setFullYear(d.getFullYear() - 1);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    this.setData({ currentDate: this.formatDate(d) });
    this.loadStatistics();
  },

  onNextDate() {
    const d = new Date(this.data.currentDate);
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
    this.setData({ currentDate: this.formatDate(d) });
    this.loadStatistics();
  },

  getPercentColor(percent) {
    if (percent >= 100) return "#FF6B6B";
    if (percent >= 80) return "#FFB38A";
    return "#6FCF97";
  }
});
