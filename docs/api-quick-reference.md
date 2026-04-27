# myBudget 简版接口表（中文）

Base URL：`http://localhost:3000/api`

统一返回：
- 成功：`{ success: true, message: string, data: any }`
- 失败：`{ success: false, code: string, message: string, details: any|null }`

---

## 1) 健康检查

| 接口 | 方法 | 入参 | 说明 |
|---|---|---|---|
| `/health` | GET | 无 | 检查服务和数据库连接状态 |

---

## 2) 用户登录（微信）

| 接口 | 方法 | 必填参数 | 可选参数 | 说明 |
|---|---|---|---|---|
| `/auth/login` | POST | `wechatOpenid` | `nickname`, `avatarUrl`, `phone` | openid 登录；不存在则创建用户，存在则更新用户信息 |

请求示例：
```json
{
  "wechatOpenid": "wx_test_u1",
  "nickname": "User1"
}
```

---

## 3) 预算管理（budgets）

### 3.1 查询预算

| 接口 | 方法 | 必填参数 | 可选参数 | 说明 |
|---|---|---|---|---|
| `/budgets` | GET | `userId`(query) | `familyGroupId`, `periodType`, `periodKey` | 查询预算列表 |

### 3.2 新增预算

| 接口 | 方法 | 必填参数 | 说明 |
|---|---|---|---|
| `/budgets` | POST | `userId`, `periodType` + 对应字段 | 新增预算 |

`periodType` 对应规则：
- `daily`：必填 `budgetDate`, `plannedAmount`
- `monthly`：必填 `budgetMonth`, `plannedAmount`
- `finance_interest`：必填 `budgetMonth`, `accountId`, `plannedAnnualRate`, `plannedPrincipalAmount`

说明：
- `finance_interest` 的 `planned_interest_amount` 由数据库自动生成（`本金 * 年化利率 / 12`）
- `finance_interest` 只能绑定理财账户（`account_kind=finance`）

### 3.3 修改预算

| 接口 | 方法 | 必填参数 | 说明 |
|---|---|---|---|
| `/budgets/:id` | PUT | `id`(path), `userId` + 与新增同规则 | 更新预算 |

### 3.4 删除预算

| 接口 | 方法 | 必填参数 | 说明 |
|---|---|---|---|
| `/budgets/:id` | DELETE | `id`(path), `userId`(body) | 删除预算 |

---

## 4) 记账接口（records）

### 4.1 查询记账

| 接口 | 方法 | 必填参数 | 可选参数 | 说明 |
|---|---|---|---|---|
| `/records` | GET | `userId`(query) | `familyGroupId`, `recordType`, `recordMonth`, `dateFrom`, `dateTo` | 查询记账列表 |

### 4.2 新增记账

| 接口 | 方法 | 必填参数 | 可选参数 |
|---|---|---|---|
| `/records` | POST | `userId`, `recordType`, `amount`, `recordDate` | `accountId`, `categorySnapshot`, `note`, `currency`, `frequentItemId`, `source`, `sourceReference` |

说明：
- `recordType`：`income` 或 `expense`
- `recordMonth` 可不传，服务端会根据 `recordDate` 自动推导（YYYY-MM）

### 4.3 修改记账

| 接口 | 方法 | 必填参数 | 说明 |
|---|---|---|---|
| `/records/:id` | PUT | `id`(path), `userId` + 与新增同规则 | 更新记账 |

### 4.4 删除记账

| 接口 | 方法 | 必填参数 | 说明 |
|---|---|---|---|
| `/records/:id` | DELETE | `id`(path), `userId`(body) | 删除记账 |

---

## 5) 银行卡接口（saving）

### 5.1 查询银行卡
| 接口 | 方法 | 必填参数 | 可选参数 |
|---|---|---|---|
| `/bank-accounts` | GET | `userId`(query) | `familyGroupId` |

