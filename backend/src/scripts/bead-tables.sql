-- 拼豆助手模块 - 数据库建表脚本
-- 在 MySQL 中执行此脚本创建所需表

-- 图纸表
CREATE TABLE IF NOT EXISTS bead_drawings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '图纸名称',
  description VARCHAR(500) DEFAULT NULL COMMENT '图纸描述',
  width INT DEFAULT 58 COMMENT '画布宽度（颗）',
  height INT DEFAULT 58 COMMENT '画布高度（颗）',
  thumbnail VARCHAR(500) DEFAULT NULL COMMENT '缩略图URL',
  preview_image VARCHAR(500) DEFAULT NULL COMMENT '成品预览图URL',
  pixel_image VARCHAR(500) DEFAULT NULL COMMENT '像素图纸URL',
  is_active TINYINT DEFAULT 1 COMMENT '是否启用',
  sort_order INT DEFAULT 0 COMMENT '排序权重',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_size (width, height),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='拼豆图纸表';

-- 标签表
CREATE TABLE IF NOT EXISTS drawing_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL COMMENT '标签名称',
  is_active TINYINT DEFAULT 1 COMMENT '是否启用',
  sort_order INT DEFAULT 0 COMMENT '排序权重',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='图纸标签表';

-- 图纸-标签关联表
CREATE TABLE IF NOT EXISTS drawing_tag_relations (
  drawing_id INT NOT NULL COMMENT '图纸ID',
  tag_id INT NOT NULL COMMENT '标签ID',
  PRIMARY KEY (drawing_id, tag_id),
  INDEX idx_tag_id (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='图纸标签关联表';

-- 图纸用料清单表
CREATE TABLE IF NOT EXISTS drawing_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drawing_id INT NOT NULL COMMENT '图纸ID',
  color_code VARCHAR(20) NOT NULL COMMENT '色号',
  color_name VARCHAR(50) DEFAULT NULL COMMENT '颜色名称',
  quantity INT NOT NULL DEFAULT 0 COMMENT '所需数量',
  sort_order INT DEFAULT 0 COMMENT '排序权重',
  INDEX idx_drawing_id (drawing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='图纸用料清单表';

-- 用户收藏表
CREATE TABLE IF NOT EXISTS user_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  drawing_id INT NOT NULL COMMENT '图纸ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_drawing (user_id, drawing_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户图纸收藏表';

-- 插入示例标签
INSERT IGNORE INTO drawing_tags (name, sort_order) VALUES
('动物', 1),
('花朵', 2),
('卡通', 3),
('节日', 4),
('人物', 5),
('食物', 6),
('交通工具', 7),
('建筑', 8);

-- 插入示例图纸
INSERT INTO bead_drawings (name, description, width, height, sort_order) VALUES
('小熊拼豆', '可爱小熊图案，适合新手', 58, 58, 1),
('彩虹花朵', '彩色花朵图案', 58, 58, 2),
('圣诞树', '节日圣诞树图案', 58, 87, 3),
('卡通猫咪', '萌系猫咪图案', 58, 87, 4),
('生日蛋糕', '生日蛋糕庆祝图案', 58, 116, 5);

-- 关联标签
INSERT INTO drawing_tag_relations (drawing_id, tag_id) VALUES
(1, 1), (1, 3),
(2, 2), (2, 3),
(3, 4),
(4, 1), (4, 3),
(5, 6);

-- 插入示例用料清单（使用 MARD 221 色号）
INSERT INTO drawing_materials (drawing_id, color_code, color_name, quantity, sort_order) VALUES
(1, 'H1', '白色', 120, 1),
(1, 'E15', '浅玫粉', 45, 2),
(1, 'G7', '深棕色', 80, 3),
(1, 'H16', '黑色', 288, 4),
(2, 'H1', '白色', 50, 1),
(2, 'F4', '正红色', 35, 2),
(2, 'A5', '金黄色', 15, 3),
(2, 'B4', '草绿色', 180, 4),
(2, 'C5', '海蓝色', 93, 5);

-- 用户转换记录表
CREATE TABLE IF NOT EXISTS user_conversions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  name VARCHAR(100) DEFAULT '我的图纸' COMMENT '图纸名称',
  width INT DEFAULT 58 COMMENT '画布宽度（颗）',
  height INT DEFAULT 58 COMMENT '画布高度（颗）',
  pixel_image VARCHAR(500) DEFAULT NULL COMMENT '像素图纸图片路径',
  pixel_data TEXT DEFAULT NULL COMMENT '像素数据（2D数组JSON）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_size (width, height)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户图片转换记录表';

-- 转换记录用料清单
CREATE TABLE IF NOT EXISTS conversion_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversion_id INT NOT NULL COMMENT '转换记录ID',
  color_code VARCHAR(20) NOT NULL COMMENT '色号',
  color_name VARCHAR(50) DEFAULT NULL COMMENT '颜色名称',
  quantity INT NOT NULL DEFAULT 0 COMMENT '所需数量',
  sort_order INT DEFAULT 0 COMMENT '排序权重',
  INDEX idx_conversion_id (conversion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='转换记录用料清单表';

-- 拼豆色卡表
CREATE TABLE IF NOT EXISTS bead_colors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL COMMENT '色号',
  name VARCHAR(50) NOT NULL COMMENT '颜色名称',
  r INT DEFAULT 0 COMMENT 'R值',
  g INT DEFAULT 0 COMMENT 'G值',
  b INT DEFAULT 0 COMMENT 'B值',
  is_active TINYINT DEFAULT 1,
  UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='拼豆标准色卡';

-- 用户库存表
CREATE TABLE IF NOT EXISTS bead_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  color_code VARCHAR(20) NOT NULL COMMENT '色号',
  quantity INT NOT NULL DEFAULT 0 COMMENT '库存数量',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_color (user_id, color_code),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户拼豆库存表';

-- 库存日志表
CREATE TABLE IF NOT EXISTS bead_inventory_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  color_code VARCHAR(20) NOT NULL COMMENT '色号',
  type ENUM('in', 'out') NOT NULL COMMENT '操作类型',
  quantity INT NOT NULL COMMENT '数量',
  source VARCHAR(50) DEFAULT 'manual' COMMENT '来源：manual/order',
  note VARCHAR(200) DEFAULT NULL COMMENT '备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='库存出入库日志';

-- 用户库存统计范围配置
CREATE TABLE IF NOT EXISTS user_stat_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  drawing_id INT DEFAULT NULL COMMENT '官方图纸ID',
  conversion_id INT DEFAULT NULL COMMENT '用户转换记录ID',
  is_stat TINYINT DEFAULT 1 COMMENT '是否纳入统计',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户库存统计范围配置';

-- 插入 MARD 221 完整色卡数据（221种颜色）
INSERT IGNORE INTO bead_colors (code, name, r, g, b) VALUES
-- A 系列：黄色系 (26色)
('A1', '淡奶黄', 250, 245, 205),
('A2', '奶黄色', 252, 254, 214),
('A3', '柠檬黄', 252, 255, 146),
('A4', '明黄色', 247, 236, 92),
('A5', '金黄色', 240, 216, 58),
('A6', '橘黄色', 253, 169, 81),
('A7', '橙色', 250, 140, 79),
('A8', '向日葵黄', 251, 218, 77),
('A9', '肉橙色', 247, 157, 95),
('A10', '深橙色', 244, 126, 56),
('A11', '浅杏色', 254, 219, 153),
('A12', '桃橙色', 253, 162, 118),
('A13', '琥珀黄', 254, 198, 103),
('A14', '朱红色', 247, 88, 66),
('A15', '亮黄色', 251, 246, 94),
('A16', '浅黄色', 254, 255, 151),
('A17', '芥末黄', 253, 225, 115),
('A18', '驼色', 252, 191, 128),
('A19', '珊瑚粉', 253, 126, 119),
('A20', '橘金色', 249, 214, 102),
('A21', '杏黄色', 250, 227, 147),
('A22', '黄绿色', 237, 248, 120),
('A23', '米驼色', 228, 200, 186),
('A24', '浅草黄', 243, 246, 169),
('A25', '荧光黄', 253, 247, 133),
('A26', '橙黄色', 255, 199, 52),
-- B 系列：绿色系 (32色)
('B1', '黄绿色', 223, 241, 59),
('B2', '翠绿色', 100, 243, 67),
('B3', '浅绿色', 161, 245, 134),
('B4', '草绿色', 95, 223, 52),
('B5', '亮绿色', 57, 225, 88),
('B6', '薄荷绿', 100, 224, 164),
('B7', '松石绿', 62, 174, 124),
('B8', '深绿色', 29, 155, 84),
('B9', '墨绿色', 42, 80, 55),
('B10', '浅水绿', 154, 209, 186),
('B11', '橄榄绿', 98, 112, 50),
('B12', '森林绿', 26, 110, 61),
('B13', '嫩绿色', 200, 232, 125),
('B14', '青绿色', 171, 232, 79),
('B15', '暗绿色', 48, 83, 53),
('B16', '苹果绿', 192, 237, 156),
('B17', '苔绿色', 158, 179, 62),
('B18', '荧光绿', 230, 237, 79),
('B19', '孔雀绿', 38, 183, 142),
('B20', '粉绿色', 203, 236, 207),
('B21', '青色', 24, 97, 106),
('B22', '深青色', 10, 66, 65),
('B23', '暗草绿', 52, 59, 26),
('B24', '嫩黄绿', 232, 250, 166),
('B25', '灰绿色', 78, 132, 109),
('B26', '军绿色', 144, 124, 53),
('B27', '浅橄榄', 208, 224, 175),
('B28', '翡翠绿', 158, 229, 187),
('B29', '草绿黄', 198, 223, 95),
('B30', '淡绿黄', 227, 251, 177),
('B31', '豆绿色', 180, 230, 145),
('B32', '黄绿灰', 146, 173, 96),
-- C 系列：蓝色系 (29色)
('C1', '淡青色', 240, 254, 228),
('C2', '浅蓝色', 171, 248, 254),
('C3', '天蓝色', 162, 224, 247),
('C4', '湖蓝色', 68, 205, 251),
('C5', '海蓝色', 6, 170, 223),
('C6', '钴蓝色', 84, 167, 233),
('C7', '宝蓝色', 57, 119, 202),
('C8', '藏蓝色', 15, 82, 189),
('C9', '深蓝色', 51, 73, 195),
('C10', '孔雀蓝', 60, 188, 227),
('C11', '青蓝色', 42, 222, 211),
('C12', '深藏蓝', 30, 51, 78),
('C13', '粉蓝色', 205, 231, 254),
('C14', '浅水蓝', 213, 252, 247),
('C15', '湖蓝绿', 33, 197, 196),
('C16', '靛蓝色', 24, 88, 162),
('C17', '冰蓝色', 2, 209, 243),
('C18', '深灰蓝', 33, 50, 68),
('C19', '蓝绿色', 24, 134, 157),
('C20', '矢车菊蓝', 26, 112, 169),
('C21', '雾蓝色', 188, 221, 252),
('C22', '灰蓝色', 107, 177, 187),
('C23', '淡蓝灰', 200, 226, 253),
('C24', '浅蓝灰', 126, 197, 249),
('C25', '水绿色', 169, 232, 224),
('C26', '青灰色', 66, 173, 207),
('C27', '薰衣蓝', 208, 222, 249),
('C28', '灰蓝灰', 189, 206, 232),
('C29', '深紫蓝', 54, 74, 137),
-- D 系列：紫色系 (26色)
('D1', '淡紫色', 172, 183, 239),
('D2', '紫罗兰', 134, 141, 211),
('D3', '蓝色紫', 53, 84, 175),
('D4', '深蓝紫', 22, 45, 123),
('D5', '紫红色', 179, 78, 198),
('D6', '浅紫红', 179, 123, 220),
('D7', '暗紫色', 135, 88, 169),
('D8', '淡粉紫', 227, 210, 254),
('D9', '薰衣草', 213, 185, 244),
('D10', '深紫色', 48, 26, 73),
('D11', '灰紫色', 190, 185, 226),
('D12', '粉紫色', 220, 153, 206),
('D13', '紫红色', 181, 3, 141),
('D14', '深紫红', 134, 41, 147),
('D15', '靛紫色', 47, 31, 140),
('D16', '淡紫灰', 226, 228, 240),
('D17', '浅紫蓝', 199, 211, 249),
('D18', '中紫色', 154, 100, 184),
('D19', '藕荷色', 216, 194, 217),
('D20', '葡萄紫', 154, 53, 173),
('D21', '紫罗兰紫', 148, 5, 149),
('D22', '蓝紫色', 56, 56, 154),
('D23', '浅紫粉', 234, 219, 248),
('D24', '紫蓝色', 118, 138, 225),
('D25', '蓝紫灰', 73, 80, 194),
('D26', '灰紫灰', 214, 198, 235),
-- E 系列：粉色系 (24色)
('E1', '肉粉色', 246, 212, 203),
('E2', '粉色', 252, 193, 221),
('E3', '粉紫色', 246, 189, 232),
('E4', '玫瑰粉', 232, 100, 158),
('E5', '桃红色', 240, 86, 159),
('E6', '玫红色', 235, 65, 114),
('E7', '深玫红', 197, 54, 116),
('E8', '浅粉色', 253, 219, 233),
('E9', '粉紫红', 227, 118, 199),
('E10', '深粉色', 209, 59, 149),
('E11', '肉色', 247, 218, 212),
('E12', '浅玫红', 246, 147, 191),
('E13', '紫红色', 181, 2, 106),
('E14', '杏粉色', 250, 212, 191),
('E15', '浅玫粉', 245, 201, 202),
('E16', '米白色', 251, 244, 236),
('E17', '浅粉色', 247, 227, 236),
('E18', '桃粉色', 249, 200, 219),
('E19', '粉红色', 246, 187, 209),
('E20', '灰粉色', 215, 198, 206),
('E21', '深灰粉', 192, 157, 164),
('E22', '藕粉色', 179, 140, 159),
('E23', '灰紫粉', 147, 125, 138),
('E24', '淡紫色', 222, 190, 229),
-- F 系列：红色系 (25色)
('F1', '珊瑚红', 254, 147, 129),
('F2', '红色', 246, 61, 75),
('F3', '朱红色', 238, 78, 62),
('F4', '正红色', 251, 42, 64),
('F5', '深红色', 225, 3, 40),
('F6', '暗红色', 145, 54, 53),
('F7', '酒红色', 145, 25, 50),
('F8', '暗红色', 187, 1, 38),
('F9', '粉红色', 224, 103, 122),
('F10', '棕色', 135, 70, 40),
('F11', '深棕色', 89, 35, 35),
('F12', '玫瑰红', 243, 83, 107),
('F13', '橙红色', 244, 92, 69),
('F14', '浅粉色', 252, 173, 178),
('F15', '大红色', 213, 5, 39),
('F16', '肤色', 248, 192, 169),
('F17', '肉橙色', 232, 155, 125),
('F18', '黄棕色', 208, 127, 74),
('F19', '暗红色', 190, 69, 74),
('F20', '灰红色', 198, 148, 149),
('F21', '粉色', 242, 184, 198),
('F22', '浅粉红', 247, 195, 208),
('F23', '橙粉色', 237, 128, 108),
('F24', '玫粉色', 224, 157, 175),
('F25', '火红色', 232, 72, 84),
-- G 系列：棕色系 (21色)
('G1', '肤色', 255, 228, 211),
('G2', '浅肤色', 252, 198, 172),
('G3', '杏色', 241, 196, 165),
('G4', '棕色', 220, 179, 135),
('G5', '黄棕色', 231, 179, 78),
('G6', '金棕色', 227, 160, 20),
('G7', '深棕色', 152, 92, 58),
('G8', '栗色', 113, 61, 47),
('G9', '驼色', 228, 182, 133),
('G10', '焦糖色', 218, 140, 66),
('G11', '卡其色', 218, 200, 152),
('G12', '橙杏色', 254, 201, 147),
('G13', '咖啡色', 178, 113, 75),
('G14', '深咖啡', 139, 104, 76),
('G15', '米色', 246, 248, 227),
('G16', '奶白色', 242, 216, 193),
('G17', '深驼色', 119, 84, 78),
('G18', '浅肤色', 255, 227, 213),
('G19', '橘棕色', 221, 125, 65),
('G20', '红棕色', 165, 69, 47),
('G21', '土黄色', 179, 133, 97),
-- H 系列：黑白灰 (23色)
('H1', '白色', 255, 255, 255),
('H2', '灰白色', 251, 251, 251),
('H3', '浅灰色', 180, 180, 180),
('H4', '中灰色', 135, 135, 135),
('H5', '深灰色', 70, 70, 72),
('H6', '炭灰色', 44, 44, 44),
('H8', '藕荷灰', 231, 214, 220),
('H9', '浅灰色', 239, 237, 238),
('H10', '银灰色', 235, 235, 235),
('H11', '灰色', 205, 205, 205),
('H12', '米白色', 253, 246, 238),
('H13', '浅灰粉', 244, 237, 241),
('H14', '灰绿色', 206, 215, 212),
('H15', '青灰色', 154, 166, 166),
('H16', '黑色', 27, 18, 19),
('H17', '亮灰色', 240, 238, 239),
('H18', '象牙白', 252, 255, 246),
('H19', '米灰色', 242, 238, 229),
('H20', '灰蓝色', 150, 160, 159),
('H21', '浅黄白', 248, 251, 230),
('H22', '蓝灰色', 202, 202, 210),
('H23', '灰绿色', 155, 156, 148),
-- M 系列：混合色 (15色)
('M1', '灰绿色', 187, 198, 182),
('M2', '深灰绿', 144, 153, 148),
('M3', '青灰色', 105, 126, 129),
('M4', '米驼色', 224, 212, 188),
('M5', '灰米色', 209, 204, 175),
('M6', '橄榄灰', 176, 170, 134),
('M7', '灰驼色', 176, 167, 150),
('M8', '灰红色', 174, 128, 130),
('M9', '灰棕色', 166, 136, 98),
('M10', '灰粉色', 196, 179, 187),
('M11', '灰紫色', 157, 118, 147),
('M12', '深灰紫', 100, 75, 81),
('M13', '驼色', 199, 146, 102),
('M14', '红棕色', 194, 117, 99),
('M15', '灰青色', 116, 125, 122);

-- 用户库存预警设置表
CREATE TABLE IF NOT EXISTS bead_alert_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  low_stock_threshold INT DEFAULT 50 COMMENT '低库存阈值（默认50）',
  out_of_stock_threshold INT DEFAULT 0 COMMENT '缺货阈值（默认0）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户库存预警设置表';

-- 为现有用户插入默认设置
INSERT IGNORE INTO bead_alert_settings (user_id, low_stock_threshold, out_of_stock_threshold)
SELECT DISTINCT user_id, 50, 0 FROM bead_inventory;

-- V1.2: 个人图纸增加拼接状态和原图字段
-- MySQL 8.0 < 8.0.29 不支持 ADD COLUMN IF NOT EXISTS，用存储过程兼容
DROP PROCEDURE IF EXISTS bead_add_columns_v12;
DELIMITER $$
CREATE PROCEDURE bead_add_columns_v12()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'user_conversions' AND column_name = 'is_assembled') THEN
    ALTER TABLE user_conversions ADD COLUMN is_assembled TINYINT DEFAULT 0 COMMENT '是否已拼接：0未拼 1已拼';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'user_conversions' AND column_name = 'original_image') THEN
    ALTER TABLE user_conversions ADD COLUMN original_image VARCHAR(500) DEFAULT NULL COMMENT '原图路径';
  END IF;
END$$
DELIMITER ;
CALL bead_add_columns_v12();
DROP PROCEDURE IF EXISTS bead_add_columns_v12;
