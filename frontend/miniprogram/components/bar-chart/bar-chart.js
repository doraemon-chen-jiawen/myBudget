Component({
  properties: {
    year: {
      type: Number,
      value: new Date().getFullYear()
    },
    monthlyData: {
      type: Array,
      value: []
    },
    maxAmount: {
      type: Number,
      value: 0
    }
  },

  data: {
    months: ['1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'],
    totalAmount: 0
  },

  observers: {
    'monthlyData': function(monthlyData) {
      this.calculateTotal();
    }
  },

  lifetimes: {
    attached() {
      this.calculateTotal();
    }
  },

  methods: {
    calculateTotal() {
      const monthlyData = this.properties.monthlyData || [];
      let total = 0;
      monthlyData.forEach(item => {
        total += item.amount || 0;
      });
      this.setData({ totalAmount: total });
    },

    getBarHeight(amount) {
      if (this.data.maxAmount <= 0) return 0;
      return (amount / this.data.maxAmount) * 100;
    },

    getBarColor(status) {
      if (status === 'over') return '#FF6B6B';
      if (status === 'warning') return '#5B8FF9';
      return '#6FCF97';
    },

    onBarTap(e) {
      const { month, amount, budget, status } = e.currentTarget.dataset;
      this.triggerEvent('bartap', {
        month,
        amount,
        budget,
        status
      });
    }
  }
});
