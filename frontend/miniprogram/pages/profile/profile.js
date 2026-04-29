const { request } = require("../../utils/request");

const ANIMAL_EMOJIS = ['🦊', '🐶', '🐱', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄', '🐝', '🦋'];

function randomAnimal() {
  return ANIMAL_EMOJIS[Math.floor(Math.random() * ANIMAL_EMOJIS.length)];
}

Page({
  data: {
    userInfo: {
      nickname: "",
      avatarUrl: "",
      avatarAnimal: randomAnimal()
    },
    userId: null,
    greeting: "Hi，你好 👋",
    streakDays: 0
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
    const userInfo = wx.getStorageSync("userInfo");
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

    // Calculate streak days
    const firstRecordDate = wx.getStorageSync("firstRecordDate");
    let streakDays = 0;
    if (firstRecordDate) {
      const first = new Date(firstRecordDate);
      const now = new Date();
      const diffTime = Math.abs(now - first);
      streakDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    this.setData({
      userId,
      greeting,
      streakDays,
      userInfo: {
        nickname: userId ? userInfo.nickname : "未登录",
        avatarUrl: userInfo.avatar_url || "",
        avatarAnimal: randomAnimal()
      }
    });
  },

  onChooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          "userInfo.avatarUrl": tempFilePath,
          "userInfo.avatarAnimal": ""
        });
        wx.setStorageSync("avatarUrl", tempFilePath);
        wx.setStorageSync("avatarAnimal", "");
        wx.showToast({
          title: "头像已更新",
          icon: "success"
        });
      },
      fail: () => {
        // user cancelled, do nothing
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
          wx.removeStorageSync("loginTime");
          wx.removeStorageSync("avatarUrl");
          wx.removeStorageSync("avatarAnimal");

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

  onNavigateToFamily() {
    wx.navigateTo({
      url: "/pages/family/family"
    });
  },

  onNavigateToBudget() {
    wx.navigateTo({
      url: "/pages/budget/budget"
    });
  },

  onNavigateToRecords() {
    wx.navigateTo({
      url: "/pages/records/records"
    });
  },

  onNavigateToStatistics() {
    wx.navigateTo({
      url: "/pages/statistics/statistics"
    });
  }
});
