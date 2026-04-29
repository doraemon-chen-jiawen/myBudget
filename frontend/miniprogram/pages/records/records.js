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
    loading: false,
    touchStartX: 0,
    currentTouchedId: null
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
        source: r.source || "",
        sourceReference: r.source_reference || null,
        recordDate: date
      };
      map[date].items.push(item);
      if (item.type === "expense") {
        map[date].dayExpense += Number(r.amount || 0);
      } else {
        map[date].dayIncome += Number(r.amount || 0);
      }
    }

    const list = Object.values(map).sort((a, b) => b.date.localeCompare(a.date));

    // 重新排序每个日期组，让撤回记录紧跟在原记录后面，并标记被撤回记录
    for (const g of list) {
      const reorderedItems = [];
      const usedIds = new Set();

      for (const item of g.items) {
        if (usedIds.has(item.id)) continue;

        if (item.source === "retract" && item.sourceReference) {
          // 撤回记录
          const originalItem = g.items.find(i => i.id === item.sourceReference);
          if (originalItem && !usedIds.has(originalItem.id)) {
            // 添加原记录，标记为已撤回
            reorderedItems.push({ ...originalItem, isRetracted: true });
            usedIds.add(originalItem.id);

            // 添加撤回记录，标记为撤回类型
            reorderedItems.push({ ...item, isRetract: true });
            usedIds.add(item.id);
          }
        }
      }

      // 添加未处理的记录
      for (const item of g.items) {
        if (!usedIds.has(item.id)) {
          reorderedItems.push(item);
        }
      }

      g.items = reorderedItems;
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
  },

  onTouchStart(e) {
    const touch = e.touches[0];
    this.setData({
      touchStartX: touch.clientX,
      currentTouchedId: e.currentTarget.dataset.id
    });
  },

  onTouchMove(e) {
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.data.touchStartX;
    const recordId = e.currentTarget.dataset.id;

    if (deltaX < -50) {
      this.updateSwipedState(recordId, true);
    } else if (deltaX > 50) {
      this.updateSwipedState(recordId, false);
    }
  },

  onTouchEnd(e) {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.data.touchStartX;
    const recordId = e.currentTarget.dataset.id;

    if (deltaX < -80) {
      this.updateSwipedState(recordId, true);
    } else if (deltaX > 20) {
      this.updateSwipedState(recordId, false);
    } else {
      this.updateSwipedState(recordId, false);
    }
  },

  updateSwipedState(recordId, swiped) {
    const groupedRecords = this.data.groupedRecords.map(group => {
      const items = group.items.map(item => {
        if (item.id === recordId) {
          // 如果是已撤回的记录或撤回记录，不允许滑动
          if (item.isRetracted || item.isRetract) {
            return { ...item, swiped: false };
          }
          return { ...item, swiped };
        }
        return { ...item, swiped: false };
      });
      return { ...group, items };
    });

    this.setData({ groupedRecords });
  },

  async onRetract(e) {
    const { id, amount, type, category, note, recordDate } = e.currentTarget.dataset;
    const userId = wx.getStorageSync("userId");

    wx.showModal({
      title: "确认撤回",
      content: `将新增一条对冲记录：¥${amount}`,
      confirmText: "确认",
      cancelText: "取消",
      success: async (res) => {
        if (res.confirm) {
          try {
            const originalAmount = parseFloat(amount);
            const retractAmount = -originalAmount;

            await request({
              url: "/records",
              method: "POST",
              data: {
                userId,
                amount: retractAmount,
                recordType: type,
                category: "其他",
                note: "撤回记录",
                source: "retract",
                sourceReference: id, // 记录被撤回的原始记录ID
                recordDate: recordDate // 使用原记录的日期
              }
            });

            wx.showToast({
              title: "撤回成功",
              icon: "success"
            });

            this.updateSwipedState(id, false);
            this.loadRecords();
          } catch (err) {
            wx.showToast({
              title: "撤回失败",
              icon: "error"
            });
          }
        } else {
          this.updateSwipedState(id, false);
        }
      }
    });
  }
});
