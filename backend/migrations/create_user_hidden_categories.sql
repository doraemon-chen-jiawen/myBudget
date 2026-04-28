-- ============================================================
-- Migration: create user_hidden_categories table
-- ============================================================
-- 用户隐藏的内置分类表

CREATE TABLE IF NOT EXISTS user_hidden_categories (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  category_id   BIGINT UNSIGNED NOT NULL COMMENT '被隐藏的内置分类ID',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_user_hidden_category (user_id, category_id),
  KEY idx_user_hidden_categories_user_id (user_id),

  CONSTRAINT fk_user_hidden_categories_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_user_hidden_categories_category
    FOREIGN KEY (category_id) REFERENCES budget_categories(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
