Page({
  data: {
    userInfo: {
      nickname: "",
      avatarUrl: ""
    },
    userId: null,
    greeting: "Hi，你好 👋",
    stats: {
      days: "--",
      count: "--",
      saved: "--"
    }
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const userId = wx.getStorageSync("userId");
    const token = wx.getStorageSync("token");
    const hour = new Date().getHours();
    let greeting = "Hi，你好 👋";

    if (hour >= 5 && hour < 12) {
      greeting = "Hi，早上好 ☀️";
    } else if (hour >= 12 && hour < 14) {
      greeting = "Hi，中午好 🌤";
    } else if (hour >= 14 && hour < 18) {
      greeting = "Hi，下午好 🌅";
    } else if (hour >= 18 && hour < 22) {
      greeting = "Hi，晚上好 🌙";
    } else {
      greeting = "Hi，夜深了 💤";
    }

    this.setData({
      userId,
      greeting,
      userInfo: {
        nickname: userId ? "用户" + userId : "未登录",
        avatarUrl: ""
      }
    });
  },

  onLogout() {
    wx.showModal({
      title: "退出登录",
      content: "确定要退出登录吗？",
      confirmColor: "#FF6B6B",
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync("userId");
          wx.removeStorageSync("token");

          wx.showToast({
            title: "已退出登录",
            icon: "success"
          });

          setTimeout(() => {
            wx.reLaunch({
              url: "/pages/login/login"
            });
          }, 1000);
        }
      }
    });
  },

  onNavigateToSettings() {
    wx.showToast({
      title: "功能开发中",
      icon: "none"
    });
  },

  onNavigateToBudget() {
    wx.navigateTo({
      url: "/pages/budget/budget"
    });
  }
});
