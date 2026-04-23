-- ============================================================
-- Premium RLS セキュリティ修正
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 1. 既存の「ユーザーが自分のプロフィールを更新できる」ポリシーを削除
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- 2. is_premium / premium_started_at を除いた安全な UPDATE ポリシーを再作成
--    （display_name, avatar_url などは自分で変更可能）
CREATE POLICY "Users can update their own profile (safe)" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- is_premium と premium_started_at は変更不可
    AND is_premium = (SELECT is_premium FROM profiles WHERE id = auth.uid())
    AND (
      premium_started_at IS NOT DISTINCT FROM
      (SELECT premium_started_at FROM profiles WHERE id = auth.uid())
    )
  );

-- ============================================================
-- 自分自身に Premium を付与する（管理者用コマンド）
-- ダッシュボードの SQL Editor で実行 → RLS をバイパスして更新される
-- ============================================================
-- UPDATE profiles
-- SET is_premium = true,
--     premium_started_at = now()
-- WHERE id = (
--   SELECT id FROM auth.users WHERE email = 'あなたのメールアドレス'
-- );
