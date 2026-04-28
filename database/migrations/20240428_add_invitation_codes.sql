-- 创建邀请码表
CREATE TABLE IF NOT EXISTS invitation_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  family_group_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(8) NOT NULL COMMENT '8位随机邀请码',
  created_by BIGINT UNSIGNED NOT NULL COMMENT '创建者user_id',
  max_uses INT NOT NULL DEFAULT 10 COMMENT '最大使用次数',
  used_count INT NOT NULL DEFAULT 0 COMMENT '已使用次数',
  expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL 30 DAY) COMMENT '过期时间',
  is_active TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_invitation_codes_code (code),
  KEY idx_invitation_codes_family_group_id (family_group_id),
  KEY idx_invitation_codes_expires_at (expires_at),
  CONSTRAINT fk_invitation_codes_family_group
    FOREIGN KEY (family_group_id) REFERENCES family_groups(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_invitation_codes_creator
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
