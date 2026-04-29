-- ============================================================
-- Migration: Add yearly budget support
-- 添加年度预算支持的结构变更
-- 执行完成后，运行 seed_budget_categories.sql 来插入年度分类数据
-- ============================================================

-- 临时禁用外键检查
SET FOREIGN_KEY_CHECKS = 0;

-- 添加 'yearly' 到 budget_categories.period_type ENUM
ALTER TABLE budget_categories
MODIFY COLUMN period_type ENUM('daily','monthly','finance_interest','yearly') NOT NULL;

-- 添加 'yearly' 到 budgets.period_type ENUM
ALTER TABLE budgets
MODIFY COLUMN period_type ENUM('daily','monthly','finance_interest','yearly') NOT NULL;

-- 更新 period_key VARCHAR 长度以支持所有 period_type 的键
ALTER TABLE budgets
MODIFY COLUMN period_key VARCHAR(64) NOT NULL;

-- 添加 budget_year 字段用于年度预算
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'budgets'
    AND COLUMN_NAME = 'budget_year'
);

SET @sql = IF(@column_exists > 0,
  'ALTER TABLE budgets DROP COLUMN budget_year',
  'SELECT "budget_year does not exist, skipping drop" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE budgets
ADD COLUMN budget_year CHAR(4) DEFAULT NULL COMMENT '年度预算年份 (YYYY)' AFTER budget_month;

-- 更新 CHECK 约束以支持 yearly
-- 先删除旧约束（如果存在）- MySQL兼容语法
SET @constraint_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'budgets'
    AND CONSTRAINT_NAME = 'ck_budgets_period_fields'
);

SET @sql = IF(@constraint_exists > 0,
  'ALTER TABLE budgets DROP CHECK ck_budgets_period_fields',
  'SELECT "Constraint does not exist, skipping drop" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 添加新的 CHECK 约束
ALTER TABLE budgets
ADD CONSTRAINT ck_budgets_period_fields
CHECK (
  -- daily
  (period_type='daily'
    AND budget_date IS NOT NULL AND budget_month IS NULL AND budget_year IS NULL AND account_id IS NULL
    AND planned_amount IS NOT NULL
    AND planned_annual_rate IS NULL AND planned_principal_amount IS NULL
  )
  OR
  -- monthly
  (period_type='monthly'
    AND budget_month IS NOT NULL AND budget_date IS NULL AND budget_year IS NULL AND account_id IS NULL
    AND planned_amount IS NOT NULL
    AND planned_annual_rate IS NULL AND planned_principal_amount IS NULL
  )
  OR
  -- finance_interest
  (period_type='finance_interest'
    AND budget_month IS NOT NULL AND budget_date IS NULL AND budget_year IS NULL AND account_id IS NOT NULL
    AND planned_amount IS NULL
    AND planned_annual_rate IS NOT NULL AND planned_principal_amount IS NOT NULL
  )
  OR
  -- yearly
  (period_type='yearly'
    AND budget_year IS NOT NULL AND budget_date IS NULL AND budget_month IS NULL AND account_id IS NULL
    AND planned_amount IS NOT NULL
    AND planned_annual_rate IS NULL AND planned_principal_amount IS NULL
  )
);

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 执行说明：
-- 1. 先执行本文件进行结构变更
-- 2. 再执行 seed_budget_categories.sql 插入年度分类数据
-- ============================================================
