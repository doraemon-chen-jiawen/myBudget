# myBudget OpenSpec-CN

## 1. 项目概述
- 项目名称：myBudget
- 目标：提供微信小程序记账能力，后端提供预算与交易数据服务
- 技术栈：微信小程序原生 + Node.js(Express) + MySQL

## 2. 目录规范
- `frontend/`：微信小程序工程
- `backend/`：Node.js API 服务
- `database/`：数据库脚本与迁移文件
- `docs/`：设计、接口与规范文档

## 3. 运行环境
- Node.js >= 18
- MySQL >= 8.0
- 微信开发者工具（小程序）

## 4. 环境变量规范
- `NODE_ENV`：运行环境，默认 `development`
- `PORT`：服务端口，默认 `3000`
- `DB_HOST`：MySQL 主机地址
- `DB_PORT`：MySQL 端口
- `DB_USER`：MySQL 用户名
- `DB_PASSWORD`：MySQL 密码
- `DB_NAME`：数据库名（默认 `mybudget`）
- `DB_CONN_LIMIT`：连接池上限

## 5. 接口规范
- 健康检查：`GET /api/health`
- 返回格式：
  - `success`：布尔值，表示请求是否成功
  - `message`：描述信息
  - 业务字段：按接口定义扩展

## 6. 错误处理规范
- 未匹配路由返回 `404`
- 服务异常返回 `500`，不暴露敏感堆栈

## 7. 安全与中间件
- `helmet`：安全响应头
- `cors`：跨域控制
- `express-rate-limit`：请求限流
- `compression`：响应压缩
- `morgan`：访问日志
