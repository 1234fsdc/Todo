App({
  globalData: {
    userInfo: null,
    darkMode: false
  },

  onLaunch() {
    this.loadDarkMode();
    this.loadUserInfo();
  },

  loadDarkMode() {
    try {
      const darkMode = wx.getStorageSync('darkMode') || false;
      this.globalData.darkMode = darkMode;
    } catch (e) {
      console.error('加载深色模式失败', e);
    }
  },

  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.globalData.userInfo = userInfo;
      }
    } catch (e) {
      console.error('加载用户信息失败', e);
    }
  },

  setDarkMode(isDark) {
    this.globalData.darkMode = isDark;
    wx.setStorageSync('darkMode', isDark);
  }
});
