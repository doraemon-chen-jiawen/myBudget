# 拼豆模块 V1.2 简化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将拼豆模块从全功能版本精简为核心闭环：OCR 识别图例 → 确认结果 → 个人图纸列表 → 统计消耗量 → 豆子出入库。隐藏图片转像素、公开图纸库、收藏、分类等入口，代码保留。

**Architecture:** 纯前端 UI 层精简 + 极少量后端适配。4 Tab 结构不变（首页统计 + 豆仓 + 图纸个人列表 + 我的），已完成后端 API 不动，仅新增 `is_assembled` 字段和 2 个轻量接口。

**Tech Stack:** 微信原生小程序（WXML/WXSS/JS）、Express + MySQL 后端

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `backend/src/scripts/bead-tables.sql` | 追加 | ALTER TABLE 添加 is_assembled 字段 |
| `backend/src/dao/bead-drawing.dao.js` | 修改 | listConversions 增加筛选 + getConversionDetail + updateAssembled + deleteConversion |
| `backend/src/services/bead-drawing.service.js` | 修改 | 同步 dao 层新方法 |
| `backend/src/controllers/bead-drawing.controller.js` | 修改 | 新增 3 个 controller 方法 |
| `backend/src/routes/bead.js` | 修改 | 新增 3 条路由 |
| `backend/src/controllers/bead-ocr.controller.js` | 修改 | saveOcrResult 接受 width/height |
| `frontend/miniprogram/custom-tab-bar/index.js` | 修改 | bead 组文案调整 |
| `frontend/miniprogram/pages/bead/index/index.json` | 修改 | 导航栏标题 |
| `frontend/miniprogram/pages/bead/index/index.js` | 重写 | 改为统计概览 |
| `frontend/miniprogram/pages/bead/index/index.wxml` | 重写 | 统计卡片布局 |
| `frontend/miniprogram/pages/bead/index/index.wxss` | 重写 | 统计页样式 |
| `frontend/miniprogram/pages/bead/drawing/drawing.json` | 修改 | 导航栏标题 |
| `frontend/miniprogram/pages/bead/drawing/drawing.js` | 重写 | 个人图纸列表逻辑 |
| `frontend/miniprogram/pages/bead/drawing/drawing.wxml` | 重写 | 个人图纸列表布局 |
| `frontend/miniprogram/pages/bead/drawing/drawing.wxss` | 修改 | 新增标签样式 |
| `frontend/miniprogram/pages/bead/ocr/ocr.js` | 修改 | 校验步骤增加尺寸选择 |
| `frontend/miniprogram/pages/bead/ocr/ocr.wxml` | 修改 | 校验步骤增加尺寸选择UI |
| `frontend/miniprogram/pages/bead/drawing-detail/drawing-detail.js` | 修改 | 支持 source=conversion 加载 |
| `frontend/miniprogram/pages/bead/drawing-detail/drawing-detail.wxml` | 修改 | 收藏按钮条件渲染 |
| `frontend/miniprogram/pages/bead/profile/profile.js` | 修改 | 精简菜单列表 |
| `frontend/miniprogram/pages/bead/profile/profile.wxml` | 修改 | 精简菜单 |

---

### Task 1: 后端 — user_conversions 扩展 + 接口适配

**Files:**
- Modify: `backend/src/scripts/bead-tables.sql`
- Modify: `backend/src/dao/bead-drawing.dao.js`
- Modify: `backend/src/services/bead-drawing.service.js`
- Modify: `backend/src/controllers/bead-drawing.controller.js`
- Modify: `backend/src/routes/bead.js`
- Modify: `backend/src/controllers/bead-ocr.controller.js`

- [ ] **Step 1: 添加 is_assembled 字段**

在 `backend/src/scripts/bead-tables.sql` 末尾追加：

```sql
-- V1.2: 个人图纸增加拼接状态
ALTER TABLE user_conversions ADD COLUMN is_assembled TINYINT DEFAULT 0 COMMENT '是否已拼接：0未拼 1已拼';

-- 为 user_conversions 添加名称可编辑支持（如需）
ALTER TABLE user_conversions ADD COLUMN original_image VARCHAR(500) DEFAULT NULL COMMENT '原图路径';
```

- [ ] **Step 2: 修改 DAO 层 — 增强 listConversions + 新增 3 个方法**

在 `backend/src/dao/bead-drawing.dao.js` 末尾 `module.exports` 之前追加：

