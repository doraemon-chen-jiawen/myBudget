-- 修改 wechat_openid 允许为 NULL，以便支持用户名密码登录
-- 如果字段已经是 NULL 或不存在也不会报错
ALTER TABLE users MODIFY COLUMN wechat_openid VARCHAR(100) NULL;

-- 添加用户名和密码字段到 users 表（如果已存在则跳过）
-- 使用存储过程来安全地添加列
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'username'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE AFTER id',
    'SELECT ''Column username already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'password_hash'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) AFTER username',
    'SELECT ''Column password_hash already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 创建一个默认测试用户（密码: password123）
-- 使用 INSERT IGNORE 或 ON DUPLICATE KEY UPDATE 避免重复插入
INSERT INTO users (username, password_hash, nickname, wechat_openid, is_active, created_at, updated_at)
VALUES ('admin', '$2b$10$nFrankQeW.Ie5NEAwdqGLexzHHYH2dM7kYy15m2qFR0yi4jXFe2mi', '管理员', NULL, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    nickname = VALUES(nickname);
