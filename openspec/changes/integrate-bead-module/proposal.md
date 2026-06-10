## Why

现有 myBudget 记账小程序需要整合拼豆助手新模块，用户在同一小程序内通过模块选择页切换记账和拼豆两个功能，共享登录体系，各自拥有独立 tabBar 和业务数据。

## What Changes

- 新增模块选择首页（portal），登录后首次进入展示两模块入口
- 实现 custom-tab-bar 自定义组件，根据全局模块状态动态渲染不同 tabBar（记账 2 tab、拼豆 4 tab）
- 登录成功后根据 currentModule 路由到对应模块首页，支持记住用户选择
- 两个模块的「我的」页面各提供「切换模块」入口
- 拼豆模块新增 4 个 tabBar 页面骨架：首页、豆仓、图纸、我的
- 后端新增 `/api/bead/*` 接口前缀，与 `/api/budget/*` 隔离，共享 `/api/auth/*` 鉴权
- 模块间切换使用 wx.reLaunch 清空页面栈

## Capabilities

### New Capabilities
- `module-navigation`: 模块选择首页、自定义 tabBar 切换、模块状态持久化、登录路由适配
- `bead-home`: 拼豆模块首页骨架（搜索框、快捷入口、标签栏、图纸列表）
- `bead-drawing`: 图纸图库 + 详情页（筛选、搜索、收藏、下载、统计开关）
- `bead-pixel-convert`: 图片转像素图纸（Canvas 预处理、像素化算法、色卡匹配、图例生成）
- `bead-ocr`: 图纸图例 OCR 识别（node-tesseract-ocr、裁剪识别、人工校验）
- `bead-warehouse`: 豆仓库存管理（CRUD、统计范围、手动入出库）
- `bead-warehouse-advanced`: 豆仓进阶（订单 OCR 入库、预警设置、日志）
- `bead-profile`: 拼豆个人中心（收藏、转换记录、退出登录、切换模块）

### Modified Capabilities
<!-- 现有的登录流程需要适配模块路由，但不涉及 spec 级需求变更，属于实现层面调整 -->

## Impact

- **前端**：app.json 改为 custom tabBar、新增 custom-tab-bar 组件、新增 portal 页面、新增 bead 目录下所有页面、修改登录跳转逻辑、记账 profile 页加切换入口
- **后端**：新增 `/api/bead/*` 路由模块、集成 node-tesseract-ocr + sharp、新增图纸/库存/收藏等数据表和 API
- **依赖**：node-tesseract-ocr、sharp、SQLite 新表
- **部署**：服务器需安装 Tesseract OCR 引擎及 chi_sim 语言包