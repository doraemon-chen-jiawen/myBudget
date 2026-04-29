-- ============================================================
-- Seed: 系统初始数据（可重复执行）
-- 包含：默认管理员用户 + 系统默认预算分类
-- 前置：先执行 database/schema.sql 建表
-- ============================================================

-- 默认管理员用户（密码: password123）
INSERT INTO users (username, password_hash, nickname, wechat_openid, is_active, created_at, updated_at)
VALUES ('admin', '$2b$10$nFrankQeW.Ie5NEAwdqGLexzHHYH2dM7kYy15m2qFR0yi4jXFe2mi', '管理员', NULL, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    nickname = VALUES(nickname);

-- 系统默认预算分类
INSERT INTO budget_categories
  (user_id, period_type, category_key, label, icon, hint, color, bg_color, color_light, quick_amounts, default_amount, sort_order, is_system, is_active, updated_at)
VALUES
  -- Daily (4)
  (NULL, 'daily', 'breakfast',         '早餐',       '🥐', '开启美好的一天',       '#FFB38A', 'rgba(255,179,138,0.1)',  'rgba(255,179,138,0.3)',  '["10","15","20"]',       10.00,  2, 1, 1, CURRENT_TIMESTAMP),
  (NULL, 'daily', 'lunch',             '午餐',       '🍱', '午休时光',             '#56CCF2', 'rgba(86,204,242,0.1)',   'rgba(86,204,242,0.3)',   '["25","35","50"]',       25.00,  3, 1, 1, CURRENT_TIMESTAMP),
  (NULL, 'daily', 'dinner',            '晚餐',       '🍲', '放松用餐时间',         '#A78BFA', 'rgba(167,139,250,0.1)',  'rgba(167,139,250,0.3)',  '["30","45","60"]',       25.00,  4, 1, 1, CURRENT_TIMESTAMP),
  (NULL, 'daily', 'transport',         '交通',       '🚇', '地铁、公交、打车等',   '#6FCF97', 'rgba(111,207,151,0.1)',  'rgba(111,207,151,0.3)',  '["10","20","30"]',       10.00,  1, 1, 1, CURRENT_TIMESTAMP),
  -- Monthly (6)
  (NULL, 'monthly', 'clothing',        '服饰',       '👕', '衣物、鞋子、配饰',     '#FF6B9D', 'rgba(255,107,157,0.1)',  'rgba(255,107,157,0.3)',  '["200","500","1000"]',   200.00, 1, 1, 1, CURRENT_TIMESTAMP),
  (NULL, 'monthly', 'social',          '社交',       '🎉', '聚会、请客、娱乐',     '#6FCF97', 'rgba(111,207,151,0.1)',  'rgba(111,207,151,0.3)',  '["200","500","800"]',    200.00, 2, 1, 1, CURRENT_TIMESTAMP),
  (NULL, 'monthly', 'drinks',          '饮料',       '☕', '咖啡、奶茶、果汁',     '#FFB38A', 'rgba(255,179,138,0.1)',  'rgba(255,179,138,0.3)',  '["100","200","300"]',    200.00, 3, 1, 1, CURRENT_TIMESTAMP),
  (NULL, 'monthly', 'snacks',          '零食',       '🍿', '小食、甜品、坚果',     '#4ADE80', 'rgba(74,222,128,0.1)',   'rgba(74,222,128,0.3)',   '["100","200","400"]',    200.00, 4, 1, 1, CURRENT_TIMESTAMP),
  (NULL, 'monthly', 'daily_necessities','日用品',    '🧴', '洗护、纸品、清洁',     '#56CCF2', 'rgba(86,204,242,0.1)',   'rgba(86,204,242,0.3)',   '["100","200","500"]',    200.00, 5, 1, 1, CURRENT_TIMESTAMP),
  (NULL, 'monthly', 'other_family',    '其他家庭花销','🏠','杂项、应急支出',      '#A78BFA', 'rgba(167,139,250,0.1)',  'rgba(167,139,250,0.3)',  '["300","500","1000"]',   200.00, 6, 1, 1, CURRENT_TIMESTAMP),
  -- Finance (2)
  (NULL, 'finance_interest', 'interest_daily',  '每日利息预算','💎','理财每日收益目标','#6FCF97','rgba(111,207,151,0.1)','rgba(111,207,151,0.3)','["30","50","100"]',    50.00,  1, 1, 1, CURRENT_TIMESTAMP),
  (NULL, 'finance_interest', 'interest_monthly', '每月利息预算','📈','理财月度收益目标','#56CCF2','rgba(86,204,242,0.1)','rgba(86,204,242,0.3)','["500","1000","2000"]', 1000.00, 2, 1, 1, CURRENT_TIMESTAMP),
  -- Yearly (2)
  (NULL, 'yearly', 'travel',           '旅游',        '✈️', '年度旅游支出',        '#2E86DE', 'rgba(46,134,222,0.1)',   'rgba(46,134,222,0.3)',   '["2000","4000","6000"]', 5000.00, 1, 1, 1, CURRENT_TIMESTAMP),
  (NULL, 'yearly', 'parents',          '孝敬父母',     '👨‍👩‍👧', '给父母的孝心',        '#FF6B6B', 'rgba(255,107,107,0.1)', 'rgba(255,107,107,0.3)', '["500","1000","5000"]', 10000.00, 2, 1, 1, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  icon = VALUES(icon),
  hint = VALUES(hint),
  color = VALUES(color),
  bg_color = VALUES(bg_color),
  color_light = VALUES(color_light),
  quick_amounts = VALUES(quick_amounts),
  default_amount = VALUES(default_amount),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);
