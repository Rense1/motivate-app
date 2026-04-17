-- profiles テーブルに INSERT ポリシーを追加
-- handle_new_user() トリガーが SECURITY DEFINER で自動作成するが、
-- 万一トリガーが動かなかった場合でも usePremium.ts の upsert が失敗しないよう安全網として追加

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

-- 匿名ユーザーを含むすべての認証済みユーザーが自分のプロフィールを参照・更新できる
-- (既存ポリシーの確認用コメント)
-- "Users can read their own profile"  FOR SELECT USING (auth.uid() = id)
-- "Users can update their own profile" FOR UPDATE USING (auth.uid() = id)
