/**
 * 订单 OCR 入库页面
 * 支持图片识别或文本输入，人工校验后批量入库
 */
const app = getApp();

// 色号校准函数（与后端 calibrateCode 逻辑一致）
// A1 和 A01 等价，统一为无前导零格式（与数据库一致）
// 不在 MARD 221 色卡中的返回 null
const MARD_CODES = new Set([
  'A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15','A16','A17','A18','A19','A20','A21','A22','A23','A24','A25','A26',
  'B1','B2','B3','B4','B5','B6','B7','B8','B9','B10','B11','B12','B13','B14','B15','B16','B17','B18','B19','B20','B21','B22','B23','B24','B25','B26','B27','B28','B29','B30','B31','B32',
  'C1','C2','C3','C4','C5','C6','C7','C8','C9','C10','C11','C12','C13','C14','C15','C16','C17','C18','C19','C20','C21','C22','C23','C24','C25','C26','C27','C28','C29',
  'D1','D2','D3','D4','D5','D6','D7','D8','D9','D10','D11','D12','D13','D14','D15','D16','D17','D18','D19','D20','D21','D22','D23','D24','D25','D26',
  'E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','E11','E12','E13','E14','E15','E16','E17','E18','E19','E20','E21','E22','E23','E24',
  'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','F13','F14','F15','F16','F17','F18','F19','F20','F21','F22','F23','F24','F25',
  'G1','G2','G3','G4','G5','G6','G7','G8','G9','G10','G11','G12','G13','G14','G15','G16','G17','G18','G19','G20','G21',
  'H1','H2','H3','H4','H5','H6','H8','H9','H10','H11','H12','H13','H14','H15','H16','H17','H18','H19','H20','H21','H22','H23',
  'M1','M2','M3','M4','M5','M6','M7','M8','M9','M10','M11','M12','M13','M14','M15'
]);

function calibrateCode(rawCode) {
  if (!rawCode) return null;
  const code = rawCode.trim().toUpperCase();
  const match = code.match(/^([A-Z])(\d{1,2})$/);
  if (!match) return null;
  // 去前导零：A01→A1, A10→A10
  return MARD_CODES.has(match[1] + parseInt(match[2], 10)) ? match[1] + parseInt(match[2], 10) : null;
}

