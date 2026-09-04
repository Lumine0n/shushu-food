const app = getApp();

Page({
  data: { foods: [], loading: false },
  recommend() {
    this.setData({ loading: true });
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/miniapp/recommend`,
      method: "POST",
      data: {
        decisionId: `miniapp-${Date.now()}`,
        input: {
          latitude: 31.3202,
          longitude: 121.3914,
          budgetMaxCents: 3000,
          distanceMeters: 1500,
          mealTypes: ["正餐", "小吃", "甜品", "饮品", "夜宵"],
          serviceModes: ["堂食", "带走", "外卖"],
          wantedTags: [],
          excludedTags: []
        }
      },
      complete: () => this.setData({ loading: false }),
      success: (res) => {
        if (res.statusCode === 200) this.setData({ foods: res.data.candidates || [] });
        else wx.showToast({ title: res.data?.error || "暂时找不到", icon: "none" });
      },
      fail: () => wx.showToast({ title: "网络连接失败", icon: "none" })
    });
  }
});
