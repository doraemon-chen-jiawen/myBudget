-- 添加 'yearly' 到 budget_categories.period_type ENUM
ALTER TABLE budget_categories
MODIFY COLUMN period_type ENUM('daily','monthly','finance_interest','yearly') NOT NULL;

-- 添加 'yearly' 到 budgets.period_type ENUM
ALTER TABLE budgets
MODIFY COLUMN period_type ENUM('daily','monthly','finance_interest','yearly') NOT NULL;

-- 更新 period_key VARCHAR 长度以支持所有 period_type 的键
ALTER TABLE budgets
MODIFY COLUMN period_key VARCHAR(64) NOT NULL;

-- 添加 budget_year 字段用于年度预算（如果已存在则删除重新添加）
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
ALTER TABLE budgets
DROP CONSTRAINT ck_budgets_period_fields;

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

-- 插入年度预算的系统默认分类
INSERT IGNORE INTO budget_categories (
  user_id, period_type, category_key, label, icon, hint,
  color, bg_color, color_light, quick_amounts,
  default_amount, sort_order, is_system, is_active
) VALUES
  -- 旅游
  (NULL, 'yearly', 'travel', '旅游', '✈️', '年度旅游支出',
   '#2E86DE', 'rgba(46,134,222,0.1)', 'rgba(46,134,222,0.3)',
   '["1000","2000","3000"]', 2000.00, 1, 1, 1),
  -- 孝敬父母
  (NULL, 'yearly', 'parents', '孝敬父母', '👨‍👩‍👧', '给父母的孝心',
   '#FF6B6B', 'rgba(255,107,107,0.1)', 'rgba(255,107,107,0.3)',
   '["500","1000","2000"]', 1000.00, 2, 1, 1);
