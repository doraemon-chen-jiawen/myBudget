-- ============================================================
-- Migration: create budget_categories table
-- ============================================================

CREATE TABLE IF NOT EXISTS budget_categories (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED DEFAULT NULL          COMMENT 'NULL = system default category',
  period_type   ENUM('daily','monthly','finance_interest') NOT NULL,
  category_key  VARCHAR(64)  NOT NULL                  COMMENT 'e.g. transport, custom_abc123',
  label         VARCHAR(64)  NOT NULL,
  icon          VARCHAR(16)  NOT NULL DEFAULT '✨',
  hint          VARCHAR(128) DEFAULT '',
  color         VARCHAR(32)  NOT NULL DEFAULT '#6FCF97',
  bg_color      VARCHAR(64)  NOT NULL DEFAULT 'rgba(111,207,151,0.1)',
  color_light   VARCHAR(64)  NOT NULL DEFAULT 'rgba(111,207,151,0.3)',
  quick_amounts JSON DEFAULT NULL                      COMMENT 'e.g. ["10","20","30"]',
  default_amount DECIMAL(12,2) DEFAULT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  is_system     TINYINT NOT NULL DEFAULT 0             COMMENT '1 = built-in, not deletable',
  is_active     TINYINT NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_budget_categories_user_period_key (user_id, period_type, category_key),
  KEY idx_budget_categories_period_type (period_type),
  KEY idx_budget_categories_user_id (user_id),

  CONSTRAINT fk_budget_categories_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
