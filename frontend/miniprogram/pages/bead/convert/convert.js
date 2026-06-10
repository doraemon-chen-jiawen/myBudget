const { request } = require("../../../utils/request");

// MARD 221 标准拼豆色卡（221种颜色）
const MARD_221_COLORS = [
  { code: 'A1', name: '淡奶黄', r: 250, g: 245, b: 205 },
  { code: 'A2', name: '奶黄色', r: 252, g: 254, b: 214 },
  { code: 'A3', name: '柠檬黄', r: 252, g: 255, b: 146 },
  { code: 'A4', name: '明黄色', r: 247, g: 236, b: 92 },
  { code: 'A5', name: '金黄色', r: 240, g: 216, b: 58 },
  { code: 'A6', name: '橘黄色', r: 253, g: 169, b: 81 },
  { code: 'A7', name: '橙色', r: 250, g: 140, b: 79 },
  { code: 'A8', name: '向日葵黄', r: 251, g: 218, b: 77 },
  { code: 'A9', name: '肉橙色', r: 247, g: 157, b: 95 },
  { code: 'A10', name: '深橙色', r: 244, g: 126, b: 56 },
  { code: 'A11', name: '浅杏色', r: 254, g: 219, b: 153 },
  { code: 'A12', name: '桃橙色', r: 253, g: 162, b: 118 },
  { code: 'A13', name: '琥珀黄', r: 254, g: 198, b: 103 },
  { code: 'A14', name: '朱红色', r: 247, g: 88, b: 66 },
  { code: 'A15', name: '亮黄色', r: 251, g: 246, b: 94 },
  { code: 'A16', name: '浅黄色', r: 254, g: 255, b: 151 },
  { code: 'A17', name: '芥末黄', r: 253, g: 225, b: 115 },
  { code: 'A18', name: '驼色', r: 252, g: 191, b: 128 },
  { code: 'A19', name: '珊瑚粉', r: 253, g: 126, b: 119 },
  { code: 'A20', name: '橘金色', r: 249, g: 214, b: 102 },
  { code: 'A21', name: '杏黄色', r: 250, g: 227, b: 147 },
  { code: 'A22', name: '黄绿色', r: 237, g: 248, b: 120 },
  { code: 'A23', name: '米驼色', r: 228, g: 200, b: 186 },
  { code: 'A24', name: '浅草黄', r: 243, g: 246, b: 169 },
  { code: 'A25', name: '荧光黄', r: 253, g: 247, b: 133 },
  { code: 'A26', name: '橙黄色', r: 255, g: 199, b: 52 },
  { code: 'B1', name: '黄绿色', r: 223, g: 241, b: 59 },
  { code: 'B2', name: '翠绿色', r: 100, g: 243, b: 67 },
  { code: 'B3', name: '浅绿色', r: 161, g: 245, b: 134 },
  { code: 'B4', name: '草绿色', r: 95, g: 223, b: 52 },
  { code: 'B5', name: '亮绿色', r: 57, g: 225, b: 88 },
  { code: 'B6', name: '薄荷绿', r: 100, g: 224, b: 164 },
  { code: 'B7', name: '松石绿', r: 62, g: 174, b: 124 },
  { code: 'B8', name: '深绿色', r: 29, g: 155, b: 84 },
  { code: 'B9', name: '墨绿色', r: 42, g: 80, b: 55 },
  { code: 'B10', name: '浅水绿', r: 154, g: 209, b: 186 },
  { code: 'B11', name: '橄榄绿', r: 98, g: 112, b: 50 },
  { code: 'B12', name: '森林绿', r: 26, g: 110, b: 61 },
  { code: 'B13', name: '嫩绿色', r: 200, g: 232, b: 125 },
  { code: 'B14', name: '青绿色', r: 171, g: 232, b: 79 },
  { code: 'B15', name: '暗绿色', r: 48, g: 83, b: 53 },
  { code: 'B16', name: '苹果绿', r: 192, g: 237, b: 156 },
  { code: 'B17', name: '苔绿色', r: 158, g: 179, b: 62 },
  { code: 'B18', name: '荧光绿', r: 230, g: 237, b: 79 },
  { code: 'B19', name: '孔雀绿', r: 38, g: 183, b: 142 },
  { code: 'B20', name: '粉绿色', r: 203, g: 236, b: 207 },
  { code: 'B21', name: '青色', r: 24, g: 97, b: 106 },
  { code: 'B22', name: '深青色', r: 10, g: 66, b: 65 },
  { code: 'B23', name: '暗草绿', r: 52, g: 59, b: 26 },
  { code: 'B24', name: '嫩黄绿', r: 232, g: 250, b: 166 },
  { code: 'B25', name: '灰绿色', r: 78, g: 132, b: 109 },
  { code: 'B26', name: '军绿色', r: 144, g: 124, b: 53 },
  { code: 'B27', name: '浅橄榄', r: 208, g: 224, b: 175 },
  { code: 'B28', name: '翡翠绿', r: 158, g: 229, b: 187 },
  { code: 'B29', name: '草绿黄', r: 198, g: 223, b: 95 },
  { code: 'B30', name: '淡绿黄', r: 227, g: 251, b: 177 },
  { code: 'B31', name: '豆绿色', r: 180, g: 230, b: 145 },
  { code: 'B32', name: '黄绿灰', r: 146, g: 173, b: 96 },
  { code: 'C1', name: '淡青色', r: 240, g: 254, b: 228 },
  { code: 'C2', name: '浅蓝色', r: 171, g: 248, b: 254 },
  { code: 'C3', name: '天蓝色', r: 162, g: 224, b: 247 },
  { code: 'C4', name: '湖蓝色', r: 68, g: 205, b: 251 },
  { code: 'C5', name: '海蓝色', r: 6, g: 170, b: 223 },
  { code: 'C6', name: '钴蓝色', r: 84, g: 167, b: 233 },
  { code: 'C7', name: '宝蓝色', r: 57, g: 119, b: 202 },
  { code: 'C8', name: '藏蓝色', r: 15, g: 82, b: 189 },
  { code: 'C9', name: '深蓝色', r: 51, g: 73, b: 195 },
  { code: 'C10', name: '孔雀蓝', r: 60, g: 188, b: 227 },
  { code: 'C11', name: '青蓝色', r: 42, g: 222, b: 211 },
  { code: 'C12', name: '深藏蓝', r: 30, g: 51, b: 78 },
  { code: 'C13', name: '粉蓝色', r: 205, g: 231, b: 254 },
  { code: 'C14', name: '浅水蓝', r: 213, g: 252, b: 247 },
  { code: 'C15', name: '湖蓝绿', r: 33, g: 197, b: 196 },
  { code: 'C16', name: '靛蓝色', r: 24, g: 88, b: 162 },
  { code: 'C17', name: '冰蓝色', r: 2, g: 209, b: 243 },
  { code: 'C18', name: '深灰蓝', r: 33, g: 50, b: 68 },
  { code: 'C19', name: '蓝绿色', r: 24, g: 134, b: 157 },
  { code: 'C20', name: '矢车菊蓝', r: 26, g: 112, b: 169 },
  { code: 'C21', name: '雾蓝色', r: 188, g: 221, b: 252 },
  { code: 'C22', name: '灰蓝色', r: 107, g: 177, b: 187 },
  { code: 'C23', name: '淡蓝灰', r: 200, g: 226, b: 253 },
  { code: 'C24', name: '浅蓝灰', r: 126, g: 197, b: 249 },
  { code: 'C25', name: '水绿色', r: 169, g: 232, b: 224 },
  { code: 'C26', name: '青灰色', r: 66, g: 173, b: 207 },
  { code: 'C27', name: '薰衣蓝', r: 208, g: 222, b: 249 },
  { code: 'C28', name: '灰蓝灰', r: 189, g: 206, b: 232 },
  { code: 'C29', name: '深紫蓝', r: 54, g: 74, b: 137 },
  { code: 'D1', name: '淡紫色', r: 172, g: 183, b: 239 },
  { code: 'D2', name: '紫罗兰', r: 134, g: 141, b: 211 },
  { code: 'D3', name: '蓝色紫', r: 53, g: 84, b: 175 },
  { code: 'D4', name: '深蓝紫', r: 22, g: 45, b: 123 },
  { code: 'D5', name: '紫红色', r: 179, g: 78, b: 198 },
  { code: 'D6', name: '浅紫红', r: 179, g: 123, b: 220 },
  { code: 'D7', name: '暗紫色', r: 135, g: 88, b: 169 },
  { code: 'D8', name: '淡粉紫', r: 227, g: 210, b: 254 },
  { code: 'D9', name: '薰衣草', r: 213, g: 185, b: 244 },
  { code: 'D10', name: '深紫色', r: 48, g: 26, b: 73 },
  { code: 'D11', name: '灰紫色', r: 190, g: 185, b: 226 },
  { code: 'D12', name: '粉紫色', r: 220, g: 153, b: 206 },
  { code: 'D13', name: '紫红色', r: 181, g: 3, b: 141 },
  { code: 'D14', name: '深紫红', r: 134, g: 41, b: 147 },
  { code: 'D15', name: '靛紫色', r: 47, g: 31, b: 140 },
  { code: 'D16', name: '淡紫灰', r: 226, g: 228, b: 240 },
  { code: 'D17', name: '浅紫蓝', r: 199, g: 211, b: 249 },
  { code: 'D18', name: '中紫色', r: 154, g: 100, b: 184 },
  { code: 'D19', name: '藕荷色', r: 216, g: 194, b: 217 },
  { code: 'D20', name: '葡萄紫', r: 154, g: 53, b: 173 },
  { code: 'D21', name: '紫罗兰紫', r: 148, g: 5, b: 149 },
  { code: 'D22', name: '蓝紫色', r: 56, g: 56, b: 154 },
  { code: 'D23', name: '浅紫粉', r: 234, g: 219, b: 248 },
  { code: 'D24', name: '紫蓝色', r: 118, g: 138, b: 225 },
  { code: 'D25', name: '蓝紫灰', r: 73, g: 80, b: 194 },
  { code: 'D26', name: '灰紫灰', r: 214, g: 198, b: 235 },
  { code: 'E1', name: '肉粉色', r: 246, g: 212, b: 203 },
  { code: 'E2', name: '粉色', r: 252, g: 193, b: 221 },
  { code: 'E3', name: '粉紫色', r: 246, g: 189, b: 232 },
  { code: 'E4', name: '玫瑰粉', r: 232, g: 100, b: 158 },
  { code: 'E5', name: '桃红色', r: 240, g: 86, b: 159 },
  { code: 'E6', name: '玫红色', r: 235, g: 65, b: 114 },
  { code: 'E7', name: '深玫红', r: 197, g: 54, b: 116 },
  { code: 'E8', name: '浅粉色', r: 253, g: 219, b: 233 },
  { code: 'E9', name: '粉紫红', r: 227, g: 118, b: 199 },
  { code: 'E10', name: '深粉色', r: 209, g: 59, b: 149 },
  { code: 'E11', name: '肉色', r: 247, g: 218, b: 212 },
  { code: 'E12', name: '浅玫红', r: 246, g: 147, b: 191 },
  { code: 'E13', name: '紫红色', r: 181, g: 2, b: 106 },
  { code: 'E14', name: '杏粉色', r: 250, g: 212, b: 191 },
  { code: 'E15', name: '浅玫粉', r: 245, g: 201, b: 202 },
  { code: 'E16', name: '米白色', r: 251, g: 244, b: 236 },
  { code: 'E17', name: '浅粉色', r: 247, g: 227, b: 236 },
  { code: 'E18', name: '桃粉色', r: 249, g: 200, b: 219 },
  { code: 'E19', name: '粉红色', r: 246, g: 187, b: 209 },
  { code: 'E20', name: '灰粉色', r: 215, g: 198, b: 206 },
  { code: 'E21', name: '深灰粉', r: 192, g: 157, b: 164 },
  { code: 'E22', name: '藕粉色', r: 179, g: 140, b: 159 },
  { code: 'E23', name: '灰紫粉', r: 147, g: 125, b: 138 },
  { code: 'E24', name: '淡紫色', r: 222, g: 190, b: 229 },
  { code: 'F1', name: '珊瑚红', r: 254, g: 147, b: 129 },
  { code: 'F2', name: '红色', r: 246, g: 61, b: 75 },
  { code: 'F3', name: '朱红色', r: 238, g: 78, b: 62 },
  { code: 'F4', name: '正红色', r: 251, g: 42, b: 64 },
  { code: 'F5', name: '深红色', r: 225, g: 3, b: 40 },
  { code: 'F6', name: '暗红色', r: 145, g: 54, b: 53 },
  { code: 'F7', name: '酒红色', r: 145, g: 25, b: 50 },
  { code: 'F8', name: '暗红色', r: 187, g: 1, b: 38 },
  { code: 'F9', name: '粉红色', r: 224, g: 103, b: 122 },
  { code: 'F10', name: '棕色', r: 135, g: 70, b: 40 },
  { code: 'F11', name: '深棕色', r: 89, g: 35, b: 35 },
  { code: 'F12', name: '玫瑰红', r: 243, g: 83, b: 107 },
  { code: 'F13', name: '橙红色', r: 244, g: 92, b: 69 },
  { code: 'F14', name: '浅粉色', r: 252, g: 173, b: 178 },
  { code: 'F15', name: '大红色', r: 213, g: 5, b: 39 },
  { code: 'F16', name: '肤色', r: 248, g: 192, b: 169 },
  { code: 'F17', name: '肉橙色', r: 232, g: 155, b: 125 },
  { code: 'F18', name: '黄棕色', r: 208, g: 127, b: 74 },
  { code: 'F19', name: '暗红色', r: 190, g: 69, b: 74 },
  { code: 'F20', name: '灰红色', r: 198, g: 148, b: 149 },
  { code: 'F21', name: '粉色', r: 242, g: 184, b: 198 },
  { code: 'F22', name: '浅粉红', r: 247, g: 195, b: 208 },
  { code: 'F23', name: '橙粉色', r: 237, g: 128, b: 108 },
  { code: 'F24', name: '玫粉色', r: 224, g: 157, b: 175 },
  { code: 'F25', name: '火红色', r: 232, g: 72, b: 84 },
  { code: 'G1', name: '肤色', r: 255, g: 228, b: 211 },
  { code: 'G2', name: '浅肤色', r: 252, g: 198, b: 172 },
  { code: 'G3', name: '杏色', r: 241, g: 196, b: 165 },
  { code: 'G4', name: '棕色', r: 220, g: 179, b: 135 },
  { code: 'G5', name: '黄棕色', r: 231, g: 179, b: 78 },
  { code: 'G6', name: '金棕色', r: 227, g: 160, b: 20 },
  { code: 'G7', name: '深棕色', r: 152, g: 92, b: 58 },
  { code: 'G8', name: '栗色', r: 113, g: 61, b: 47 },
  { code: 'G9', name: '驼色', r: 228, g: 182, b: 133 },
  { code: 'G10', name: '焦糖色', r: 218, g: 140, b: 66 },
  { code: 'G11', name: '卡其色', r: 218, g: 200, b: 152 },
  { code: 'G12', name: '橙杏色', r: 254, g: 201, b: 147 },
  { code: 'G13', name: '咖啡色', r: 178, g: 113, b: 75 },
  { code: 'G14', name: '深咖啡', r: 139, g: 104, b: 76 },
  { code: 'G15', name: '米色', r: 246, g: 248, b: 227 },
  { code: 'G16', name: '奶白色', r: 242, g: 216, b: 193 },
  { code: 'G17', name: '深驼色', r: 119, g: 84, b: 78 },
  { code: 'G18', name: '浅肤色', r: 255, g: 227, b: 213 },
  { code: 'G19', name: '橘棕色', r: 221, g: 125, b: 65 },
  { code: 'G20', name: '红棕色', r: 165, g: 69, b: 47 },
  { code: 'G21', name: '土黄色', r: 179, g: 133, b: 97 },
  { code: 'H1', name: '白色', r: 255, g: 255, b: 255 },
  { code: 'H2', name: '灰白色', r: 251, g: 251, b: 251 },
  { code: 'H3', name: '浅灰色', r: 180, g: 180, b: 180 },
  { code: 'H4', name: '中灰色', r: 135, g: 135, b: 135 },
  { code: 'H5', name: '深灰色', r: 70, g: 70, b: 72 },
  { code: 'H6', name: '炭灰色', r: 44, g: 44, b: 44 },
  { code: 'H8', name: '藕荷灰', r: 231, g: 214, b: 220 },
  { code: 'H9', name: '浅灰色', r: 239, g: 237, b: 238 },
  { code: 'H10', name: '银灰色', r: 235, g: 235, b: 235 },
  { code: 'H11', name: '灰色', r: 205, g: 205, b: 205 },
  { code: 'H12', name: '米白色', r: 253, g: 246, b: 238 },
  { code: 'H13', name: '浅灰粉', r: 244, g: 237, b: 241 },
  { code: 'H14', name: '灰绿色', r: 206, g: 215, b: 212 },
  { code: 'H15', name: '青灰色', r: 154, g: 166, b: 166 },
  { code: 'H16', name: '黑色', r: 27, g: 18, b: 19 },
  { code: 'H17', name: '亮灰色', r: 240, g: 238, b: 239 },
  { code: 'H18', name: '象牙白', r: 252, g: 255, b: 246 },
  { code: 'H19', name: '米灰色', r: 242, g: 238, b: 229 },
  { code: 'H20', name: '灰蓝色', r: 150, g: 160, b: 159 },
  { code: 'H21', name: '浅黄白', r: 248, g: 251, b: 230 },
  { code: 'H22', name: '蓝灰色', r: 202, g: 202, b: 210 },
  { code: 'H23', name: '灰绿色', r: 155, g: 156, b: 148 },
  { code: 'M1', name: '灰绿色', r: 187, g: 198, b: 182 },
  { code: 'M2', name: '深灰绿', r: 144, g: 153, b: 148 },
  { code: 'M3', name: '青灰色', r: 105, g: 126, b: 129 },
  { code: 'M4', name: '米驼色', r: 224, g: 212, b: 188 },
  { code: 'M5', name: '灰米色', r: 209, g: 204, b: 175 },
  { code: 'M6', name: '橄榄灰', r: 176, g: 170, b: 134 },
  { code: 'M7', name: '灰驼色', r: 176, g: 167, b: 150 },
  { code: 'M8', name: '灰红色', r: 174, g: 128, b: 130 },
  { code: 'M9', name: '灰棕色', r: 166, g: 136, b: 98 },
  { code: 'M10', name: '灰粉色', r: 196, g: 179, b: 187 },
  { code: 'M11', name: '灰紫色', r: 157, g: 118, b: 147 },
  { code: 'M12', name: '深灰紫', r: 100, g: 75, b: 81 },
  { code: 'M13', name: '驼色', r: 199, g: 146, b: 102 },
  { code: 'M14', name: '红棕色', r: 194, g: 117, b: 99 },
  { code: 'M15', name: '灰青色', r: 116, g: 125, b: 122 }
];

