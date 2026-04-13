-- ============================================================
-- Premium feature schema
-- Run this in Supabase SQL Editor after the base schema
-- ============================================================

-- ============================================================
-- Premium frequency extension (run after supabase_schema_frequency.sql)
-- ============================================================

-- Extend frequency check to support premium frequency values
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_frequency_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_frequency_check
  CHECK (frequency IN ('daily', 'weekly', 'none', 'weekly_2', 'every_3_days', 'monthly_n'));

-- monthly_count: target completions per month (used with monthly_n)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS monthly_count INTEGER DEFAULT 1
  CHECK (monthly_count >= 1 AND monthly_count <= 31);

-- period_done_count: completions in the current tracking period
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS period_done_count INTEGER DEFAULT 0;

-- period_start: start date of the period stored in period_done_count
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS period_start DATE;

-- ============================================================
-- User profiles table (extends auth.users)
-- ============================================================

-- User profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  is_premium BOOLEAN DEFAULT FALSE NOT NULL,
  premium_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
