-- ============================================================
-- カスタム頻度・タスク期日 スキーマ拡張
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 1. frequency 制約を 'custom' を含む形に更新
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_frequency_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_frequency_check
  CHECK (frequency IN ('daily', 'weekly', 'none', 'weekly_2', 'every_3_days', 'monthly_n', 'custom'));

-- 2. interval_value: N日/週/月 の N
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS interval_value INTEGER DEFAULT 1
  CHECK (interval_value >= 1);

-- 3. interval_unit: 'day' | 'week' | 'month'
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS interval_unit TEXT DEFAULT 'week'
  CHECK (interval_unit IN ('day', 'week', 'month'));

-- 4. タスク単体の期日
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS deadline DATE;

-- ============================================================
-- 補足
-- monthly_count カラム（既存）を times_per_interval として流用します。
-- 例: 3日に2回 → frequency='custom', interval_value=3,
--     interval_unit='day', monthly_count=2
-- ============================================================
