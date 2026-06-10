# 拼接状态切换交互优化 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 drawing-detail 详情页的拼接状态切换从 info-row 内的小文字标签改为底部固定悬浮大按钮，加入二次确认弹窗，操作不可撤回。

**Architecture:** 删除 info-row 内的 assembled-toggle 小标签，新增底部固定悬浮栏组件，仅 conversion 来源显示。未拼状态显示橙色"标记为已拼"按钮，点击弹 wx.showModal 确认；已拼状态显示灰色"已完成"只读标签。

**Tech Stack:** 微信小程序原生 WXML/WXSS/JS

---

### Task 1: WXML — 删除旧标签，新增底部固定栏

**Files:**
- Modify: `frontend/miniprogram/pages/bead/drawing-detail/drawing-detail.wxml`

- [ ] **Step 1: 删除 info-row 中的 assembled-toggle 标签**

将第 22-25 行的旧标签删除：

```xml
<!-- 删除这段 -->
<!-- 拼接状态切换（仅 conversion 来源） -->
<view wx:if="{{isConversion}}" class="assembled-toggle {{drawing.is_assembled ? 'assembled-done' : 'assembled-pending'}}" bindtap="onToggleAssembled">
  <text>{{drawing.is_assembled ? '✅ 已完成' : '⬜ 未拼接'}}</text>
</view>
```

删除后 `info-row` 只保留：

```xml
<view class="info-row">
  <view class="info-tag">
    <text>{{drawing.width}}×{{drawing.height}}</text>
  </view>
  <text class="total-beads">共 {{drawing.totalBeads}} 颗豆子</text>
</view>
```

- [ ] **Step 2: 在 `detail-page` 闭合标签后、加载状态之前，新增底部固定栏**

在 `</view><!-- detail-page -->` 之前（免责声明之后）插入：

```xml
<!-- 底部拼接状态栏（仅 conversion 来源） -->
<view wx:if="{{isConversion}}" class="bottom-bar">
  <view wx:if="{{!drawing.is_assembled}}" class="bottom-bar-btn bottom-bar-btn--active" bindtap="onToggleAssembled">
    <text>标记为已拼</text>
  </view>
  <view wx:else class="bottom-bar-btn bottom-bar-btn--done">
    <text>✅ 已完成</text>
  </view>
</view>
```

注意：底部栏放在 `detail-page` 外面会导致 `wx:if` 判断问题，所以放在 `detail-page` 内部末尾（免责声明之后）。

- [ ] **Step 3: 验证 WXML 结构完整性**

确认最终 WXML 结构为：

```
detail-page
  ├── preview-section
  ├── info-card（无 assembled-toggle）
  ├── materials-card
  ├── action-section
  ├── disclaimer
  └── bottom-bar（仅 isConversion 时显示）
loading-page（独立 wx:if）
```

---

### Task 2: WXSS — 删除旧样式，新增底部栏样式

**Files:**
- Modify: `frontend/miniprogram/pages/bead/drawing-detail/drawing-detail.wxss`

- [ ] **Step 1: 删除 assembled-toggle 相关样式**

删除第 98-114 行的旧样式块：

```css
/* 拼接状态切换 */
.assembled-toggle {
  font-size: 22rpx;
  padding: 6rpx 20rpx;
  border-radius: 100rpx;
  font-weight: 500;
}

.assembled-done {
  background: rgba(76, 175, 130, 0.12);
  color: #4CAF82;
}

.assembled-pending {
  background: rgba(184, 176, 164, 0.1);
  color: #B8B0A4;
}
```

- [ ] **Step 2: 增加 detail-page 底部 padding**

将 `.detail-page` 的 `padding-bottom` 从 `40rpx` 改为 `160rpx`：

```css
.detail-page {
  min-height: 100vh;
  background: #FAF7F2;
  padding-bottom: 160rpx;
}
```

- [ ] **Step 3: 新增底部固定栏样式**

在文件末尾（`loading-text` 样式之后）添加：

```css
/* 底部拼接状态栏 */
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: #ffffff;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 16rpx rgba(45, 42, 38, 0.08);
}

.bottom-bar-btn {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20rpx;
  font-size: 30rpx;
  font-weight: 600;
  transition: transform 0.15s;
}

.bottom-bar-btn--active {
  background: #F2994A;
  color: #ffffff;
}

.bottom-bar-btn--active:active {
  transform: scale(0.97);
  opacity: 0.9;
}

.bottom-bar-btn--done {
  background: #F5F0E8;
  color: #B8B0A4;
}
```

---

### Task 3: JS — 改造 onToggleAssembled 加二次确认

**Files:**
- Modify: `frontend/miniprogram/pages/bead/drawing-detail/drawing-detail.js`

- [ ] **Step 1: 修改 onToggleAssembled 方法，加入 wx.showModal 二次确认**

将当前的 `onToggleAssembled` 方法：

```js
async onToggleAssembled() {
    const drawing = this.data.drawing;
    if (!drawing) return;

    const newAssembled = drawing.is_assembled ? 0 : 1;
    try {
      await request({
        url: `/bead/conversions/${this.data.id}/assembled`,
        method: 'PUT',
        data: { isAssembled: newAssembled }
      });
      this.setData({
        'drawing.is_assembled': newAssembled
      });
      wx.showToast({ title: newAssembled ? '已标记完成' : '已取消标记', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },
```

替换为：

```js
async onToggleAssembled() {
    const drawing = this.data.drawing;
    if (!drawing || drawing.is_assembled) return;

    const res = await new Promise(resolve => {
      wx.showModal({
        title: '确认',
        content: '确认已拼完这个图？此操作不可撤回',
        confirmText: '确认',
        cancelText: '取消',
        success: resolve
      });
    });

    if (!res.confirm) return;

    try {
      await request({
        url: `/bead/conversions/${this.data.id}/assembled`,
        method: 'PUT',
        data: { isAssembled: 1 }
      });
      this.setData({ 'drawing.is_assembled': 1 });
      wx.showToast({ title: '已标记完成', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },
```

关键改动：
- 方法开头增加 `drawing.is_assembled` 判断，已拼状态直接 return
- 弹窗确认后才调接口，`isAssembled` 固定传 `1`（单向操作，不再传 0）
- Toast 只保留"已标记完成"，去掉"已取消标记"

- [ ] **Step 2: 确认 JS 逻辑无遗漏**

检查点：
- ✅ 未拼状态点击 → 弹窗确认 → 调接口 → 设为已拼
- ✅ 已拼状态 → 按钮只读，`onToggleAssembled` 开头 return
- ✅ 弹窗取消 → 无操作
- ✅ 接口失败 → Toast 提示"操作失败"