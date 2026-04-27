-- 添加 quick_tap 到 records.source 枚举值
-- 需要先修改为可变长字符串，然后再改回带新枚举值的 ENUM

-- 第一步：修改为 VARCHAR 允许所有值
ALTER TABLE records MODIFY COLUMN source VARCHAR(20) NOT NULL DEFAULT 'manual';

-- 第二步：改回 ENUM 并添加 quick_tap
ALTER TABLE records MODIFY COLUMN source ENUM('manual','import','auto','quick_tap') NOT NULL DEFAULT 'manual';
