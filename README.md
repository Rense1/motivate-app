# Motivate App – 目標達成サポートアプリ
Next.js × Supabase × Tailwind × Capacitor

## 概要
Motivate App は、
「理想の未来（Vision） → マイルストーン → 日々のタスク」
という流れでユーザーの目標達成をサポートするアプリです。

- ビジョンボードで理想の未来を視覚化
- マイルストーンで中長期の道筋を整理
- タスクで日々の行動を管理
- 長押しで「なぜやるのか？」を記録
- 達成したマイルストーンは自動で緑色に変化
- Supabase Storage による画像アップロード
- スマホ利用を前提とした軽量 UI
- Capacitor により Android アプリとしてビルド可能

## 技術スタック

| 分類 | 使用技術 |
|------|----------|
| フロントエンド | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| バックエンド | Supabase (Auth / Database / Storage) |
| 状態管理 | React Hooks |
| 認証 | Supabase Auth + Middleware |
| セキュリティ | RLS（Row Level Security） |
| デプロイ | Vercel |
| モバイル | Capacitor（Android ビルド） |

## 主な機能

### 1. ビジョンボード
- 未来の理想像を画像＋テキストで保存
- Supabase Storage にアップロード
- ホーム画面に常時表示

### 2. マイルストーンロードマップ
- 縦スクロールで進捗を確認
- 達成した項目は自動で緑色に変化
- 長押しで「理由」を記録

### 3. タスク管理
- 日々の行動をタスクとして登録
- チェック可能
- 長押しで理由モーダル表示
- マイルストーンごとにタスクを紐付け

### 4. 認証（Supabase Auth）
- ログイン / サインアップ
- Middleware によるルート保護
- RLS によるユーザーごとのデータ分離

## ディレクトリ構成（主要部分）

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/
│   │   ├── home/
│   │   ├── goals/
│   │   └── milestones/[id]/tasks/[milestoneId]/
│   ├── auth/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── auth/
│   ├── home/
│   ├── milestone/
│   ├── task/
│   └── ui/
│
├── lib/
│   └── supabase/
│       └── types.ts
│
└── middleware.ts
```


## 実装済みコンポーネント
- VisionBoard（画像アップロード＋編集）
- TodayTaskList（今日のタスク）
- MilestoneProgress（進捗ウィジェット）
- MilestoneRoadmap（縦スクロール UI）
- ReasonsModal（理由記録）
- TaskCard（長押しで理由表示）
- TaskReasonModal
- BottomNav
- Modal（汎用）

## セキュリティ
- Supabase Auth による認証
- Middleware で未ログインユーザーをブロック
- RLS によるユーザーごとのデータ分離
- Storage ポリシーで画像もユーザー単位で管理

## 品質
- TypeScript エラーなし
- Next.js ビルド成功
- Supabase RLS 動作確認済み
- 本番環境（Vercel）で動作確認済み
- Android 実機テスト済み（Capacitor）

## 今後の改善予定
- PWA 対応（ホーム画面追加・オフライン対応）
- プッシュ通知（タスクリマインダー）
- Android / iOS ウィジェット
- マイルストーンの期限管理
- 達成率のグラフ化

## セットアップ方法（ローカル）

1. Supabase プロジェクトを作成
2. `supabase_schema.sql` を SQL Editor で実行
3. `.env.local` を作成し以下を設定

```
NEXT_PUBLIC_SUPABASE_URL=xxxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
```

4. 依存関係をインストール

```
npm install
```

5. 開発サーバーを起動

```
npm run dev
```

## デプロイ
- Vercel にてデプロイ済み
- 環境変数（URL / anon key）を設定するだけで自動デプロイ

## 作者
Rensei  
本プロジェクトは個人開発として制作しました。  
一部の機能検証・実機テストについては友人に協力してもらっています。