```js
/**
 * 查询用户转换记录（增强版：支持尺寸+拼接状态筛选）
 */
async function listConversionsEnhanced({ userId, page, pageSize, size, isAssembled }) {
  const where = ["uc.user_id = ?"];
  const params = [userId];

  if (size) {
    const parts = size.split('x');
    if (parts.length === 2) {
      where.push("(uc.width = ? AND uc.height = ?)");
      params.push(Number(parts[0]), Number(parts[1]));
    }
  }

  if (isAssembled !== undefined && isAssembled !== null && isAssembled !== '') {
    where.push("uc.is_assembled = ?");
    params.push(Number(isAssembled));
  }

  const whereClause = `WHERE ${where.join(" AND ")}`;
  const offset = (page - 1) * pageSize;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM user_conversions uc ${whereClause}`,
    params
  );

  const [rows] = await pool.query(
    `SELECT uc.*,
      (SELECT COUNT(*) FROM conversion_materials cm WHERE cm.conversion_id = uc.id) as material_count,
      (SELECT SUM(cm.quantity) FROM conversion_materials cm WHERE cm.conversion_id = uc.id) as total_beads
    FROM user_conversions uc
    ${whereClause}
    ORDER BY uc.created_at DESC
    LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return { total: countRows[0].total, page, pageSize, list: rows };
}

/**
 * 获取单条转换记录详情（含用料清单）
 */
async function getConversionDetail(id) {
  const [rows] = await pool.query(
    "SELECT * FROM user_conversions WHERE id = ?",
    [id]
  );
  if (rows.length === 0) return null;
  const conversion = rows[0];

  const [materials] = await pool.query(
    "SELECT * FROM conversion_materials WHERE conversion_id = ? ORDER BY sort_order ASC",
    [id]
  );
  conversion.materials = materials;

  return conversion;
}

/**
 * 更新拼接状态
 */
async function updateAssembled(id, isAssembled) {
  await pool.query(
    "UPDATE user_conversions SET is_assembled = ? WHERE id = ?",
    [isAssembled ? 1 : 0, id]
  );
}

/**
 * 删除转换记录（含用料清单）
 */
async function deleteConversion(id) {
  await pool.query("DELETE FROM conversion_materials WHERE conversion_id = ?", [id]);
  await pool.query("DELETE FROM user_conversions WHERE id = ?", [id]);
}
```

更新 `module.exports`：

```js
module.exports = {
  findDrawings, findDrawingById, findAllTags,
  findFavorites, addFavorite, removeFavorite,
  saveConversion, listConversions,
  listConversionsEnhanced, getConversionDetail, updateAssembled, deleteConversion
};
```

- [ ] **Step 3: 修改 Service 层**

在 `backend/src/services/bead-drawing.service.js` 末尾 `module.exports` 之前追加：

```js
async function listConversionsEnhanced({ userId, page, pageSize, size, isAssembled }) {
  return beadDrawingDao.listConversionsEnhanced({ userId, page, pageSize, size, isAssembled });
}

async function getConversionDetail(id) {
  return beadDrawingDao.getConversionDetail(id);
}

async function updateAssembled(id, isAssembled) {
  return beadDrawingDao.updateAssembled(id, isAssembled);
}

async function deleteConversion(id) {
  return beadDrawingDao.deleteConversion(id);
}
```

更新 `module.exports`：

```js
module.exports = {
  list, detail, listTags, listFavorites, addFavorite, removeFavorite,
  saveConversion, listConversions,
  listConversionsEnhanced, getConversionDetail, updateAssembled, deleteConversion
};
```

- [ ] **Step 4: 修改 Controller 层**

在 `backend/src/controllers/bead-drawing.controller.js` 末尾 `module.exports` 之前追加：

```js
async function listConversionsEnhanced(req, res) {
  const { userId, page = 1, pageSize = 20, size, isAssembled } = req.query;
  const data = await beadDrawingService.listConversionsEnhanced({
    userId: Number(userId),
    page: Number(page),
    pageSize: Number(pageSize),
    size: size || null,
    isAssembled: isAssembled !== undefined ? isAssembled : null
  });
  return ok(res, data);
}

async function getConversionDetail(req, res) {
  const data = await beadDrawingService.getConversionDetail(Number(req.params.id));
  if (!data) {
    const AppError = require("../utils/app-error");
    throw new AppError(404, "E_NOT_FOUND", "图纸不存在");
  }
  return ok(res, data);
}

async function updateAssembled(req, res) {
  const { id } = req.params;
  const { isAssembled } = req.body;
  await beadDrawingService.updateAssembled(Number(id), isAssembled);
  return ok(res, true, "状态已更新");
}

async function deleteConversion(req, res) {
  const { id } = req.params;
  await beadDrawingService.deleteConversion(Number(id));
  return ok(res, true, "已删除");
}
```

更新 `module.exports`：

```js
module.exports = {
  list, detail, listTags, listFavorites, addFavorite, removeFavorite,
  saveConversion, listConversions,
  listConversionsEnhanced, getConversionDetail, updateAssembled, deleteConversion
};
```

- [ ] **Step 5: 新增路由**

在 `backend/src/routes/bead.js` 的 `// 用户转换记录` 区域追加：

```js
// 用户转换记录（增强版 — V1.2 图纸列表）
router.get("/conversions/enhanced", asyncHandler(beadDrawingController.listConversionsEnhanced));
router.get("/conversions/:id", asyncHandler(beadDrawingController.getConversionDetail));
router.put("/conversions/:id/assembled", asyncHandler(beadDrawingController.updateAssembled));
router.delete("/conversions/:id", asyncHandler(beadDrawingController.deleteConversion));
```

注意：`/conversions/enhanced` 必须在 `/conversions/:id` 之前注册，避免 `enhanced` 被当作 id 参数。

- [ ] **Step 6: 修改 OCR 保存接口支持 width/height**

修改 `backend/src/controllers/bead-ocr.controller.js` 中 `saveOcrResult` 函数：

```js
async function saveOcrResult(req, res) {
  const { userId, width, height, name, materials } = req.body;
  const pixelImage = req.file ? req.file.path : null;

  const widthNum = Number(width) || 58;
  const heightNum = Number(height) || 58;
  const { pool } = require("../config/db");
  const [result] = await pool.query(
    "INSERT INTO user_conversions (user_id, name, width, height, pixel_image, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
    [Number(userId), name || 'OCR识别图纸', widthNum, heightNum, pixelImage]
  );

  if (materials && materials.length > 0) {
    const values = materials.map((m, i) => [
      result.insertId, m.color_code, m.color_name, m.quantity, i + 1
    ]);
    await pool.query(
      "INSERT INTO conversion_materials (conversion_id, color_code, color_name, quantity, sort_order) VALUES ?",
      [values]
    );
  }

  return ok(res, { id: result.insertId }, "保存成功");
}
```

- [ ] **Step 7: 验证**

```bash
cd backend
# 执行 ALTER TABLE SQL
mysql -u root -p your_db < src/scripts/bead-tables.sql
# 启动后端确认无报错
npm start
```

预期：后端正常启动，新增接口可访问。

- [ ] **Step 8: Commit**

```
feat(bead): 后端 user_conversions 扩展拼接状态 + 转换记录增强接口
```

---

### Task 2: Custom TabBar — bead 组文案调整

**Files:**
- Modify: `frontend/miniprogram/custom-tab-bar/index.js`

- [ ] **Step 1: 修改 bead 组 tab 配置**

修改 `frontend/miniprogram/custom-tab-bar/index.js` 中 `tabConfig.bead` 数组：

```js
bead: [
  { pagePath: '/pages/bead/index/index', text: '首页', icon: '📊', activeIcon: '📊' },
  { pagePath: '/pages/bead/warehouse/warehouse', text: '豆仓', icon: '🫘', activeIcon: '🫘' },
  { pagePath: '/pages/bead/drawing/drawing', text: '图纸', icon: '📐', activeIcon: '📐' },
  { pagePath: '/pages/bead/profile/profile', text: '我的', icon: '👤', activeIcon: '👤' }
]
```

变更：首页 icon 从 `🏠` 改为 `📊`（统计仪表盘含义）。其余保持不变。

- [ ] **Step 2: 验证**

切换到拼豆模块，确认 TabBar 4 个 Tab 正常显示，图标文案正确。

- [ ] **Step 3: Commit**

```
refactor(bead): TabBar 首页 icon 改为统计仪表盘
```

---

### Task 3: 首页改为统计概览页

**Files:**
- Modify: `frontend/miniprogram/pages/bead/index/index.json`
- Rewrite: `frontend/miniprogram/pages/bead/index/index.js`
- Rewrite: `frontend/miniprogram/pages/bead/index/index.wxml`
- Rewrite: `frontend/miniprogram/pages/bead/index/index.wxss`

- [ ] **Step 1: 修改页面配置**

`frontend/miniprogram/pages/bead/index/index.json`：

```json
{
  "navigationBarTitleText": "拼豆助手",
  "enablePullDownRefresh": true
}
```

（标题不变，保持「拼豆助手」）

- [ ] **Step 2: 重写 JS**

`frontend/miniprogram/pages/bead/index/index.js`：

```js
const { request } = require("../../../utils/request");

Page({
  data: {
    stats: {
      totalQuantity: 0,
      colorCount: 0,
      lowStock: 0,
      outOfStock: 0
    },
    hasAlert: false,
    loading: true,
    conversionCount: 0
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabs();
    }
    this.loadStats();
  },

  async loadStats() {
    const userId = wx.getStorageSync('userId');
    if (!userId) {
      this.setData({ loading: false });
      return;
    }

    try {
      const data = await request({
        url: '/bead/inventory',
        method: 'GET',
        data: { userId },
        silent: true
      });

      const stats = data.stats || data;
      const hasAlert = (stats.lowStock || 0) > 0 || (stats.outOfStock || 0) > 0;

      this.setData({
        stats: {
          totalQuantity: stats.totalQuantity || 0,
          colorCount: stats.colorCount || 0,
          lowStock: stats.lowStock || 0,
          outOfStock: stats.outOfStock || 0
        },
        hasAlert,
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  onPullDownRefresh() {
    this.loadStats().then(() => wx.stopPullDownRefresh());
  }
});
```

- [ ] **Step 3: 重写 WXML**

`frontend/miniprogram/pages/bead/index/index.wxml`：

```xml
<view class="stats-page">
  <!-- 头部标题 -->
  <view class="header-section">
    <view class="header-content">
      <text class="header-title">拼豆助手</text>
      <text class="header-sub">库存概览</text>
    </view>
  </view>

  <!-- 统计卡片 -->
  <view class="stats-grid">
    <view class="stat-card">
      <text class="stat-value">{{stats.totalQuantity}}</text>
      <text class="stat-label">库存总量</text>
    </view>
    <view class="stat-card">
      <text class="stat-value">{{stats.colorCount}}</text>
      <text class="stat-label">颜色种类</text>
    </view>
    <view class="stat-card {{stats.lowStock > 0 ? 'stat-card-warn' : ''}}">
      <text class="stat-value">{{stats.lowStock}}</text>
      <text class="stat-label">低库存</text>
    </view>
    <view class="stat-card {{stats.outOfStock > 0 ? 'stat-card-danger' : ''}}">
      <text class="stat-value">{{stats.outOfStock}}</text>
      <text class="stat-label">缺货</text>
    </view>
  </view>

  <!-- 库存预警提示 -->
  <view wx:if="{{hasAlert}}" class="alert-card" bindtap="goToWarehouse">
    <view class="alert-left">
      <text class="alert-icon">⚠️</text>
      <view class="alert-text-wrap">
        <text class="alert-title">库存预警</text>
        <text class="alert-desc">有 {{stats.lowStock}} 种低库存、{{stats.outOfStock}} 种缺货豆子</text>
      </view>
    </view>
    <text class="alert-arrow">›</text>
  </view>

  <!-- 快捷入口 -->
  <view class="quick-section">
    <view class="quick-card" bindtap="goToOcr" hover-class="quick-card-active">
      <text class="quick-icon">🔍</text>
      <view class="quick-text-wrap">
        <text class="quick-title">图纸识别</text>
        <text class="quick-desc">上传图纸，OCR识别图例</text>
      </view>
      <text class="quick-arrow">›</text>
    </view>
  </view>

  <!-- 免责声明 -->
  <view class="disclaimer">
    <text class="disclaimer-text">本工具仅供个人手工创作参考，禁止商用</text>
  </view>
</view>
```

注意：需要在 JS 中补充跳转方法：

```js
goToWarehouse() {
  wx.switchTab({ url: '/pages/bead/warehouse/warehouse' });
},

goToOcr() {
  wx.navigateTo({ url: '/pages/bead/ocr/ocr' });
}
```

- [ ] **Step 4: 重写 WXSS**

`frontend/miniprogram/pages/bead/index/index.wxss`：

```css
.stats-page {
  min-height: 100vh;
  background: #FAF7F2;
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* 头部 */
.header-section {
  background: linear-gradient(165deg, #F2994A 0%, #F2C94C 100%);
  padding: 48rpx 40rpx 64rpx;
  border-radius: 0 0 40rpx 40rpx;
  position: relative;
  overflow: hidden;
}

.header-section::before {
  content: '';
  position: absolute;
  top: -60rpx;
  right: -40rpx;
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.header-content {
  position: relative;
  z-index: 2;
}

.header-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #ffffff;
}

.header-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 8rpx;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  padding: 32rpx;
  margin-top: -32rpx;
  position: relative;
  z-index: 3;
}

.stat-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(45, 42, 38, 0.05);
  transition: transform 0.15s;
}

.stat-card:active {
  transform: scale(0.97);
}

.stat-value {
  display: block;
  font-size: 48rpx;
  font-weight: 700;
  color: #2D2A26;
  margin-bottom: 8rpx;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: #B8B0A4;
}

.stat-card-warn {
  border-left: 6rpx solid #F2994A;
}

.stat-card-warn .stat-value {
  color: #F2994A;
}

.stat-card-danger {
  border-left: 6rpx solid #FF6B6B;
}

.stat-card-danger .stat-value {
  color: #FF6B6B;
}

/* 预警卡片 */
.alert-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 32rpx 24rpx;
  padding: 28rpx;
  background: #FFF7ED;
  border-radius: 20rpx;
  border: 1rpx solid rgba(242, 153, 74, 0.15);
}

.alert-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.alert-icon {
  font-size: 36rpx;
  margin-right: 16rpx;
}

.alert-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #F2994A;
}

.alert-desc {
  display: block;
  font-size: 22rpx;
  color: #C68A4A;
  margin-top: 4rpx;
}

.alert-arrow {
  font-size: 40rpx;
  color: #D4A574;
}

/* 快捷入口 */
.quick-section {
  padding: 0 32rpx;
}

.quick-card {
  display: flex;
  align-items: center;
  padding: 28rpx;
  background: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(45, 42, 38, 0.05);
  transition: transform 0.15s;
}

.quick-card-active {
  transform: scale(0.97);
  background: rgba(242, 153, 74, 0.04);
}

.quick-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
}

.quick-text-wrap {
  flex: 1;
}

.quick-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #2D2A26;
}

.quick-desc {
  display: block;
  font-size: 22rpx;
  color: #B8B0A4;
  margin-top: 4rpx;
}

.quick-arrow {
  font-size: 40rpx;
  color: #D4CCC0;
}

/* 免责声明 */
.disclaimer {
  text-align: center;
  padding: 60rpx 32rpx 40rpx;
}

.disclaimer-text {
  font-size: 22rpx;
  color: #CCC4B8;
}
```

- [ ] **Step 5: 验证**

进入拼豆模块首页，确认：
1. 显示 4 个统计卡片（库存总量、颜色种类、低库存、缺货）
2. 有低库存/缺货时显示预警卡片
3. 点击预警卡片跳转豆仓
4. 点击「图纸识别」跳转 OCR 页
5. 下拉刷新正常

- [ ] **Step 6: Commit**

```
refactor(bead): 首页改为统计概览仪表盘
```

---

### Task 4: 图纸 Tab 改为个人图纸列表

**Files:**
- Modify: `frontend/miniprogram/pages/bead/drawing/drawing.json`
- Rewrite: `frontend/miniprogram/pages/bead/drawing/drawing.js`
- Rewrite: `frontend/miniprogram/pages/bead/drawing/drawing.wxml`
- Modify: `frontend/miniprogram/pages/bead/drawing/drawing.wxss`

- [ ] **Step 1: 修改页面配置**

`frontend/miniprogram/pages/bead/drawing/drawing.json`：

```json
{
  "navigationBarTitleText": "我的图纸",
  "enablePullDownRefresh": true
}
```

- [ ] **Step 2: 重写 JS**

`frontend/miniprogram/pages/bead/drawing/drawing.js`：

```js
const { request } = require("../../../utils/request");

Page({
  data: {
    sizes: [
      { key: '', label: '全部' },
      { key: '58x58', label: '58×58' },
      { key: '58x87', label: '58×87' },
      { key: '58x116', label: '58×116' },
      { key: '87x116', label: '87×116' }
    ],
    selectedSize: '',
    assembledOptions: [
      { key: '', label: '全部' },
      { key: '0', label: '未拼接' },
      { key: '1', label: '已拼接' }
    ],
    selectedAssembled: '',
    drawingList: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    hasMore: true
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().initTabs();
    }
    this.loadDrawings(true);
  },

  async loadDrawings(refresh = false) {
    if (this.data.loading) return;
    const page = refresh ? 1 : this.data.page;
    if (!refresh && !this.data.hasMore) return;

    const userId = wx.getStorageSync('userId');
    if (!userId) return;

    this.setData({ loading: true });
    try {
      const params = {
        userId,
        page,
        pageSize: this.data.pageSize
      };
      if (this.data.selectedSize) params.size = this.data.selectedSize;
      if (this.data.selectedAssembled !== '') params.isAssembled = this.data.selectedAssembled;

      const result = await request({
        url: '/bead/conversions/enhanced',
        method: 'GET',
        data: params,
        silent: true
      });

      const list = refresh ? (result.list || []) : [...this.data.drawingList, ...(result.list || [])];
      this.setData({
        drawingList: list,
        total: result.total || 0,
        page: page + 1,
        hasMore: list.length < (result.total || 0),
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  onSizeTap(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ selectedSize: key });
    this.loadDrawings(true);
  },

  onAssembledTap(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ selectedAssembled: key });
    this.loadDrawings(true);
  },

  onDrawingTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/bead/drawing-detail/drawing-detail?id=${id}&source=conversion` });
  },

  async onToggleAssembled(e) {
    const { id, assembled } = e.currentTarget.dataset;
    const newAssembled = assembled ? 0 : 1;

    try {
      await request({
        url: `/bead/conversions/${id}/assembled`,
        method: 'PUT',
        data: { isAssembled: newAssembled }
      });

      const drawingList = this.data.drawingList.map(item => {
        if (item.id === id) {
          return { ...item, is_assembled: newAssembled };
        }
        return item;
      });
      this.setData({ drawingList });
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  async onDeleteDrawing(e) {
    const id = e.currentTarget.dataset.id;
    const res = await new Promise(resolve => {
      wx.showModal({
        title: '确认删除',
        content: '删除后无法恢复，确定删除这张图纸吗？',
        confirmColor: '#FF6B6B',
        success: resolve
      });
    });

    if (!res.confirm) return;

    try {
      await request({
        url: `/bead/conversions/${id}`,
        method: 'DELETE'
      });
      wx.showToast({ title: '已删除', icon: 'success' });
      this.loadDrawings(true);
    } catch (e) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  },

  onPullDownRefresh() {
    this.loadDrawings(true).then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    this.loadDrawings();
  }
});
```

- [ ] **Step 3: 重写 WXML**

`frontend/miniprogram/pages/bead/drawing/drawing.wxml`：

```xml
<view class="drawing-page">
  <!-- 筛选区域 -->
  <view class="filter-section">
    <!-- 尺寸筛选 -->
    <view class="filter-row">
      <text class="filter-label">尺寸</text>
      <scroll-view scroll-x class="filter-scroll">
        <view
          wx:for="{{sizes}}"
          wx:key="key"
          class="filter-btn {{selectedSize === item.key ? 'filter-btn-active' : ''}}"
          data-key="{{item.key}}"
          bindtap="onSizeTap"
        >
          <text>{{item.label}}</text>
        </view>
      </scroll-view>
    </view>
    <!-- 拼接状态筛选 -->
    <view class="filter-row">
      <text class="filter-label">状态</text>
      <scroll-view scroll-x class="filter-scroll">
        <view
          wx:for="{{assembledOptions}}"
          wx:key="key"
          class="filter-btn {{selectedAssembled === item.key ? 'filter-btn-active' : ''}}"
          data-key="{{item.key}}"
          bindtap="onAssembledTap"
        >
          <text>{{item.label}}</text>
        </view>
      </scroll-view>
    </view>
  </view>

  <!-- 图纸列表 -->
  <view class="drawing-list">
    <view
      wx:for="{{drawingList}}"
      wx:key="id"
      class="drawing-card"
    >
      <!-- 左侧缩略图 -->
      <view class="drawing-thumb" data-id="{{item.id}}" bindtap="onDrawingTap">
        <image wx:if="{{item.pixel_image}}" class="thumb-img" src="{{item.pixel_image}}" mode="aspectFill" />
        <view wx:else class="thumb-placeholder">
          <text class="thumb-size">{{item.width}}×{{item.height}}</text>
        </view>
      </view>

      <!-- 右侧信息 -->
      <view class="drawing-info" data-id="{{item.id}}" bindtap="onDrawingTap">
        <text class="drawing-name">{{item.name || '未命名图纸'}}</text>
        <view class="drawing-tags">
          <text class="tag tag-size">{{item.width}}×{{item.height}}</text>
          <text class="tag {{item.is_assembled ? 'tag-assembled' : 'tag-pending'}}">
            {{item.is_assembled ? '已拼' : '未拼'}}
          </text>
        </view>
        <text class="drawing-meta">{{item.material_count || 0}} 种颜色 · {{item.total_beads || 0}} 颗</text>
      </view>

      <!-- 操作按钮 -->
      <view class="drawing-actions">
        <view class="action-btn" data-id="{{item.id}}" data-assembled="{{item.is_assembled}}" catchtap="onToggleAssembled">
          <text>{{item.is_assembled ? '✅' : '⬜'}}</text>
        </view>
        <view class="action-btn action-btn-del" data-id="{{item.id}}" catchtap="onDeleteDrawing">
          <text class="del-icon">🗑️</text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view wx:if="{{!loading && drawingList.length === 0}}" class="empty-state">
      <text class="empty-icon">📐</text>
      <text class="empty-text">暂无图纸</text>
      <text class="empty-hint">去「图纸识别」上传图纸开始吧</text>
    </view>

    <!-- 加载状态 -->
    <view wx:if="{{loading}}" class="loading-tip">
      <text class="loading-text">加载中...</text>
    </view>
    <view wx:elif="{{!hasMore && drawingList.length > 0}}" class="loading-tip">
      <text class="loading-text">没有更多了</text>
    </view>
  </view>
