# myBudget

基于 OpenSpec-CN 规范初始化的全栈项目：
- 前端：微信小程序原生
- 后端：Node.js + Express
- 数据库：MySQL

## 目录结构
```text
myBudget/
├─ frontend/
│  ├─ project.config.json
│  └─ miniprogram/
│     ├─ app.js
│     ├─ app.json
│     ├─ app.wxss
│     ├─ sitemap.json
│     └─ pages/
│        └─ index/
│           ├─ index.js
│           ├─ index.wxml
│           └─ index.wxss
├─ backend/
│  ├─ .env
│  ├─ .env.example
│  ├─ package.json
│  ├─ server.js
│  └─ src/
│     ├─ app.js
│     ├─ config/
│     │  ├─ db.js
│     │  └─ env.js
│     ├─ middleware/
│     │  └─ error-handler.js
│     └─ routes/
│        └─ health.js
├─ database/
│  └─ schema.sql
├─ docs/
│  └─ openspec-cn.md
└─ README.md
```

## 快速开始

### 1) 初始化数据库
1. 启动 MySQL 服务
2. 执行 `database/schema.sql`
   - 可在 MySQL 客户端中执行：
   ```bash
   mysql -u root -p < database/schema.sql
   ```

### 2) 启动后端
```bash
cd backend
npm install
npm run dev
```

后端默认地址：`http://localhost:3000`

健康检查接口：
```bash
curl http://localhost:3000/api/health
```

### 3) 启动微信小程序
1. 打开微信开发者工具
2. 选择 `frontend` 目录导入项目
3. 确认 `frontend/miniprogram/app.js` 中 `apiBaseUrl` 指向你的后端地址
4. 编译运行

## 环境变量说明
见 `backend/.env.example`，默认提供 `backend/.env` 可直接改值使用。

## NPM 依赖（backend）
- 运行依赖：`express` `mysql2` `dotenv` `cors` `helmet` `morgan` `compression` `express-rate-limit`
- 开发依赖：`nodemon`