### 5.2 新增银行卡
| 接口 | 方法 | 必填参数 | 可选参数 |
|---|---|---|---|
| `/bank-accounts` | POST | `userId`, `accountName` | `bankName`, `currency`, `balance`, `creditLimit`, `lastBalanceUpdatedAt`, `isDefault`, `isActive`, `familyGroupId` |

### 5.3 修改银行卡
| 接口 | 方法 | 必填参数 |
|---|---|---|
| `/bank-accounts/:id` | PUT | `id`(path), `userId`, `accountName` |

### 5.4 删除银行卡
| 接口 | 方法 | 必填参数 |
|---|---|---|
| `/bank-accounts/:id` | DELETE | `id`(path), `userId`(body) |

---

## 6) 理财账户接口（finance）

### 6.1 查询理财账户
| 接口 | 方法 | 必填参数 | 可选参数 |
|---|---|---|---|
| `/finance-accounts` | GET | `userId`(query) | `familyGroupId` |

### 6.2 新增理财账户
| 接口 | 方法 | 必填参数 | 可选参数 |
|---|---|---|---|
| `/finance-accounts` | POST | `userId`, `accountName` | `provider`, `bankName`, `currency`, `principalAmount`, `expectedAnnualRate`, `isDefault`, `isActive`, `familyGroupId` |

### 6.3 修改理财账户
| 接口 | 方法 | 必填参数 |
|---|---|---|
| `/finance-accounts/:id` | PUT | `id`(path), `userId`, `accountName` |

### 6.4 删除理财账户
| 接口 | 方法 | 必填参数 |
|---|---|---|
| `/finance-accounts/:id` | DELETE | `id`(path), `userId`(body) |

---

## 7) 家庭群组接口

### 7.1 群组

| 接口 | 方法 | 必填参数 | 可选参数 | 说明 |
|---|---|---|---|---|
| `/family-groups` | GET | 无 | `ownerUserId`(query) | 查询群组列表 |
| `/family-groups` | POST | `ownerUserId`, `name` | `description` | 新建群组 |
| `/family-groups/:id` | GET | `id`(path) | 无 | 查询群组详情 |
| `/family-groups/:id` | PUT | `id`(path), `ownerUserId`, `name` | `description` | 更新群组 |
| `/family-groups/:id` | DELETE | `id`(path), `ownerUserId`(body) | 无 | 删除群组 |

### 7.2 成员

| 接口 | 方法 | 必填参数 | 可选参数 | 说明 |
|---|---|---|---|---|
| `/family-groups/:id/members` | GET | `id`(path) | 无 | 查询成员列表 |
| `/family-groups/:id/members` | POST | `id`(path), `userId` | `role`, `status` | 添加成员 |

---

## 8) 首页聚合接口（home）

### 8.1 首页数据

| 接口 | 方法 | 必填参数 | 可选参数 | 说明 |
|---|---|---|---|---|
| `/home/index` | GET | `userId`(query) | `date`(query, YYYY-MM-DD) | 返回首页聚合数据（日期、预算、花销、剩余、快捷按钮与点击次数） |

### 8.2 快捷记账

| 接口 | 方法 | 必填参数 | 可选参数 | 说明 |
|---|---|---|---|---|
| `/home/quick-record` | POST | `userId`, `key` | `date`(YYYY-MM-DD) | 以快捷项 key 直接记一笔账，并返回最新首页聚合数据 |

快捷项 key（当前后端内置）：
- `breakfast`（早餐）
- `lunch`（午餐）
- `dinner`（晚餐）
- `transport`（交通）

---

## 常见错误码（建议）

| code | 含义 |
|---|---|
| `E_BAD_REQUEST` | 参数错误/缺少必填参数 |
| `E_NOT_FOUND` | 资源不存在 |
| `E_INTERNAL` | 服务内部错误 |
| `ER_DUP_ENTRY` | 数据唯一约束冲突（MySQL） |

