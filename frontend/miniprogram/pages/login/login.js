const { request } = require("../../utils/request");

const LOGIN_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

Page({
  data: {
    username: "",
    password: ""
  },

  onShow() {
    if (this.isLoggedIn()) {
      wx.switchTab({ url: "/pages/index/index" });
    }
  },

  isLoggedIn() {
    const loginTime = wx.getStorageSync("loginTime");
    if (!loginTime) return false;
    return Date.now() - loginTime < LOGIN_VALIDITY_MS;
  },

  onUsernameInput(e) {
    this.setData({
      username: e.detail.value
    });
  },

  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  async onLogin() {
    const { username, password } = this.data;

    if (!username || !password) {
      wx.showToast({
        title: "请输入用户名和密码",
        icon: "none"
      });
      return;
    }

    try {
      const data = await request({
        url: "/auth/login",
        method: "POST",
        data: { username, password },
        loadingTitle: "登录中"
      });

      wx.setStorageSync("userId", data.userId);
      wx.setStorageSync("token", data.token);
      wx.setStorageSync("loginTime", Date.now());
      wx.setStorageSync("userInfo", data);

      wx.showToast({
        title: "登录成功",
        icon: "success"
      });

      setTimeout(() => {
        wx.switchTab({
          url: "/pages/index/index"
        });
      }, 1000);
    } catch (error) {
      // 错误提示已在 request 内统一处理
    }
  },

  onGoToRegister() {
    wx.navigateTo({
      url: "/pages/register/register"
    });
  }
});
