const { request } = require("../../../utils/request");

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
  return MARD_CODES.has(match[1] + parseInt(match[2], 10)) ? match[1] + parseInt(match[2], 10) : null;
}

Page({
  data: {
    step: 1, // 1=上传+裁剪 2=识别中 3=校验 4=结果
    imagePath: '',
    cropImage: '',
    recognizeResult: null,
    items: [],
    loading: false,
    saving: false,
    // 框选数据
    cropRect: {
      x: 0,
      y: 85,
      width: 100,
      height: 15
    },
    // 缩放
    scale: 1,
    scaleDisplay: '1.0',
    minScale: 1,
    maxScale: 3,
    // 拖动裁剪框
    isDragging: false,
    dragTarget: '',
    dragStartPos: { x: 0, y: 0 },
    dragStartRect: null,
    // 视口平移（缩放后拖动图片）
    panX: 0,
    panY: 0,
    isPanning: false,
    panStartPos: { x: 0, y: 0 },
    panStartOffset: { x: 0, y: 0 },
    // 图片显示尺寸
    imageWidth: 0,
    imageHeight: 0,
    // 校验页预览缩放
    previewScale: 1,
    previewScaleDisplay: '1.0',
    // 尺寸选择
    sizes: [
      { width: 58, height: 58, label: '58×58' },
      { width: 58, height: 87, label: '58×87' },
      { width: 58, height: 116, label: '58×116' },
      { width: 87, height: 116, label: '87×116' }
    ],
    selectedSizeIndex: -1,
    // 图纸名称
    drawingName: 'OCR识别图纸'
  },

  // ========== Step 1: 上传图纸 ==========

  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['original'],
      success: (res) => {
        const file = res.tempFiles[0];
        if (file.size > 20 * 1024 * 1024) {
          wx.showToast({ title: '图片不能超过20MB', icon: 'none' });
          return;
        }
        this.setData({
          imagePath: file.tempFilePath,
          step: 1,
          scale: 1,
          scaleDisplay: '1.0',
          panX: 0,
          panY: 0,
          cropRect: { x: 0, y: 85, width: 100, height: 15 }
        });
      }
    });
  },

  /**
   * 图片加载完成
   */
  onImageLoad() {
    const query = this.createSelectorQuery();
    query.select('.crop-inner')
      .boundingClientRect()
      .exec((res) => {
        if (!res[0]) return;
        this.setData({
          imageWidth: res[0].width,
          imageHeight: res[0].height
        });
      });
  },

  // ========== 视口平移（缩放时拖动图片） ==========

  onViewportTouchStart(e) {
    if (this.data.scale <= 1) return;
    const touch = e.touches[0];
    this.setData({
      isPanning: true,
      panStartPos: { x: touch.clientX, y: touch.clientY },
      panStartOffset: { x: this.data.panX, y: this.data.panY }
    });
  },

  onViewportTouchMove(e) {
    if (!this.data.isPanning) return;
    const touch = e.touches[0];
    const dx = touch.clientX - this.data.panStartPos.x;
    const dy = touch.clientY - this.data.panStartPos.y;
    // 视觉偏移 = translateOffset * scale，所以 translateOffset = 视觉偏移 / scale
    const s = this.data.scale;
    this.setData({
      panX: this.data.panStartOffset.x + dx / s,
      panY: this.data.panStartOffset.y + dy / s
    });
  },

  onViewportTouchEnd() {
    this.setData({ isPanning: false });
  },

  // ========== 缩放控制 ==========

  // ========== 缩放控制（滑块 + 自由输入） ==========

  onScaleSlider(e) {
    const val = Math.round(e.detail.value * 10) / 10;
    this.setData({
      scale: val,
      scaleDisplay: val.toFixed(1),
      panX: val <= 1 ? 0 : this.data.panX,
      panY: val <= 1 ? 0 : this.data.panY
    });
  },

  onScaleInput(e) {
    const raw = parseFloat(e.detail.value);
    if (isNaN(raw)) return;
    const val = Math.min(this.data.maxScale, Math.max(this.data.minScale, Math.round(raw * 10) / 10));
    this.setData({
      scale: val,
      scaleDisplay: val.toFixed(1),
      panX: val <= 1 ? 0 : this.data.panX,
      panY: val <= 1 ? 0 : this.data.panY
    });
  },

  // ========== 裁剪框拖动 ==========

  onHandleStart(e) {
    const handle = e.currentTarget.dataset.handle;
    const touch = e.touches[0];
    this.setData({
      isDragging: true,
      dragTarget: handle,
      dragStartPos: { x: touch.clientX, y: touch.clientY },
      dragStartRect: { ...this.data.cropRect }
    });
  },

  onHandleMove(e) {
    if (!this.data.isDragging) return;

    const touch = e.touches[0];
    const rect = this.data.dragStartRect;
    const start = this.data.dragStartPos;
    const imgW = this.data.imageWidth;
    const imgH = this.data.imageHeight;

    if (!imgW || !imgH) return;

    // 像素差 → 图片百分比（乘以缩放比例）
    const s = this.data.scale;
    const deltaX = ((touch.clientX - start.x) / (imgW * s)) * 100;
    const deltaY = ((touch.clientY - start.y) / (imgH * s)) * 100;

    let newRect = { ...rect };
    const handle = this.data.dragTarget;

    if (handle === 'nw') {
      newRect.x = Math.max(0, rect.x + deltaX);
      newRect.y = Math.max(0, rect.y + deltaY);
      newRect.width = Math.max(2, rect.width - deltaX);
      newRect.height = Math.max(2, rect.height - deltaY);
    } else if (handle === 'ne') {
      newRect.y = Math.max(0, rect.y + deltaY);
      newRect.width = Math.max(2, rect.width + deltaX);
      newRect.height = Math.max(2, rect.height - deltaY);
    } else if (handle === 'sw') {
      newRect.x = Math.max(0, rect.x + deltaX);
      newRect.width = Math.max(2, rect.width - deltaX);
      newRect.height = Math.max(2, rect.height + deltaY);
    } else if (handle === 'se') {
      newRect.width = Math.max(2, rect.width + deltaX);
      newRect.height = Math.max(2, rect.height + deltaY);
    }

    newRect.x = Math.min(newRect.x, 100 - newRect.width);
    newRect.y = Math.min(newRect.y, 100 - newRect.height);

    this.setData({ cropRect: newRect });
  },

  onHandleEnd() {
    this.setData({
      isDragging: false,
      dragTarget: '',
      dragStartPos: { x: 0, y: 0 },
      dragStartRect: null
    });
  },

  onDragStart(e) {
    const touch = e.touches[0];
    this.setData({
      isDragging: true,
      dragTarget: 'move',
      dragStartPos: { x: touch.clientX, y: touch.clientY },
      dragStartRect: { ...this.data.cropRect }
    });
  },

  onDragMove(e) {
    if (!this.data.isDragging || this.data.dragTarget !== 'move') return;

    const touch = e.touches[0];
    const rect = this.data.dragStartRect;
    const start = this.data.dragStartPos;
    const imgW = this.data.imageWidth;
    const imgH = this.data.imageHeight;

    if (!imgW || !imgH) return;

    const s = this.data.scale;
    const deltaX = ((touch.clientX - start.x) / (imgW * s)) * 100;
    const deltaY = ((touch.clientY - start.y) / (imgH * s)) * 100;

    let newRect = { ...rect };
    newRect.x = Math.max(0, Math.min(100 - rect.width, rect.x + deltaX));
    newRect.y = Math.max(0, Math.min(100 - rect.height, rect.y + deltaY));

    this.setData({ cropRect: newRect });
  },

  onDragEnd() {
    this.setData({
      isDragging: false,
      dragTarget: '',
      dragStartPos: { x: 0, y: 0 },
      dragStartRect: null
    });
  },

  // ========== 预设按钮 ==========

  onPreset15() {
    this.setData({ cropRect: { x: 0, y: 85, width: 100, height: 15 } });
  },

  onPreset20() {
    this.setData({ cropRect: { x: 0, y: 80, width: 100, height: 20 } });
  },

  onPreset25() {
    this.setData({ cropRect: { x: 0, y: 75, width: 100, height: 25 } });
  },

  onPreset100() {
    this.setData({ cropRect: { x: 0, y: 0, width: 100, height: 100 } });
  },

  // ========== 裁剪和识别 ==========

  /**
   * 直接传原图 + 裁剪坐标给后端，后端用 sharp 裁剪后 OCR
   */
  onCropAndRecognize() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先上传图纸', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    const rect = this.data.cropRect;
    const apiBaseUrl = getApp().globalData.apiBaseUrl;
    const url = `${apiBaseUrl}/api/bead/ocr/recognize`;
    console.log('[OCR前端] 开始上传, url:', url, '裁剪:', JSON.stringify(rect));

    wx.uploadFile({
      url: `${apiBaseUrl}/api/bead/ocr/recognize`,
      filePath: this.data.imagePath,
      name: 'image',
      formData: {
        cropX: rect.x,
        cropY: rect.y,
        cropWidth: rect.width,
        cropHeight: rect.height
      },
      success: (uploadRes) => {
        console.log('[OCR前端] 上传成功, statusCode:', uploadRes.statusCode, 'data:', uploadRes.data.substring(0, 200));
        let data;
        try {
          data = JSON.parse(uploadRes.data);
        } catch (e) {
          this.setData({ loading: false });
          console.error('服务端响应解析失败:', uploadRes.statusCode, uploadRes.data.substring(0, 200));
          wx.showToast({ title: '服务端错误(' + uploadRes.statusCode + ')', icon: 'none' });
          return;
        }
        if (data.success) {
          const result = data.data;
          // 用 Canvas 生成本地裁剪预览图
          this._generateCropPreview(() => {
            if (result.items && result.items.length > 0) {
              // 过滤无效色号：只保留色卡中存在的色号，并校准格式（A01→A1）
              const calibratedItems = result.items
                .filter(item => calibrateCode(item.code))
                .map(item => ({ ...item, code: calibrateCode(item.code) }));
              if (calibratedItems.length > 0) {
                const filtered = result.items.length - calibratedItems.length;
                if (filtered > 0) {
                  wx.showToast({ title: `已过滤 ${filtered} 条无效色号`, icon: 'none', duration: 2000 });
                }
                this.setData({
                  step: 3,
                  recognizeResult: result,
                  items: calibratedItems,
                  previewScale: 1,
                  loading: false
                });
              } else {
                this.setData({
                  step: 3,
                  items: [],
                  recognizeResult: null,
                  previewScale: 1,
                  loading: false
                });
                wx.showToast({ title: '未识别到有效色号', icon: 'none' });
              }
            } else {
              this.setData({
                step: 3,
                items: [],
                recognizeResult: null,
                previewScale: 1,
                loading: false
              });
            }
          });
        } else {
          this.setData({ loading: false });
          wx.showToast({ title: data.message || '识别失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('[OCR前端] 上传失败:', err);
        this.setData({ loading: false });
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    });
  },

  // ========== Step 2: OCR 识别 ==========

  async doRecognize(imagePath) {
    try {
      const apiBaseUrl = getApp().globalData.apiBaseUrl;
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${apiBaseUrl}/api/bead/ocr/recognize`,
          filePath: imagePath,
          name: 'image',
          success: (res) => {
            const data = JSON.parse(res.data);
            if (data.success) resolve(data.data);
            else reject(new Error(data.message));
          },
          fail: reject
        });
      });

      if (uploadRes.items && uploadRes.items.length > 0) {
        // 过滤无效色号：只保留色卡中存在的色号，并校准格式（A01→A1）
        const calibratedItems = uploadRes.items
          .filter(item => calibrateCode(item.code))
          .map(item => ({ ...item, code: calibrateCode(item.code) }));
        if (calibratedItems.length > 0) {
          const filtered = uploadRes.items.length - calibratedItems.length;
          if (filtered > 0) {
            wx.showToast({ title: `已过滤 ${filtered} 条无效色号`, icon: 'none', duration: 2000 });
          }
          this.setData({
            step: 3,
            recognizeResult: uploadRes,
            items: calibratedItems,
            loading: false
          });
        } else {
          this.setData({
            step: 3,
            items: [],
            recognizeResult: null,
            loading: false
          });
          wx.showToast({ title: '未识别到有效色号', icon: 'none' });
        }
      } else {
        this.setData({
          step: 3,
          items: [],
          recognizeResult: null,
          loading: false
        });
      }
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '识别失败', icon: 'none' });
    }
  },

  // ========== Step 3: 人工校验 ==========

  onItemInput(e) {
    const { index, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const items = this.data.items;
    if (field === 'count') {
      items[index].count = Number(value) || 0;
    } else if (field === 'code') {
      // 色号输入时实时校验
      const trimmed = value.trim().toUpperCase();
      items[index].code = trimmed;
      items[index].invalid = trimmed && !calibrateCode(trimmed);
    } else {
      items[index][field] = value;
    }
    this.setData({ items });
  },

  onDeleteItem(e) {
    const index = e.currentTarget.dataset.index;
    const items = this.data.items;
    items.splice(index, 1);
    this.setData({ items });
  },

  onAddItem() {
    const items = this.data.items;
    items.push({ code: '', name: '', count: 0 });
    this.setData({ items });
  },

  onBackToAdjust() {
    this.setData({ step: 1 });
  },

  onAddLegend() {
    const items = [{ code: '', name: '', count: 0 }];
    this.setData({ items });
  },

  onSizeSelect(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ selectedSizeIndex: index });
  },

  onConfirmItems() {
    // 过滤有效物料：色号必须在色卡中，数量大于0
    const validItems = this.data.items.filter(item => {
      const code = calibrateCode(item.code);
      return code && item.count > 0;
    });
    if (validItems.length === 0) {
      wx.showToast({ title: '请至少填写一条有效色号数据', icon: 'none' });
      return;
    }

    // 检查无效色号
    const invalidItems = this.data.items.filter(item => item.code && !calibrateCode(item.code));

    if (this.data.selectedSizeIndex === -1) {
      wx.showToast({ title: '请选择图纸尺寸', icon: 'none' });
      return;
    }

    // 校准色号格式后进入下一步
    const calibratedItems = validItems.map(item => ({
      ...item,
      code: calibrateCode(item.code)
    }));

    if (invalidItems.length > 0) {
      wx.showToast({ title: `已忽略 ${invalidItems.length} 条无效色号`, icon: 'none', duration: 2000 });
    }

    const totalBeads = calibratedItems.reduce((sum, m) => sum + m.count, 0);
    this.setData({
      step: 4,
      items: calibratedItems,
      totalBeads
    });
  },

  // ========== Step 4: 结果 ==========

  onDrawingNameInput(e) {
    this.setData({ drawingName: e.detail.value });
  },

  onCopyMaterials() {
    const text = this.data.items
      .map(m => `${m.code} ${m.name || ''} ${m.count}颗`)
      .join('\n');
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制用料清单', icon: 'success' })
    });
  },

  async onSaveToLibrary() {
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    try {
      const apiBaseUrl = getApp().globalData.apiBaseUrl;
      const materials = this.data.items.map((m, i) => ({
        color_code: m.code,
        color_name: m.name || '',
        quantity: m.count,
        sort_order: i + 1
      }));
      const selectedSize = this.data.sizes[this.data.selectedSizeIndex];

      await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${apiBaseUrl}/api/bead/ocr/save`,
          filePath: this.data.imagePath,
          name: 'pixelImage',
          formData: {
            userId,
            width: selectedSize.width,
            height: selectedSize.height,
            name: this.data.drawingName || 'OCR识别图纸',
            materials: JSON.stringify(materials)
          },
          success: (res) => {
            try {
              const data = JSON.parse(res.data);
              if (data.success) resolve(data);
              else reject(new Error(data.message));
            } catch (e) {
              reject(new Error('响应解析失败'));
            }
          },
          fail: reject
        });
      });

      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
    this.setData({ saving: false });
  },

  // ========== 校验页预览缩放 ==========

  /**
   * 用 Canvas 生成本地裁剪预览图（纯前端，不存后端）
   */
  _generateCropPreview(callback) {
    const rect = this.data.cropRect;
    // 完整图片没有裁剪预览
    if (rect.width >= 100 && rect.height >= 100 && rect.x <= 0 && rect.y <= 0) {
      this.setData({ cropImage: '' });
      callback && callback();
      return;
    }

    const query = this.createSelectorQuery();
    query.select('#cropCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          this.setData({ cropImage: '' });
          callback && callback();
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const img = canvas.createImage();

        img.onload = () => {
          const cropX = Math.floor(img.width * (rect.x / 100));
          const cropY = Math.floor(img.height * (rect.y / 100));
          const cropW = Math.floor(img.width * (rect.width / 100));
          const cropH = Math.floor(img.height * (rect.height / 100));

          canvas.width = cropW;
          canvas.height = cropH;
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          wx.canvasToTempFilePath({
            canvas,
            fileType: 'png',
            quality: 1,
            success: (tempRes) => {
              this.setData({ cropImage: tempRes.tempFilePath });
              callback && callback();
            },
            fail: () => {
              this.setData({ cropImage: '' });
              callback && callback();
            }
          });
        };

        img.onerror = () => {
          this.setData({ cropImage: '' });
          callback && callback();
        };

        img.src = this.data.imagePath;
      });
  },

  onPreviewScaleSlider(e) {
    const val = Math.round(e.detail.value * 10) / 10;
    this.setData({ previewScale: val, previewScaleDisplay: val.toFixed(1) });
  },

  onReset() {
    this.setData({
      step: 1,
      imagePath: '',
      cropImage: '',
      recognizeResult: null,
      items: [],
      totalBeads: 0,
      scale: 1,
      scaleDisplay: '1.0',
      panX: 0,
      panY: 0,
      cropRect: { x: 0, y: 85, width: 100, height: 15 },
      selectedSizeIndex: -1,
      drawingName: 'OCR识别图纸'
    });
  }
});