# 拼接状态切换交互优化设计

> 日期：2026-06-10
> 模块：drawing-detail 详情页
> 问题：已拼/未拼状态切换标签太小、不显眼，用户无法感知可点击

## 现状问题

当前 `assembled-toggle` 仅是 `info-row` 内一个 `22rpx` 的小文字标签，与旁边灰色辅助文字混在一起，没有按钮感，用户无法识别可交互。

## 设计决策

**方案选择：A — 底部固定悬浮栏**

- 删除信息行中的旧 `assembled-toggle` 标签
- 底部固定栏承载拼接状态切换操作
- 未拼→已拼为单向不可撤回操作，需二次确认

## 交互逻辑

**仅 conversion 来源（`isConversion === true`）时显示底部栏。**

### 未拼状态（`is_assembled === 0`）

- 底部固定栏显示醒目按钮「标记为已拼」
- 按钮样式：圆角、主题橙色 `#F2994A`、白色文字、满宽
- 点击 → `wx.showModal` 弹窗确认：
  - 标题：确认
  - 内容：确认已拼完这个图？此操作不可撤回
  - 确认按钮：确认
  - 取消按钮：取消
- 确认 → 调用 `PUT /bead/conversions/:id/assembled`，成功后按钮变为完成态
- 取消 → 关闭弹窗，无操作

### 已拼状态（`is_assembled === 1`）

- 底部固定栏显示「✅ 已完成」只读标签
- 样式：灰色背景、浅灰文字、无点击效果
- 不可点击，不弹窗

### 信息行旧标签

- 删除 `assembled-toggle` 整块代码
- 信息行只保留尺寸标签 + 豆子数量

## 底部栏样式

```
┌─────────────────────────────────────┐
│                                     │
│  （页面正常内容，底部加 padding）      │
│                                     │
├─────────────────────────────────────┤
│        [ 标记为已拼 ]               │  ← 固定底部，橙色按钮
└─────────────────────────────────────┘
```

- 底部栏高度：约 120rpx（按钮 88rpx + 上下 padding）
- 背景：白色 `#fff`，上方 `box-shadow` 分隔线效果
- 安全区适配：`padding-bottom: env(safe-area-inset-bottom)`
- 页面内容区增加 `padding-bottom: 160rpx` 避免遮挡

## 涉及文件

| 文件 | 改动 |
|------|------|
| `drawing-detail.wxml` | 删除 `assembled-toggle`，新增底部固定栏结构 |
| `drawing-detail.wxss` | 删除 `assembled-toggle` 样式，新增底部栏样式，页面内容加 padding-bottom |
| `drawing-detail.js` | `onToggleAssembled` 改为先弹 `wx.showModal` 确认再调接口 |