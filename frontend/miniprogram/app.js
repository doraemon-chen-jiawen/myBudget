App({
  globalData: {
    // apiBaseUrl: "http://172.16.124.92:3000"
    apiBaseUrl: "http://1.117.72.60:3000"
  },

  onLaunch() {
    this.checkLogin();
  },

  checkLogin() {
    const loginTime = wx.getStorageSync("loginTime");
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

    if (!loginTime || Date.now() - loginTime >= ONE_WEEK) {
      wx.removeStorageSync("userId");
      wx.removeStorageSync("token");
      wx.removeStorageSync("loginTime");
      wx.reLaunch({ url: "/pages/login/login" });
    }
  }
});