Page({
  data: {
    // 输入模式：image 或 text
    inputMode: 'image',
    // 图片路径
    imagePath: '',
    // 订单文本
    orderText: '',
    // 识别结果
    items: [],
    // 加载状态
    loading: false,
    // 用户信息
    userId: null
  },

  onLoad() {
    this.setData({
      userId: app.globalData.userId || wx.getStorageSync('userId')
    });
  },

  // 切换输入模式
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({
      inputMode: mode,
      imagePath: '',
      orderText: '',
      items: []
    });
  },

  // 选择订单图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          imagePath: res.tempFilePaths[0],
          items: []
        });
      }
    });
  },

  // 订单文本输入
  onTextInput(e) {
    this.setData({
      orderText: e.detail.value
    });
  },

  // 识别订单
  async recognize() {
    const { inputMode, imagePath, orderText, userId } = this.data;

    if (inputMode === 'image' && !imagePath) {
      wx.showToast({ title: '请选择订单图片', icon: 'none' });
      return;
    }

    if (inputMode === 'text' && !orderText.trim()) {
      wx.showToast({ title: '请输入订单文本', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      let result;
      if (inputMode === 'image') {
        // 图片识别
        result = await this.uploadAndRecognize(imagePath);
      } else {
        // 文本识别
        result = await this.textRecognize(orderText);
      }

      if (result.items && result.items.length > 0) {
        // 过滤无效色号：只保留色卡中存在的色号
        const validItems = result.items.filter(item => calibrateCode(item.code));
        // 校准色号格式（A01→A1 等价统一）
        validItems.forEach(item => { item.code = calibrateCode(item.code); });

        if (validItems.length > 0) {
          this.setData({ items: validItems });
          const filtered = result.items.length - validItems.length;
          const msg = filtered > 0
            ? `识别到 ${validItems.length} 条物料（已过滤 ${filtered} 条无效色号）`
            : `识别到 ${validItems.length} 条物料`;
          wx.showToast({ title: msg, icon: 'none', duration: 2000 });
        } else {
          this.setData({ items: [] });
          wx.showToast({ title: '未识别到有效色号', icon: 'none' });
        }
      } else {
        wx.showToast({ title: '未识别到物料信息', icon: 'none' });
      }
    } catch (err) {
      console.error('识别失败:', err);
      wx.showToast({ title: '识别失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 图片上传并识别
  uploadAndRecognize(imagePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.apiBaseUrl}/api/bead/ocr/order`,
        filePath: imagePath,
        name: 'image',
        formData: {
          userId: this.data.userId
        },
        success: (res) => {
            const data = JSON.parse(res.data);
            if (data.success) {
              resolve(data.data);
            } else {
              reject(new Error(data.message || '识别失败'));
            }
          },
        fail: reject
      });
    });
  },

  // 文本识别
  textRecognize(text) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBaseUrl}/api/bead/ocr/order`,
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: {
          userId: this.data.userId,
          text: text
        },
        success: (res) => {
          if (res.data && res.data.success) {
            resolve(res.data.data);
          } else {
            reject(new Error((res.data && res.data.message) || '识别失败'));
          }
        },
        fail: reject
      });
    });
  },

  // 统一字段输入（色号/数量）
  onFieldInput(e) {
    const { index, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const items = this.data.items;
    if (field === 'count') {
      items[index].count = Number(value) || 0;
    } else {
      // 色号输入时实时校准和标记
      const trimmed = value.trim().toUpperCase();
      items[index].code = trimmed;
      items[index].invalid = trimmed && !calibrateCode(trimmed);
    }
    this.setData({ items });
  },

  // 删除物料行
  deleteItem(e) {
    const index = e.currentTarget.dataset.index;
    const items = this.data.items;
    if (items.length <= 1) {
      wx.showToast({ title: '至少保留一条', icon: 'none' });
      return;
    }
    items.splice(index, 1);
    this.setData({ items });
  },

  // 添加物料行
  addItem() {
    const items = [...this.data.items, { code: '', name: '', count: 0 }];
    this.setData({ items });
  },

  // 确认入库
  async confirmStockIn() {
    const { items, userId } = this.data;

    // 过滤有效物料：色号必须在色卡中，数量大于0
    const validItems = items.filter(item => {
      const code = calibrateCode(item.code);
      return code && item.count > 0;
    });

    // 标记无效色号提示
    const invalidItems = items.filter(item => item.code && !calibrateCode(item.code));

    if (validItems.length === 0) {
      wx.showToast({ title: '请至少填写一条有效色号数据', icon: 'none' });
      return;
    }

    if (invalidItems.length > 0) {
      const codes = invalidItems.map(i => i.code).join('、');
      const confirmed = await this.showConfirmDialog(
        `以下色号不在 MARD 色卡中将被忽略：${codes}\n确认入库 ${validItems.length} 条有效物料？`
      );
      if (!confirmed) return;
    } else {
      const confirmed = await this.showConfirmDialog(`确认入库 ${validItems.length} 条物料？`);
      if (!confirmed) return;
    }

    // 校准色号格式后提交
    const submitItems = validItems.map(item => ({
      code: calibrateCode(item.code),
      count: item.count
    }));

    wx.showLoading({ title: '入库中...' });

    try {
      await new Promise((resolve, reject) => {
        wx.request({
          url: `${app.globalData.apiBaseUrl}/api/bead/ocr/order/confirm`,
          method: 'POST',
          header: { 'content-type': 'application/json' },
          data: {
            userId,
            items: submitItems,
            orderSummary: '订单识别入库'
          },
          success: (res) => {
            if (res.data && res.data.success) resolve(res.data);
            else reject(new Error((res.data && res.data.message) || '入库失败'));
          },
          fail: reject
        });
      });

      wx.hideLoading();
      wx.showToast({ title: '入库成功', icon: 'success' });

      // 返回豆仓页面
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '入库失败，请重试', icon: 'none' });
    }
  },

  // 显示确认对话框
  showConfirmDialog(content) {
    return new Promise((resolve) => {
      wx.showModal({
        title: '确认',
        content,
        success: (res) => {
          resolve(res.confirm);
        }
      });
    });
  }
});