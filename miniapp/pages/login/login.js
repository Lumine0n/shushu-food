const app = getApp();

Page({
  login() {
    wx.login({
      success: ({ code }) => {
        wx.request({
          url: `${app.globalData.apiBaseUrl}/api/miniapp/auth/login`,
          method: "POST",
          data: { code },
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              wx.reLaunch({ url: "/pages/index/index" });
              return;
            }
            wx.showToast({ title: res.data?.error || "登录暂不可用", icon: "none" });
          },
          fail: () => wx.showToast({ title: "网络连接失败", icon: "none" })
        });
      },
      fail: () => wx.showToast({ title: "微信登录失败", icon: "none" })
    });
  }
});
