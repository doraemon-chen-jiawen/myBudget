let loadingCount = 0;

function request(options = {}) {
  const app = getApp();
  const {
    url,
    method = "GET",
    data = {},
    loadingTitle = "加载中",
    showLoading = true
  } = options;

  if (!url) {
    return Promise.reject(new Error("request url is required"));
  }

  if (showLoading) {
    loadingCount += 1;
    wx.showLoading({
      title: loadingTitle,
      mask: true
    });
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api${url}`,
      method,
      data,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data?.success) {
          resolve(res.data.data);
          return;
        }
        const message = res.data?.message || "请求失败";
        wx.showToast({
          title: message,
          icon: "none"
        });
        reject(new Error(message));
      },
      fail: (err) => {
        wx.showToast({
          title: "网络异常，请稍后重试",
          icon: "none"
        });
        reject(err);
      },
      complete: () => {
        if (showLoading) {
          loadingCount = Math.max(0, loadingCount - 1);
          if (loadingCount === 0) {
            wx.hideLoading();
          }
        }
      }
    });
  });
}

module.exports = {
  request
};
