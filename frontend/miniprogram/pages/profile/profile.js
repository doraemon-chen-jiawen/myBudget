Page({
  data: {
    userInfo: {
      nickname: "",
      avatarUrl: ""
    },
    userId: null
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

    this.setData({
      userId,
      userInfo: {
        nickname: "用户" + userId || "未登录",
        avatarUrl: ""
      }
    });
  },

  onLogout() {
    wx.showModal({
      title: "退出登录",
      content: "确定要退出登录吗？",
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