// 尺寸选项（宽×高，单位：颗）
const SIZE_OPTIONS = [
  { width: 58, height: 58, label: '58×58 (小)' },
  { width: 58, height: 87, label: '58×87 (中)' },
  { width: 58, height: 116, label: '58×116 (大)' },
  { width: 87, height: 116, label: '87×116 (特大)' }
];

Page({
  data: {
    // 步骤控制
    step: 1, // 1=上传 2=预处理 3=结果
    // 上传
    imagePath: '',
    // 预处理
    sizeOptions: SIZE_OPTIONS,
    selectedSizeIndex: 1, // 默认 58×87
    selectedWidth: 58,
    selectedHeight: 87,
    brightness: 100,
    contrast: 100,
    // 结果
    result: null,
    pixelImage: '',
    pixelData: [], // 2D 数组存储像素数据
    materials: [],
    totalBeads: 0,
    saving: false,
    // 频次
    remainCount: 10
  },

  onLoad() {
    this.loadRemainCount();
    this.canvasCtx = null;
  },

  async loadRemainCount() {
    // TODO: 从后端获取当日剩余次数
    this.setData({ remainCount: 10 });
  },

  // ========== Step 1: 图片上传 ==========

  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles[0];
        if (file.size > 5 * 1024 * 1024) {
          wx.showToast({ title: '图片不能超过5MB', icon: 'none' });
          return;
        }
        this.setData({ imagePath: file.tempFilePath });
      }
    });
  },

  onConfirmUpload() {
    if (!this.data.imagePath) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    this.setData({ step: 2 });
  },

  // ========== Step 2: 预处理 + 尺寸选择 ==========

  onSizeTap(e) {
    const index = e.currentTarget.dataset.index;
    const selected = SIZE_OPTIONS[index];
    this.setData({
      selectedSizeIndex: index,
      selectedWidth: selected.width,
      selectedHeight: selected.height
    });
  },

  onBrightnessChange(e) {
    this.setData({ brightness: Number(e.detail.value) });
  },

  onContrastChange(e) {
    this.setData({ contrast: Number(e.detail.value) });
  },

  async onStartConvert() {
    if (this.data.remainCount <= 0) {
      wx.showToast({ title: '今日转换次数已用完', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '转换中...' });
    try {
      const result = await this.doPixelConvert();
      this.setData({
        step: 3,
        result,
        pixelImage: result.pixelImage,
        pixelData: result.pixelData,
        materials: result.materials,
        totalBeads: result.totalBeads,
        remainCount: this.data.remainCount - 1
      });
    } catch (e) {
      console.error('转换失败:', e);
      wx.showToast({ title: '转换失败', icon: 'none' });
    }
    wx.hideLoading();
  },

  // ========== 像素化算法 ==========

  doPixelConvert() {
    return new Promise((resolve, reject) => {
      const query = this.createSelectorQuery();
      query.select('#convertCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) {
            reject(new Error('Canvas 获取失败'));
            return;
          }
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const { selectedWidth: width, selectedHeight: height } = this.data;

          canvas.width = width;
          canvas.height = height;

          const img = canvas.createImage();
          img.onload = () => {
            // 计算裁剪区域（保持比例居中裁剪）
            const srcSize = Math.min(img.width, img.height);
            const sx = (img.width - srcSize) / 2;
            const sy = (img.height - srcSize) / 2;

            // 应用亮度对比度
            ctx.filter = `brightness(${this.data.brightness}%) contrast(${this.data.contrast}%)`;
            ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, width, height);
            ctx.filter = 'none';

            // 读取像素数据
            const imageData = ctx.getImageData(0, 0, width, height);
            const pixels = imageData.data;

            // 颜色量化：匹配标准色卡 + 构建 2D 像素数组
            const colorCountMap = {};
            const pixelData = [];

            for (let y = 0; y < height; y++) {
              const row = [];
              for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];

                // 透明像素用 null 表示
                if (a < 128) {
                  row.push(null);
                  continue;
                }

                const matched = this.matchColor(r, g, b);
                row.push(matched.code);

                // 统计颜色数量
                const key = matched.code;
                if (!colorCountMap[key]) {
                  colorCountMap[key] = { ...matched, count: 0 };
                }
                colorCountMap[key].count++;

                // 写回匹配后的颜色
                pixels[i] = matched.r;
                pixels[i + 1] = matched.g;
                pixels[i + 2] = matched.b;
              }
              pixelData.push(row);
            }

            ctx.putImageData(imageData, 0, 0);

            // 生成像素图纸临时文件
            wx.canvasToTempFilePath({
              canvas,
              success: (tempRes) => {
                // 汇总用料清单
                const materials = Object.values(colorCountMap)
                  .sort((a, b) => b.count - a.count)
                  .map((item, index) => ({
                    color_code: item.code,
                    color_name: item.name,
                    quantity: item.count,
                    sort_order: index + 1
                  }));
                const totalBeads = materials.reduce((sum, m) => sum + m.quantity, 0);

                resolve({
                  pixelImage: tempRes.tempFilePath,
                  pixelData,
                  materials,
                  totalBeads,
                  width,
                  height
                });
              },
              fail: reject
            });
          };
          img.onerror = reject;
          img.src = this.data.imagePath;
        });
    });
  },

  /**
   * 匹配最近的标准色（欧氏距离）
   */
  matchColor(r, g, b) {
    let minDist = Infinity;
    let matched = MARD_221_COLORS[0];
    for (const color of MARD_221_COLORS) {
      const dr = r - color.r;
      const dg = g - color.g;
      const db = b - color.b;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < minDist) {
        minDist = dist;
        matched = color;
      }
    }
    return matched;
  },

  // ========== Step 3: 结果操作 ==========

  onDownload() {
    if (!this.data.pixelImage) return;
    wx.saveImageToPhotosAlbum({
      filePath: this.data.pixelImage,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: () => wx.showToast({ title: '保存失败', icon: 'none' })
    });
  },

  onCopyMaterials() {
    const text = this.data.materials
      .map(m => `${m.color_code} ${m.color_name} ${m.quantity}颗`)
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
      // 上传像素图纸图片
      const uploadRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${getApp().globalData.apiBaseUrl}/api/bead/conversions`,
          filePath: this.data.pixelImage,
          name: 'pixelImage',
          formData: {
            userId,
            width: this.data.selectedWidth,
            height: this.data.selectedHeight,
            materials: JSON.stringify(this.data.materials)
          },
          success: (res) => {
            const data = JSON.parse(res.data);
            if (data.success) resolve(data);
            else reject(new Error(data.message));
          },
          fail: reject
        });
      });

      wx.showToast({ title: '已保存到我的图纸', icon: 'success' });
    } catch (e) {
      console.error('保存失败:', e);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
    this.setData({ saving: false });
  },

  onReset() {
    this.setData({
      step: 1,
      imagePath: '',
      result: null,
      pixelImage: '',
      pixelData: [],
      materials: [],
      totalBeads: 0
    });
  }
});
