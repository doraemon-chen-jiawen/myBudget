-- 系统默认收入分类
INSERT INTO income_categories
  (user_id, period_type, category_key, label, icon, hint, color, bg_color, color_light, quick_amounts, default_amount, allow_negative, sort_order, is_system, is_active, updated_at)
VALUES
  -- Monthly (2)
  (NULL, 'monthly', 'salary', '工资收入', '💰', '每月固定工资', '#6FCF97', 'rgba(111,207,151,0.1)', 'rgba(111,207,151,0.3)', '[\"8000\",\"10000\",\"15000\"]', 10000.00, 0, 1, 1, 1, CURRENT_TIMESTAMP),
  (NULL, 'monthly', 'finance_interest', '理财利息', '📈', '理财月度收益', '#56CCF2', 'rgba(86,204,242,0.1)', 'rgba(86,204,242,0.3)', '[\"100\",\"200\",\"500\"]', 500.00, 0, 2, 1, 1, CURRENT_TIMESTAMP),
  -- Yearly (2)
  (NULL, 'yearly', 'stock_profit', '股票收益', '📊', '股票年度收益（可能亏损）', '#A78BFA', 'rgba(167,139,250,0.1)', 'rgba(167,139,250,0.3)', '[\"-10000\",\"0\",\"10000\",\"50000\"]', 0.00, 1, 1, 1, 1, CURRENT_TIMESTAMP),
  (NULL, 'yearly', 'lottery', '中奖', '🎰', '各类彩票、抽奖中奖', '#FFB38A', 'rgba(255,179,138,0.1)', 'rgba(255,179,138,0.3)', '[\"100\",\"500\",\"1000\"]', 0.00, 0, 2, 1, 1, CURRENT_TIMESTAMP)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  icon = VALUES(icon),
  hint = VALUES(hint),
  color = VALUES(color),
  bg_color = VALUES(bg_color),
  color_light = VALUES(color_light),
  quick_amounts = VALUES(quick_amounts),
  default_amount = VALUES(default_amount),
  allow_negative = VALUES(allow_negative),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active),
  updated_at = VALUES(updated_at);
