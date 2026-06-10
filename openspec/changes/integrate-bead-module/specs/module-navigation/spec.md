## ADDED Requirements

### Requirement: Module selection page
系统 SHALL 提供模块选择首页（portal），展示「记账助手」和「拼豆助手」两个入口卡片。用户点击后进入对应模块。

#### Scenario: 首次登录进入模块选择页
- **WHEN** 用户登录成功且 Storage 中无 currentModule 值
- **THEN** 系统 reLaunch 到 portal 页面，展示两个模块入口

#### Scenario: 选择模块进入
- **WHEN** 用户点击「拼豆助手」卡片
- **THEN** 系统将 currentModule 设为 "bead" 并写入 Storage，reLaunch 到拼豆首页

### Requirement: Module state persistence
系统 SHALL 通过 Storage 持久化用户选择的模块，下次打开小程序直接进入对应模块首页。

#### Scenario: 记住模块选择
- **WHEN** 用户上次选择了拼豆助手并关闭小程序
- **THEN** 再次打开小程序时，检测到 currentModule 为 "bead"，直接 reLaunch 到拼豆首页

#### Scenario: 无模块选择记录
- **WHEN** 用户首次进入且 Storage 中无 currentModule
- **THEN** 跳转到 portal 页面让用户选择

### Requirement: Custom TabBar switching
系统 SHALL 使用 custom-tab-bar 组件，根据 currentModule 渲染不同 tabBar 配置：budget 模式显示 2 个 tab（首页、我的），bead 模式显示 4 个 tab（首页、豆仓、图纸、我的）。

#### Scenario: 记账模块 tabBar
- **WHEN** currentModule 为 "budget"
- **THEN** tabBar 显示「首页」和「我的」两个 tab，点击分别跳转记账首页和记账我的页

#### Scenario: 拼豆模块 tabBar
- **WHEN** currentModule 为 "bead"
- **THEN** tabBar 显示「首页」「豆仓」「图纸」「我的」四个 tab，点击分别跳转对应页面

#### Scenario: portal 页不显示 tabBar
- **WHEN** 用户在 portal 页面
- **THEN** tabBar 不渲染

### Requirement: Module switching
用户 SHALL 能从任一模块的「我的」页面切换到另一模块。切换时使用 wx.reLaunch 清空页面栈。

#### Scenario: 从记账切换到拼豆
- **WHEN** 用户在记账「我的」页面点击「切换模块」
- **THEN** 系统 reLaunch 到 portal 页面，用户可重新选择拼豆助手

#### Scenario: 从拼豆切换到记账
- **WHEN** 用户在拼豆「我的」页面点击「切换模块」
- **THEN** 系统 reLaunch 到 portal 页面，用户可重新选择记账助手