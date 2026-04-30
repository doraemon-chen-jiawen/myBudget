Component({
  properties: {
    year: {
      type: Number,
      value: new Date().getFullYear()
    },
    month: {
      type: Number,
      value: new Date().getMonth() + 1
    },
    dailyData: {
      type: Array,
      value: []
    },
    dailyBudget: {
      type: Number,
      value: 0
    }
  },

  data: {
    calendarDays: [],
    weekDays: ['日', '一', '二', '三', '四', '五', '六']
  },

  observers: {
    'year, month, dailyData': function(year, month, dailyData) {
      this.generateCalendar();
    }
  },

  methods: {
    generateCalendar() {
      const year = this.data.year;
      const month = this.data.month;
      const dailyData = this.data.dailyData;

      const firstDay = new Date(year, month - 1, 1);
      const daysInMonth = new Date(year, month, 0).getDate();
      const firstDayOfWeek = firstDay.getDay();

      const calendarDays = [];

      for (let i = 0; i < firstDayOfWeek; i++) {
        calendarDays.push({
          day: null,
          date: null,
          status: 'empty',
          hasRecord: false
        });
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayData = dailyData.find(d => d.date === dateStr);
        const amount = dayData ? (dayData.amount || dayData.total || 0) : 0;
        const hasRecord = amount > 0;
        let status = 'empty';
        if (hasRecord) {
          status = dayData.status || (amount > dayData?.budget ? 'over' : 'normal');
        }
        calendarDays.push({
          day,
          date: dateStr,
          amount,
          budget: dayData ? dayData.budget : this.data.dailyBudget,
          status,
          hasRecord
        });
      }

      this.setData({ calendarDays });
    },

    getDayClass(day) {
      if (day.status === 'empty') return 'day-empty';
      if (day.status === 'over') return 'day-over';
      if (day.status === 'warning') return 'day-warning';
      return 'day-normal';
    },

    onDayTap(e) {
      const { day, date, amount, budget, status } = e.currentTarget.dataset;
      if (!day) return;

      this.triggerEvent('daytap', {
        day,
        date,
        amount,
        budget,
        status
      });
    }
  }
});
