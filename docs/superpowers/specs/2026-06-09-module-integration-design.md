# 拼豆助手模块整合设计文档

**日期**：2026-06-09
**版本**：V1.0
**状态**：待审阅

---

## 一、项目背景

将拼豆助手（新模块）整合到现有 myBudget 记账小程序中，共用登录模块，新增模块选择首页，实现 tabBar 随模块切换。

---

## 二、方案选型

**选定方案：自定义 TabBar + 全局模块状态**

- 微信小程序 custom-tab-bar 组件，根据全局状态动态渲染不同 tab 组
- 模块选择页作为登录后入口
- 优点：实现简单，微信官方方案，后续可升级分包
- 备选方案：分包加载（包体积超限时升级）、两个独立小程序（用户需装两个，体验差）

---

## 三、整体页面结构

```
pages/
├── login/login              # 登录页（共用，保持现有）
├── register/register        # 注册页（共用，保持现有）
├── portal/portal            # 【新增】模块选择首页
│
├── index/index              # 记账-首页（保持现有）
├── budget/budget            # 记账-预算页（保持现有）
├── records/records          # 记账-记录页（保持现有）
├── statistics/statistics    # 记账-统计页（保持现有）
├── backfill/backfill        # 记账-补录页（保持现有）
├── profile/profile          # 记账-我的页（保持现有，加"切换模块"入口）
├── family/family            # 记账-家庭页（保持现有）
├── income/income            # 记账-收入页（保持现有）
│
├── bead/index/index         # 【新增】拼豆-首页
├── bead/warehouse/warehouse # 【新增】拼豆-豆仓
├── bead/drawing/drawing     # 【新增】拼豆-图纸
├── bead/profile/profile     # 【新增】拼豆-我的（含"切换模块"入口）
└── bead/...                 # 其他拼豆子页面（详情、转换、OCR等）
```

**关键点**：
- 拼豆模块页面统一放在 `pages/bead/` 目录下，与记账模块物理隔离
- 现有记账页面零改动（仅 profile 页加一个"切换模块"入口）
- portal 作为新增模块选择页

---

## 四、自定义 TabBar 机制

### app.json tabBar 配置

```json
{
  "tabBar": {
    "custom": true,
    "list": [
      { "pagePath": "pages/portal/portal", "text": "门户" },
      { "pagePath": "pages/index/index", "text": "记账首页" },
      { "pagePath": "pages/profile/profile", "text": "记账我的" },
      { "pagePath": "pages/bead/index/index", "text": "拼豆首页" },
      { "pagePath": "pages/bead/warehouse/warehouse", "text": "豆仓" },
      { "pagePath": "pages/bead/drawing/drawing", "text": "图纸" },
      { "pagePath": "pages/bead/profile/profile", "text": "拼豆我的" }
    ]
  }
}
```

> list 必须声明所有 tabBar 页面路径（微信要求），实际渲染由自定义组件控制。

### custom-tab-bar 组件逻辑

- 读取 `getApp().globalData.currentModule`（值为 `"budget"` 或 `"bead"`）
- 根据模块值渲染对应 tab 组：

| budget 模式 | bead 模式 |
|---|---|
| 首页 (index) | 首页 (bead/index) |
| 我的 (profile) | 豆仓 (bead/warehouse) |
| — | 图纸 (bead/drawing) |
| — | 我的 (bead/profile) |

- portal 页面不显示 tabBar
- 状态持久化：`wx.setStorageSync('currentModule', 'budget')`，每次 onShow 同步读取

---

## 五、页面跳转流程

### 1. 启动流程

```
打开小程序
  → 检查登录态？
    → 未登录：跳转 login 页
    → 已登录：检查 currentModule？
      → 无值（首次）：跳转 portal（模块选择页）
      → 有值：reLaunch 到对应模块首页
```

### 2. 模块选择页（portal）

- 两个卡片入口：「记账助手」「拼豆助手」
- 点击后：`wx.setStorageSync('currentModule', 'xxx')` → `wx.reLaunch` 到对应模块首页
- 该页面不显示 tabBar

### 3. 切换模块流程

- 入口：两个模块各自的「我的」页面 → 点击「切换模块」按钮
- 动作：`wx.reLaunch({ url: '/pages/portal/portal' })` 回到模块选择页
- 用户重新选择模块后，更新 currentModule 并跳转

### 4. 关键点

- 模块间切换用 `wx.reLaunch`（关闭所有页面再跳转），清空页面栈
- 模块内导航用 `wx.navigateTo`，保持页面栈正常返回
- portal 页面不加入 tabBar 渲染

---

## 六、登录模块适配

**现状**：myBudget 用账号密码登录（login + register 页面）

**调整**：
- 登录/注册页面保持不变，两个模块共用
- 登录成功后跳转逻辑调整：
  - 原来：登录成功 → 直接跳 pages/index/index
  - 改为：登录成功 → 检查 currentModule
    - 有值：reLaunch 到对应模块首页
    - 无值：reLaunch 到 portal（模块选择页）
- 用户表可新增 `default_module` 字段（可选值：`budget` / `bead` / 空），服务端记住用户偏好

**token 鉴权**：
- 两个模块共用同一个 token，同一套 JWT 鉴权中间件
- 各模块 API 通过路径前缀区分（`/api/budget/*`、`/api/bead/*`），鉴权逻辑统一

---

## 七、全局状态与数据隔离

### app.js globalData 结构

```js
globalData: {
  currentModule: '',    // 'budget' | 'bead'
  userInfo: null,       // 共用用户信息
  token: ''             // 共用鉴权 token
}
```

