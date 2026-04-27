-- 修改 budgets 表 period_key 字段长度以支持自定义分类
-- 自定义分类 key 格式: custom_${timestamp}，例如 custom_1745678901234

ALTER TABLE budgets MODIFY COLUMN period_key VARCHAR(100) NOT NULL DEFAULT '';
