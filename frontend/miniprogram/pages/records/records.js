const { request } = require("../../utils/request");

Page({
  data: {
    currentMonth: "",
    monthLabel: "",
    recordType: "",
    typeTabs: [
      { key: "", label: "全部" },
      { key: "expense", label: "支出" },
      { key: "income", label: "收入" }
    ],
    activeTypeIndex: 0,
    groupedRecords: [],
    totalIncome: 0,
    totalExpense: 0,
    loading: false
  },

  onLoad() {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    this.setData({ currentMonth: month });
    this.loadRecords();
  },

  async loadRecords() {
    const userId = wx.getStorageSync("userId");
    if (!userId) return;

    this.setData({ loading: true });
    try {
      const params = {
        userId,
        recordMonth: this.data.currentMonth
      };
      if (this.data.recordType) {
        params.recordType = this.data.recordType;
      }

      const records = await request({
        url: "/records",
        method: "GET",
        data: params,
        showLoading: false,
        silent: true
      });

      const grouped = this.groupByDate(records || []);
      const { totalIncome, totalExpense } = this.calcTotals(records || []);

      this.setData({
        groupedRecords: grouped,
        totalIncome,
        totalExpense,
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  groupByDate(records) {
    const map = {};
    for (const r of records) {
      const date = r.record_date || r.recordDate;
      if (!map[date]) {
        map[date] = { date, dayLabel: this.formatDayLabel(date), items: [], dayExpense: 0, dayIncome: 0 };
      }
      const item = {
        id: r.id,
        category: r.category_snapshot || "未分类",
        amount: Number(r.amount || 0).toFixed(2),
        type: r.record_type || r.recordType,
        note: r.note || "",
        source: r.source || ""
      };
      map[date].items.push(item);
      if (item.type === "expense") {
        map[date].dayExpense += Number(r.amount || 0);
      } else {
        map[date].dayIncome += Number(r.amount || 0);
      }
    }
    const list = Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
    for (const g of list) {
      g.dayExpense = g.dayExpense.toFixed(2);
      g.dayIncome = g.dayIncome.toFixed(2);
    }
    return list;
  },

  calcTotals(records) {
    let totalIncome = 0;
    let totalExpense = 0;
    for (const r of records) {
      const amt = Number(r.amount || 0);
      if (r.record_type === "expense") totalExpense += amt;
      else totalIncome += amt;
    }
    return { totalIncome: totalIncome.toFixed(2), totalExpense: totalExpense.toFixed(2) };
  },

  formatDayLabel(dateStr) {
    const d = new Date(dateStr);
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
  },

  onSwitchType(e) {
    const index = e.currentTarget.dataset.index;
    const tab = this.data.typeTabs[index];
    this.setData({ activeTypeIndex: index, recordType: tab.key });
    this.loadRecords();
  },

  onPrevMonth() {
    const [year, month] = this.data.currentMonth.split("-").map(Number);
    const d = new Date(year, month - 2, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    this.setData({ currentMonth: newMonth });
    this.loadRecords();
  },

  onNextMonth() {
    const [year, month] = this.data.currentMonth.split("-").map(Number);
    const d = new Date(year, month, 1);
    const now = new Date();
    if (d > now) return;
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    this.setData({ currentMonth: newMonth });
    this.loadRecords();
  }
});
