-- myBudget database schema (OpenSpec-CN)
-- Dev/Test friendly: this script rebuilds tables.

CREATE DATABASE IF NOT EXISTS lazy_budget
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE lazy_budget;

SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW IF EXISTS bank_accounts;
DROP VIEW IF EXISTS finance_accounts;

DROP TABLE IF EXISTS auto_fill_logs;
DROP TABLE IF EXISTS interest_records;
DROP TABLE IF EXISTS records;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS frequent_items;
DROP TABLE IF EXISTS family_members;
DROP TABLE IF EXISTS family_groups;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- users
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  wechat_openid VARCHAR(64) NOT NULL,
  nickname VARCHAR(64) NOT NULL DEFAULT '',
  avatar_url VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
  is_active TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_wechat_openid (wechat_openid),
  KEY idx_users_nickname (nickname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- family_groups
CREATE TABLE IF NOT EXISTS family_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_family_groups_owner_name (owner_user_id, name),
  KEY idx_family_groups_owner_user_id (owner_user_id),
  CONSTRAINT fk_family_groups_owner_user_id
    FOREIGN KEY (owner_user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- family_members
CREATE TABLE IF NOT EXISTS family_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  family_group_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('owner','member') NOT NULL DEFAULT 'member',
  status ENUM('active','invited','left','removed') NOT NULL DEFAULT 'active',
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_family_members_group_user (family_group_id, user_id),
  KEY idx_family_members_user_id (user_id),
  KEY idx_family_members_status (status),
  CONSTRAINT fk_family_members_group
    FOREIGN KEY (family_group_id) REFERENCES family_groups(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_family_members_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- frequent_items
CREATE TABLE IF NOT EXISTS frequent_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  family_group_id BIGINT UNSIGNED DEFAULT NULL,
  item_type ENUM('income','expense') NOT NULL,
  name VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_default TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_frequent_items_user_type_name (user_id, item_type, name),
  KEY idx_frequent_items_family_group_id (family_group_id),
  KEY idx_frequent_items_user_id (user_id),
  CONSTRAINT fk_frequent_items_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_frequent_items_family_group
    FOREIGN KEY (family_group_id) REFERENCES family_groups(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- accounts (saving + finance unified)
CREATE TABLE IF NOT EXISTS accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  family_group_id BIGINT UNSIGNED DEFAULT NULL,
  account_kind ENUM('saving','finance') NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  bank_name VARCHAR(100) DEFAULT NULL,
  provider VARCHAR(100) DEFAULT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CNY',

  -- saving
  balance DECIMAL(14,2) DEFAULT NULL,
  credit_limit DECIMAL(14,2) DEFAULT NULL,
  last_balance_updated_at TIMESTAMP NULL DEFAULT NULL,

  -- finance
  principal_amount DECIMAL(14,2) DEFAULT NULL,
  expected_annual_rate DECIMAL(8,4) DEFAULT NULL,

  is_default TINYINT NOT NULL DEFAULT 0,
  is_active TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),

  UNIQUE KEY uk_accounts_user_kind_name_currency (user_id, account_kind, account_name, currency),
  KEY idx_accounts_user_id (user_id),
  KEY idx_accounts_family_group_id (family_group_id),
  KEY idx_accounts_kind (account_kind),

  CONSTRAINT fk_accounts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_accounts_family_group
    FOREIGN KEY (family_group_id) REFERENCES family_groups(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- compatibility views (read-only)
CREATE OR REPLACE VIEW bank_accounts AS
  SELECT * FROM accounts WHERE account_kind='saving';
CREATE OR REPLACE VIEW finance_accounts AS
  SELECT * FROM accounts WHERE account_kind='finance';

-- budgets (daily/monthly/finance_interest)
CREATE TABLE IF NOT EXISTS budgets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  family_group_id BIGINT UNSIGNED DEFAULT NULL,

  period_type ENUM('daily','monthly','finance_interest') NOT NULL,
  period_key VARCHAR(10) NOT NULL, -- daily: YYYY-MM-DD, monthly/finance_interest: YYYY-MM

  budget_date DATE DEFAULT NULL,      -- daily
  budget_month CHAR(7) DEFAULT NULL, -- monthly/finance_interest

  account_id BIGINT UNSIGNED DEFAULT NULL, -- finance_interest: required (finance account)

  -- daily/monthly
  planned_amount DECIMAL(12,2) DEFAULT NULL,

  -- finance_interest
  planned_annual_rate DECIMAL(8,4) DEFAULT NULL,       -- e.g. 0.1000 for 10%
  planned_principal_amount DECIMAL(14,2) DEFAULT NULL, -- snapshot principal for calculation

  planned_interest_amount DECIMAL(12,2) GENERATED ALWAYS AS
    (planned_principal_amount * planned_annual_rate / 12) STORED,

  note VARCHAR(255) DEFAULT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- uniqueness scope for budgets:
  --  - daily/monthly: account_scope_id = 0
  --  - finance_interest: account_scope_id = account_id
  account_scope_id BIGINT UNSIGNED NOT NULL DEFAULT 0,

  PRIMARY KEY (id),
  UNIQUE KEY uk_budgets_user_period_scope (user_id, period_type, period_key, account_scope_id),

  KEY idx_budgets_family_group_id (family_group_id),
  KEY idx_budgets_user_id (user_id),
  KEY idx_budgets_account_id (account_id),

  CONSTRAINT fk_budgets_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_budgets_family_group
    FOREIGN KEY (family_group_id) REFERENCES family_groups(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_budgets_account
    FOREIGN KEY (account_id) REFERENCES accounts(id)
    ON DELETE CASCADE,

  CONSTRAINT ck_budgets_period_fields
    CHECK (
      -- daily
      (period_type='daily'
        AND budget_date IS NOT NULL AND budget_month IS NULL AND account_id IS NULL
        AND planned_amount IS NOT NULL
        AND planned_annual_rate IS NULL AND planned_principal_amount IS NULL
      )
      OR
      -- monthly
      (period_type='monthly'
        AND budget_month IS NOT NULL AND budget_date IS NULL AND account_id IS NULL
        AND planned_amount IS NOT NULL
        AND planned_annual_rate IS NULL AND planned_principal_amount IS NULL
      )
      OR
      -- finance_interest
      (period_type='finance_interest'
        AND budget_month IS NOT NULL AND budget_date IS NULL AND account_id IS NOT NULL
        AND planned_amount IS NULL
        AND planned_annual_rate IS NOT NULL
        AND planned_principal_amount IS NOT NULL
      )
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- records
CREATE TABLE IF NOT EXISTS records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  family_group_id BIGINT UNSIGNED DEFAULT NULL,
  record_type ENUM('income','expense') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CNY',
  record_date DATE NOT NULL,
  record_month CHAR(7) NOT NULL,
  frequent_item_id BIGINT UNSIGNED DEFAULT NULL,
  category_snapshot VARCHAR(64) DEFAULT NULL,
  account_id BIGINT UNSIGNED DEFAULT NULL,
  note VARCHAR(255) DEFAULT NULL,
  source ENUM('manual','import','auto') NOT NULL DEFAULT 'manual',
  source_reference VARCHAR(128) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),

  UNIQUE KEY uk_records_user_source_ref (user_id, source, source_reference),
  KEY idx_records_user_date (user_id, record_date),
  KEY idx_records_user_month (user_id, record_month),
  KEY idx_records_item_id (frequent_item_id),
  KEY idx_records_account_id (account_id),
  KEY idx_records_source (source),

  CONSTRAINT fk_records_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_records_family_group
    FOREIGN KEY (family_group_id) REFERENCES family_groups(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_records_frequent_item
    FOREIGN KEY (frequent_item_id) REFERENCES frequent_items(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_records_account
    FOREIGN KEY (account_id) REFERENCES accounts(id)
    ON DELETE SET NULL,
  CONSTRAINT ck_records_amount_positive
    CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- interest_records
CREATE TABLE IF NOT EXISTS interest_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NOT NULL,
  interest_month CHAR(7) NOT NULL,
  interest_date DATE NOT NULL,
  principal_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  interest_amount DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'CNY',
  note VARCHAR(255) DEFAULT NULL,
  source ENUM('manual','import','auto') NOT NULL DEFAULT 'auto',
  external_reference VARCHAR(128) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),

  UNIQUE KEY uk_interest_records_account_month (account_id, interest_month),
  KEY idx_interest_records_user_month (user_id, interest_month),
  KEY idx_interest_records_account_id (account_id),
  KEY idx_interest_records_source (source),

  CONSTRAINT fk_interest_records_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_interest_records_account
    FOREIGN KEY (account_id) REFERENCES accounts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- auto_fill_logs
CREATE TABLE IF NOT EXISTS auto_fill_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  family_group_id BIGINT UNSIGNED DEFAULT NULL,
  rule_name VARCHAR(128) NOT NULL,
  period_type ENUM('daily','monthly','finance_interest') NOT NULL,
  period_key VARCHAR(10) NOT NULL,
  target_date DATE DEFAULT NULL,
  target_month CHAR(7) DEFAULT NULL,
  budget_id BIGINT UNSIGNED DEFAULT NULL,
  created_record_id BIGINT UNSIGNED DEFAULT NULL,
  status ENUM('success','failed','skipped') NOT NULL DEFAULT 'success',
  error_message VARCHAR(512) DEFAULT NULL,
  input_payload JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),

  UNIQUE KEY uk_auto_fill_logs_dedup (user_id, rule_name, period_type, period_key),
  KEY idx_auto_fill_logs_status (status),
  KEY idx_auto_fill_logs_budget_id (budget_id),
  KEY idx_auto_fill_logs_created_record_id (created_record_id),

  CONSTRAINT fk_auto_fill_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_auto_fill_logs_family_group
    FOREIGN KEY (family_group_id) REFERENCES family_groups(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_auto_fill_logs_budget
    FOREIGN KEY (budget_id) REFERENCES budgets(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_auto_fill_logs_record
    FOREIGN KEY (created_record_id) REFERENCES records(id)
    ON DELETE SET NULL,
  CONSTRAINT ck_auto_fill_logs_period_fields
    CHECK (
      (period_type='daily' AND target_date IS NOT NULL AND target_month IS NULL)
      OR (period_type='monthly' AND target_month IS NOT NULL AND target_date IS NULL)
      OR (period_type='finance_interest' AND target_month IS NOT NULL AND target_date IS NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Triggers (constraints that cannot be expressed by CHECK alone)
-- Enforce budgets.finance_interest.account_id points to accounts.account_kind='finance'
DROP TRIGGER IF EXISTS trg_budgets_bi;
DROP TRIGGER IF EXISTS trg_budgets_bu;

DELIMITER $$
CREATE TRIGGER trg_budgets_bi
BEFORE INSERT ON budgets
FOR EACH ROW
BEGIN
  DECLARE v_kind VARCHAR(16);

  IF NEW.period_type = 'finance_interest' THEN
    SET NEW.account_scope_id = NEW.account_id;
  ELSE
    SET NEW.account_scope_id = 0;
  END IF;

  IF NEW.period_type = 'finance_interest' THEN
    SELECT account_kind INTO v_kind
    FROM accounts
    WHERE id = NEW.account_id
    LIMIT 1;

    IF v_kind IS NULL OR v_kind <> 'finance' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'budgets.finance_interest requires accounts.account_kind=finance';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_budgets_bu
BEFORE UPDATE ON budgets
FOR EACH ROW
BEGIN
  DECLARE v_kind VARCHAR(16);

  IF NEW.period_type = 'finance_interest' THEN
    SET NEW.account_scope_id = NEW.account_id;
  ELSE
    SET NEW.account_scope_id = 0;
  END IF;

  IF NEW.period_type = 'finance_interest' THEN
    SELECT account_kind INTO v_kind
    FROM accounts
    WHERE id = NEW.account_id
    LIMIT 1;

    IF v_kind IS NULL OR v_kind <> 'finance' THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'budgets.finance_interest requires accounts.account_kind=finance';
    END IF;
  END IF;
END$$
DELIMITER ;
