-- 收入预算表
CREATE TABLE IF NOT EXISTS income_budgets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  family_group_id BIGINT UNSIGNED DEFAULT NULL,

  period_type ENUM('monthly','yearly') NOT NULL,
  period_key VARCHAR(100) NOT NULL,

  budget_month CHAR(7) DEFAULT NULL COMMENT '月度收入月份 (YYYY-MM)',
  budget_year CHAR(4) DEFAULT NULL COMMENT '年度收入年份 (YYYY)',

  planned_amount DECIMAL(12,2) DEFAULT NULL COMMENT '预期收入金额',

  note VARCHAR(255) DEFAULT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_income_budgets_user_period (user_id, period_type, period_key),

  KEY idx_income_budgets_family_group_id (family_group_id),
  KEY idx_income_budgets_user_id (user_id),

  CONSTRAINT fk_income_budgets_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_income_budgets_family_group
    FOREIGN KEY (family_group_id) REFERENCES family_groups(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
