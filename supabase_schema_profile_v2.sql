-- ============================================================
-- Migration: Profile v2
-- - profiles に生年月日・職業カラムを追加
-- - Anonymous Auth を有効化すること:
--   Supabase Dashboard > Authentication > Providers > Anonymous Sign-ins を ON
-- ============================================================

-- profiles テーブルに新カラムを追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_year   smallint   CHECK (birth_year  BETWEEN 1900 AND 2100),
  ADD COLUMN IF NOT EXISTS birth_month  smallint   CHECK (birth_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS birth_day    smallint   CHECK (birth_day   BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS occupation   text;

-- occupation の値チェック制約
ALTER TABLE public.profiles
  ADD CONSTRAINT occupation_values CHECK (
    occupation IS NULL OR occupation IN (
      'student_elementary', 'student_middle', 'student_high',
      'student_university', 'employee', 'employee_contract',
      'self_employed', 'civil_servant', 'homemaker', 'unemployed', 'other'
    )
  );

-- RLS: 既存ポリシーはそのまま（id = auth.uid() のみ更新可）
-- Anonymous ユーザーも auth.uid() が返るため RLS はそのまま動作する

-- ============================================================
-- [手動手順] Supabase ダッシュボードで以下を実施してください:
--   1. Authentication > Providers > Anonymous Sign-ins を有効化
--   2. このSQLをSupabase SQL Editorで実行
-- ============================================================