</view>
```

- [ ] **Step 4: 更新 WXSS — 替换样式**

`frontend/miniprogram/pages/bead/drawing/drawing.wxss`：

```css
.drawing-page {
  min-height: 100vh;
  background: #FAF7F2;
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* 筛选区域 */
.filter-section {
  padding: 20rpx 32rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 12rpx rgba(242, 153, 74, 0.06);
}

.filter-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-label {
  font-size: 24rpx;
  color: #B8B0A4;
  width: 56rpx;
  flex-shrink: 0;
  margin-right: 12rpx;
}

.filter-scroll {
  flex: 1;
  white-space: nowrap;
}

.filter-btn {
  display: inline-block;
  padding: 10rpx 28rpx;
  border-radius: 100rpx;
  background: #FAF7F2;
  font-size: 24rpx;
  color: #8C857C;
  margin-right: 12rpx;
  transition: all 0.3s;
}

.filter-btn-active {
  background: rgba(242, 153, 74, 0.12);
  color: #F2994A;
  font-weight: 600;
}

/* 图纸列表 */
.drawing-list {
  padding: 24rpx 32rpx;
}

.drawing-card {
  display: flex;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 16rpx rgba(45, 42, 38, 0.05);
  align-items: center;
}

/* 缩略图 */
.drawing-thumb {
  width: 140rpx;
  height: 140rpx;
  border-radius: 20rpx;
  overflow: hidden;
  margin-right: 20rpx;
  flex-shrink: 0;
  background: #FAF7F2;
}

.thumb-img {
  width: 140rpx;
  height: 140rpx;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(242, 153, 74, 0.06);
}

.thumb-size {
  font-size: 26rpx;
  font-weight: 700;
  color: #F2994A;
}

/* 信息区域 */
.drawing-info {
  flex: 1;
  min-width: 0;
}

.drawing-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #2D2A26;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8rpx;
}