### 数据隔离原则

- 用户表：共用，一套登录注册
- 记账模块数据：原有预算、记录、统计等接口和表不变
- 拼豆模块数据：独立的图纸、库存、收藏等表，独立 API 前缀 `/api/bead/*`
- 无交叉引用：两个模块的业务数据互不依赖

### 后端接口组织

```
/api/auth/*        → 共用（登录、注册、token校验）
/api/budget/*      → 记账模块（保持现有）
/api/bead/*        → 拼豆模块（新增）
```

---

## 八、OCR 方案 Spike 验证结论

### 验证环境

- Tesseract v5.5.0 + chi_sim + eng 语言包
- node-tesseract-ocr 调用
- Windows 11 本机

### 验证结果

整图识别拼豆图纸图例：

| 项目 | 结果 |
|---|---|
| Tesseract 可调用 | ✅ 正常，耗时 ~400ms |
| 色号识别 | ⚠️ 大小写混乱、丢位，50% 准确率 |
| 数字识别 | ⚠️ 核心数字对，但多了括号干扰 |
| 整图识别总条目 | 7条识别出4条（57%） |
| 完全丢失 | 3条（43%） |

### 结论

- 整图识别效果不可行，准确率不够
- **裁剪图例区域后局部识别**是正确路径，裁剪后字更大更清晰，准确率会显著提升
- 需求文档中的"智能聚焦：自动定位图纸图例区域，裁剪无关背景"方向正确
- 人工校验环节兜底，确保数据 100% 准确
- node-tesseract-ocr 方案可行，需配合前端裁剪使用

### 后处理规则

- 去除括号等干扰字符
- 色号格式标准化：统一转大写 + 补齐位数（如 C03）
- 识别结果与系统色卡做模糊匹配校准
- 用户可手动修正所有识别字段

---

## 九、最小可交付 Change 列表

### C1：多模块架构搭建（2天）

- 创建 custom-tab-bar 组件，支持 budget/bead 两组 tab 渲染
- 创建 pages/portal/portal 模块选择页
- app.js 新增 currentModule 全局状态 + Storage 持久化
- app.json 改为 custom: true 并声明所有 tabBar 页面路径
- 登录成功跳转逻辑适配（检查 currentModule 路由）
- 记账 profile 页新增「切换模块」入口
- **验收**：登录 → portal 选择模块 → tabBar 正确显示 → 切换模块正常回到 portal

### C2：拼豆模块首页 + TabBar 骨架（2天）

- bead/index 首页（搜索框、4个快捷入口、标签栏、精选图纸列表占位）
- bead/warehouse、bead/drawing 占位页（仅标题，后续填充）
- bead/profile 我的页（基本信息 + 切换模块入口 + 功能入口列表）
- **验收**：4个 tab 切换正常，首页布局完整，从我的页可切回记账模块

### C3：图纸图库 + 详情（3天）

- 图纸列表页（尺寸筛选 52/78/104、标签筛选、搜索、分页）
- 图纸详情页（预览图、像素图纸、标签、用料清单、收藏、下载、加入统计开关）
- 后端：图纸 CRUD API、标签管理 API、收藏 API
- **验收**：浏览图纸 → 筛选 → 查看详情 → 收藏 → 下载

### C4：图片转像素图纸（3天）

- 图片上传（拍照/相册）+ Canvas 预处理
- 像素化算法 + 颜色量化 + 标准色卡匹配
- 结果展示（像素图纸 + 色号图例 + 用量统计表）
- 用料清单复制、核对库存、批量出库操作
- **验收**：上传图片 → 选尺寸 → 生成像素图纸 + 图例 + 清单 → 下载/复制

### C5：图纸图例 OCR 识别（3天）

- 后端 node-tesseract-ocr 集成、OCR API 接口
- 前端图例区域裁剪（用户手动框选 + 自动定位辅助）
- 识别流程：裁剪 → OCR → 色号校准 → 结果输出
- 人工校验（手动修改/删除/补充）
- 结果统一输出格式（与 C4 一致）
- **验收**：上传成品图纸 → 裁剪图例区域 → OCR 识别 → 人工修正 → 生成用料清单

### C6：豆仓基础 — 库存 CRUD + 统计范围（3天）

- 库存列表（顶部统计：总数、颜色种类、低库存、缺货、已统计图纸数）
- 手动入库（单条/批量）+ 手动出库（含库存校验）
- 库存统计范围设置（勾选图纸参与核算）
- 后端：库存 CRUD API、统计聚合 API
- **验收**：入库 → 查看库存 → 勾选图纸 → 查看统计结果

### C7：豆仓进阶 — 订单 OCR + 预警 + 日志（2天）

- 订单图片上传 → OCR 识别物料 → 匹配色卡 → 批量入库
- 库存预警设置（低库存/缺货阈值）
- 库存日志（全量出入库记录、筛选、分页）
- **验收**：上传订单 → 识别入库 → 设置预警 → 查看日志

### C8：拼豆个人中心完善（2天）

- 我的收藏列表（管理图纸、统计开关）
- 转换记录（历史转换/识别记录、下载、复制、统计状态）
- 退出登录
- **验收**：查看收藏 → 查看记录 → 退出 → 回到登录页

### 依赖关系

```
C1（架构）→ C2（骨架）→ C3（图纸）
                      → C4（像素转换）
                      → C5（OCR识别）
                      → C6（豆仓基础）→ C7（豆仓进阶）
                      → C8（个人中心）
```

C1 是所有后续 Change 的基础，C2 依赖 C1，C3~C8 依赖 C2 但彼此之间可并行。