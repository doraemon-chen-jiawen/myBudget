const { request } = require("../../utils/request");

Page({
  data: {
    username: "",
    password: "",
    confirmPassword: "",
    nickname: ""
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

  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    });
  },

  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    });
  },

  async onRegister() {
    const { username, password, confirmPassword, nickname } = this.data;

    if (!username || !password || !confirmPassword) {
      wx.showToast({
        title: "请填写必填信息",
        icon: "none"
      });
      return;
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: "两次密码不一致",
        icon: "none"
      });
      return;
    }

    if (password.length < 6) {
      wx.showToast({
        title: "密码至少6位",
        icon: "none"
      });
      return;
    }

    try {
      await request({
        url: "/auth/register",
        method: "POST",
        data: { username, password, nickname },
        loadingTitle: "注册中"
      });

      wx.showToast({
        title: "注册成功",
        icon: "success"
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    } catch (error) {
      // 错误提示已在 request 内统一处理
    }
  },

  onGoToLogin() {
    wx.navigateBack();
  }
});