.drawing-tags {
  display: flex;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.tag {
  font-size: 20rpx;
  padding: 4rpx 14rpx;
  border-radius: 100rpx;
}

.tag-size {
  color: #F2994A;
  background: rgba(242, 153, 74, 0.08);
}

.tag-assembled {
  color: #6FCF97;
  background: rgba(111, 207, 151, 0.12);
}

.tag-pending {
  color: #B8B0A4;
  background: rgba(184, 176, 164, 0.12);
}

.drawing-meta {
  display: block;
  font-size: 22rpx;
  color: #B8B0A4;
}

/* 操作按钮 */
.drawing-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-left: 12rpx;
}

.action-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

.action-btn-del {
  opacity: 0.5;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  opacity: 0.4;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #B8B0A4;
  margin-bottom: 8rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #CCC4B8;
}

/* 加载 */
.loading-tip {
  text-align: center;
  padding: 32rpx 0;
}

.loading-text {
  font-size: 24rpx;
  color: #CCC4B8;
}
```

- [ ] **Step 5: 验证**

切换到图纸 Tab，确认：
1. 显示筛选栏（尺寸 + 拼接状态）
2. 列表展示个人 OCR 识别的图纸
3. 卡片显示：缩略图、名称、尺寸标签、已拼/未拼标签、颜色数量摘要
4. 点击卡片进入详情
5. 点击 ✅ 切换拼接状态
6. 点击 🗑️ 可删除图纸
7. 筛选功能正常

- [ ] **Step 6: Commit**

```
refactor(bead): 图纸 Tab 改为个人图纸列表，支持尺寸/拼接状态筛选
```

---

### Task 5: OCR 识别增加尺寸选择步骤

**Files:**
- Modify: `frontend/miniprogram/pages/bead/ocr/ocr.js`
- Modify: `frontend/miniprogram/pages/bead/ocr/ocr.wxml`

- [ ] **Step 1: JS — 增加 data 字段和尺寸选择逻辑**

在 `ocr.js` 的 `data` 中追加：

```js
// 尺寸选择
sizes: [
  { width: 58, height: 58, label: '58×58' },
  { width: 58, height: 87, label: '58×87' },
  { width: 58, height: 116, label: '58×116' },
  { width: 87, height: 116, label: '87×116' }
],
selectedSizeIndex: -1,
```

在 `ocr.js` 中追加方法：

```js
onSizeSelect(e) {
  const index = e.currentTarget.dataset.index;
  this.setData({ selectedSizeIndex: index });
},
```

- [ ] **Step 2: JS — 修改 onConfirmItems，增加尺寸校验**

将 `onConfirmItems` 修改为：

```js
onConfirmItems() {
  const validItems = this.data.items.filter(item => item.code && item.count > 0);
  if (validItems.length === 0) {
    wx.showToast({ title: '至少保留一条有效数据', icon: 'none' });
    return;
  }

  if (this.data.selectedSizeIndex === -1) {
    wx.showToast({ title: '请选择图纸尺寸', icon: 'none' });
    return;
  }

  const totalBeads = validItems.reduce((sum, m) => sum + m.count, 0);
  this.setData({
    step: 4,
    items: validItems,
    totalBeads
  });
},
```

- [ ] **Step 3: JS — 修改 onSaveToLibrary，传递 width/height**

将 `onSaveToLibrary` 中的保存逻辑修改为：

```js
const selectedSize = this.data.sizes[this.data.selectedSizeIndex];

