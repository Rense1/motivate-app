-- ============================================================
-- Migration: Anonymous user support fix
-- Run this in Supabase SQL Editor if anonymous users cannot
-- create goals or if their profile rows are missing.
-- ============================================================

-- 1. Ensure profiles INSERT policy exists (allows anonymous users to upsert their own row)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Users can insert their own profile'
      AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON profiles
      FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 2. Drop FK constraint on goals.user_id so anonymous user IDs
--    (which exist in auth.users) are not blocked by old constraint issues.
--    RLS policy already enforces auth.uid() = user_id, so data integrity is maintained.
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;

-- 3. Drop FK constraint on profiles.id (keep PK) so upsert never fails
--    due to deferred constraint checks. The handle_new_user trigger already
--    creates profile rows automatically on user creation.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 4. Verify the auto-create profile trigger is in place
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

-- Re-create trigger if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;
