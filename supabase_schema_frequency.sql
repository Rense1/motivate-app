-- ============================================================
-- Task frequency schema migration
-- Run in Supabase SQL Editor after base schema
-- ============================================================

-- Add frequency column to tasks
-- 'daily'   = every day (replaces is_daily = true)
-- 'weekly'  = once a week
-- 'none'    = one-time task (replaces is_daily = false)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'daily'
  CHECK (frequency IN ('daily', 'weekly', 'none'));

-- Migrate existing is_daily values
UPDATE tasks SET frequency = 'daily' WHERE is_daily = TRUE;
UPDATE tasks SET frequency = 'none'  WHERE is_daily = FALSE;