await new Promise((resolve, reject) => {
  wx.request({
    url: `${apiBaseUrl}/api/bead/ocr/save`,
    method: 'POST',
    data: {
      userId,
      width: selectedSize.width,
      height: selectedSize.height,
      name: 'OCR识别图纸',
      materials
    },
    success: (res) => {
      if (res.data.success) resolve(res.data);
      else reject(new Error(res.data.message));
    },
    fail: reject
  });
});
```

- [ ] **Step 4: WXML — 在校验步骤（step 3）中增加尺寸选择**

在 `ocr.wxml` 的 `<!-- Step 3: 人工校验 -->` 中，在 `<button class="convert-btn" bindtap="onConfirmItems">确认无误</button>` 之前插入尺寸选择区域：

```xml
<!-- 尺寸选择 -->
<view class="size-select-card">
  <text class="section-label">选择图纸尺寸</text>
  <view class="size-options">
    <view
      wx:for="{{sizes}}"
      wx:key="label"
      class="size-option {{selectedSizeIndex === index ? 'size-option-active' : ''}}"
      data-index="{{index}}"
      bindtap="onSizeSelect"
    >
      <text class="size-option-text">{{item.label}}</text>
    </view>
  </view>
</view>
```

- [ ] **Step 5: WXSS — 追加尺寸选择样式**

在 `ocr.wxss` 末尾追加：

```css
/* 尺寸选择 */
.size-select-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin: 20rpx 0;
  box-shadow: 0 2rpx 16rpx rgba(45, 42, 38, 0.05);
}

