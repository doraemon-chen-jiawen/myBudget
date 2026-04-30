-- 收入分类表
CREATE TABLE IF NOT EXISTS income_categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED DEFAULT NULL COMMENT 'NULL = system default category',
  period_type ENUM('monthly','yearly') NOT NULL COMMENT 'monthly或yearly',
  category_key VARCHAR(64) NOT NULL,
  label VARCHAR(64) NOT NULL,
  icon VARCHAR(16) NOT NULL DEFAULT '💰',
  hint VARCHAR(128) DEFAULT '',
  color VARCHAR(32) NOT NULL DEFAULT '#6FCF97',
  bg_color VARCHAR(64) NOT NULL DEFAULT 'rgba(111,207,151,0.1)',
  color_light VARCHAR(64) NOT NULL DEFAULT 'rgba(111,207,151,0.3)',
  quick_amounts JSON DEFAULT NULL,
  default_amount DECIMAL(12,2) DEFAULT NULL,
  allow_negative TINYINT NOT NULL DEFAULT 0 COMMENT '是否允许负数（股票收益可能亏损）',
  sort_order INT NOT NULL DEFAULT 0,
  is_system TINYINT NOT NULL DEFAULT 0,
  is_active TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_income_categories_user_period_key (user_id, period_type, category_key),
  KEY idx_income_categories_period_type (period_type),
  KEY idx_income_categories_user_id (user_id),
  CONSTRAINT fk_income_categories_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
