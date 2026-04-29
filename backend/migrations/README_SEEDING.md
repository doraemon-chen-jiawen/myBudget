# 预算分类种子数据说明

## 概述

本目录包含预算分类的种子数据脚本，用于初始化系统默认的分类配置。

## 文件说明

### `seed_budget_categories.sql` (当前使用)
- **使用方式**: `ON DUPLICATE KEY UPDATE`
- **特点**:
  - 可以安全地重复执行
  - 会更新现有的系统默认分类
  - 不会影响用户自定义的分类
  - 保持数据的一致性

### `seed_budget_categories_legacy.sql` (旧版本)
- **使用方式**: `INSERT IGNORE`
- **问题**:
  - 重复执行时会跳过现有记录而不更新
  - 无法修复错误的初始数据
  - 仅用于历史参考，不应再使用

## 使用方法

### 首次部署
```bash
# 1. 执行结构变更（如果需要添加新功能如年度预算）
mysql -u root -p lazy_budget < backend/migrations/add_yearly_support.sql

# 2. 插入/更新系统默认分类
mysql -u root -p lazy_budget < backend/migrations/seed_budget_categories.sql
```

### 添加年度预算支持
如果需要添加年度预算功能：
1. 执行 `add_yearly_support.sql` 进行结构变更
2. 执行 `seed_budget_categories.sql` 插入年度分类数据

### 更新系统默认分类
当你需要修改系统默认分类时（比如修改默认金额、颜色等）：
1. 编辑 `seed_budget_categories.sql` 文件
2. 重新执行该脚本
3. 脚本会自动更新现有的系统默认分类

## 工作原理

`ON DUPLICATE KEY UPDATE` 策略依赖于数据库的唯一约束：
- `uk_budget_categories_user_period_key (user_id, period_type, category_key)`
- 对于系统默认分类：`user_id = NULL`

当遇到重复的 `(NULL, period_type, category_key)` 组合时：
- **更新**: 系统默认分类（`is_system = 1`）
- **跳过**: 用户自定义分类（`user_id != NULL`）

## 注意事项

### ✅ 可以修改的字段
以下字段的修改会在重复执行时生效：
- `label` - 分类名称
- `icon` - 分类图标
- `hint` - 分类提示
- `color`, `bg_color`, `color_light` - 颜色配置
- `quick_amounts` - 快捷金额列表
- `default_amount` - 默认金额
- `sort_order` - 排序顺序
- `is_active` - 是否激活

### ⚠️ 不能修改的字段
以下字段的修改需要创建新的迁移脚本：
- `category_key` - 分类键值（唯一约束的一部分）
- `period_type` - 周期类型（唯一约束的一部分）

### 🔒 用户数据安全
- 脚本只会更新 `user_id = NULL` 的系统默认分类
- 不会影响任何 `user_id != NULL` 的用户自定义分类
- 用户修改的分类（即使后来系统更新了默认值）也会保持用户自己的版本

## 示例场景

### 场景 1: 修改默认金额
```sql
-- 将早餐默认金额从 15.00 改为 20.00
(NULL, 'daily', 'breakfast', '早餐', '🥐', '开启美好的一天', ... , 20.00, 2, 1, 1, CURRENT_TIMESTAMP)
```
重新执行脚本后，所有新用户和现有用户（如果他们使用的是系统默认值）都会看到更新后的默认金额。

### 场景 2: 添加新的系统分类
在 VALUES 中添加新的一行：
```sql
(NULL, 'daily', 'snack_time', '下午茶', '🍵', '下午茶时间', '#FFD166', 'rgba(255,209,102,0.1)', 'rgba(255,209,102,0.3)', '["10","15","20"]', 15.00, 5, 1, 1, CURRENT_TIMESTAMP)
```
重新执行脚本后，新分类会被插入，所有用户都能看到。

### 场景 3: 删除系统分类
1. 从 VALUES 中移除对应的行
2. 创建新的迁移脚本标记为 `is_active = 0`：
```sql
UPDATE budget_categories SET is_active = 0 WHERE user_id IS NULL AND category_key = 'old_key';
```
这样既不会破坏现有数据，也能让新用户看不到已废弃的分类。

## 最佳实践

1. **版本控制**: 每次修改种子数据都应提交到 Git
2. **测试**: 在测试环境先验证修改效果
3. **文档**: 在本文件中记录重要的修改历史
4. **备份**: 重大修改前备份数据库
5. **渐进式**: 对于破坏性修改，考虑创建新的迁移脚本而不是直接修改种子数据

## 修改历史

### 2024-04-29
- 添加年度预算支持（yearly period_type）
- 将结构变更和数据插入分离：
  - `add_yearly_support.sql`: DDL结构变更（ENUM、列、约束）
  - `seed_budget_categories.sql`: DML数据插入（包含年度分类）
- 从 `INSERT IGNORE` 迁移到 `ON DUPLICATE KEY UPDATE`
- 添加了 `updated_at` 字段以跟踪更新时间
- 添加了完整的字段说明文档

### 2024-04-29
- 从 `INSERT IGNORE` 迁移到 `ON DUPLICATE KEY UPDATE`
- 添加了 `updated_at` 字段以跟踪更新时间
- 添加了完整的字段说明文档