.size-options {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.size-option {
  flex: 1;
  padding: 20rpx 0;
  text-align: center;
  border-radius: 16rpx;
  background: #FAF7F2;
  transition: all 0.3s;
}

.size-option-active {
  background: rgba(242, 153, 74, 0.15);
  box-shadow: 0 2rpx 12rpx rgba(242, 153, 74, 0.2);
}

.size-option-text {
  font-size: 26rpx;
  color: #8C857C;
}

.size-option-active .size-option-text {
  color: #F2994A;
  font-weight: 600;
}
```

- [ ] **Step 6: 验证**

进入 OCR 页面，确认：
1. Step 3 校验页面底部新增「选择图纸尺寸」区域
2. 必须选择尺寸才能点击「确认无误」
3. 保存时传递正确的 width/height
4. 未选尺寸时点击确认给出提示

- [ ] **Step 7: Commit**

```
feat(bead): OCR 识别流程增加图纸尺寸选择步骤
```

---

### Task 6: 图纸详情页适配 conversion 类型

**Files:**
- Modify: `frontend/miniprogram/pages/bead/drawing-detail/drawing-detail.js`
- Modify: `frontend/miniprogram/pages/bead/drawing-detail/drawing-detail.wxml`

- [ ] **Step 1: JS — 根据 source 参数加载不同数据源**

在 `drawing-detail.js` 的 `onLoad` 中，检查 `options.source`：

```js
onLoad(options) {
  const id = options.id;
  const source = options.source || 'drawing'; // 'drawing' 或 'conversion'
  this.setData({ id, source });
  if (source === 'conversion') {
    this.loadConversionDetail(id);
  } else {
    this.loadDrawingDetail(id);
  }
},

async loadConversionDetail(id) {
  try {
    const data = await request({
      url: `/bead/conversions/${id}`,
      method: 'GET'
    });
    this.setData({
      drawing: {
        ...data,
        preview_image: data.pixel_image || data.original_image,
        tags: []
      },
      materials: data.materials || [],
      isConversion: true
    });
  } catch (e) {
    wx.showToast({ title: '加载失败', icon: 'none' });
  }
},
```

在 data 中追加：

```js
source: 'drawing',
isConversion: false,
```

- [ ] **Step 2: WXML — 收藏按钮条件渲染**

将收藏按钮的显示条件改为：

```xml
<!-- 收藏按钮仅对公共图纸显示 -->
<view wx:if="{{!isConversion}}" class="detail-action" bindtap="onToggleFavorite">
  ...
</view>
```

- [ ] **Step 3: 验证**

从图纸列表点击个人图纸，确认：
1. 详情页正确加载转换记录数据
2. 不显示收藏按钮
3. 用料清单正常展示
4. 复制清单、核对库存功能正常

- [ ] **Step 4: Commit**

```
refactor(bead): 图纸详情页支持 conversion 类型数据源
```

---

### Task 7: 我的页面精简

**Files:**
- Modify: `frontend/miniprogram/pages/bead/profile/profile.js`
- Modify: `frontend/miniprogram/pages/bead/profile/profile.wxml`

- [ ] **Step 1: JS — 精简菜单列表**

修改 `profile.js` 中 `data.menuList`：

```js
menuList: [
  { key: 'ocr', name: '图纸识别', icon: '🔍', desc: '上传图纸识别图例', hasAlert: false },
  { key: 'orderOcr', name: '订单入库', icon: '📦', desc: 'OCR识别订单批量入库', hasAlert: false },
  { key: 'alert', name: '库存预警', icon: '🔔', desc: '设置预警阈值', hasAlert: false },
  { key: 'log', name: '库存日志', icon: '📋', desc: '查看出入库记录', hasAlert: false }
],
```

修改 `onMenuTap` 中的路由：

```js
onMenuTap(e) {
  const key = e.currentTarget.dataset.key;
  const routes = {
    ocr: '/pages/bead/ocr/ocr',
    orderOcr: '/pages/bead/order-ocr/order-ocr',
    alert: '/pages/bead/alert-settings/alert-settings',
    log: '/pages/bead/inventory-logs/inventory-logs'
  };

  if (routes[key]) {
    wx.navigateTo({ url: routes[key] });
  }
},
```

- [ ] **Step 2: WXML 无需修改**（菜单已通过 `menuList` 数据驱动渲染）

- [ ] **Step 3: 验证**

进入我的页面，确认：
1. 菜单只有 4 项：图纸识别、订单入库、库存预警、库存日志
2. 每个入口跳转正确
3. 切换模块和退出登录正常
4. 不显示收藏、转换记录、像素编辑器入口

- [ ] **Step 4: Commit**

```
refactor(bead): 我的页面精简菜单，仅保留核心功能入口
```

---

## 自检结果

**1. Spec 覆盖：**
- ✅ D1 4 Tab 结构 → Task 2
- ✅ D2 首页统计概览 → Task 3
- ✅ D3 个人图纸列表 + 尺寸/拼接状态筛选 → Task 4
- ✅ D4 OCR 尺寸选择 → Task 5
- ✅ D4 识别记录合并进图纸 Tab → Task 4（图纸 Tab 直接展示 conversions）
- ✅ D5 我的页面精简 → Task 7
- ✅ 图纸详情适配 → Task 6

**2. 占位符扫描：** 无 TBD/TODO

**3. 类型一致性：**
- 后端 `listConversionsEnhanced` 入参与前端 `/bead/conversions/enhanced` 调用参数一致
- OCR 保存 `width/height` 字段前后端一致
- conversion detail 响应字段与前端使用一致
