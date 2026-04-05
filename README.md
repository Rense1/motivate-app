# 📘 Motivate App – 目標達成サポートアプリ
**Next.js × Supabase × Tailwind / 個人開発プロジェクト**

---

## 🚀 概要

**Motivate App** は、  
「理想の未来（ビジョン）→ マイルストーン → 日々のタスク」  
という流れで、ユーザーの目標達成をサポートするアプリです。

- ビジョンボードで“理想の未来”を視覚化  
- マイルストーンで中長期の道筋を整理  
- タスクで日々の行動を管理  
- 長押しで「なぜやるのか？」を記録し、モチベ維持  
- 達成したマイルストーンは自動で緑色に変化  
- 画像アップロード対応（Supabase Storage）

スマホ利用を前提に、**直感的で軽量な UI** を意識して設計しました。

---

## 🛠 技術スタック

| 分類 | 使用技術 |
|------|-----------|
| フロントエンド | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| バックエンド | Supabase (Auth / Database / Storage) |
| 状態管理 | React Hooks (useState) |
| デプロイ | Vercel |
| その他 | RLS（Row Level Security）, Middleware 認証保護 |

---

## 📱 主な機能

### 🔥 1. ビジョンボード
- 未来の理想像を画像＋テキストで保存  
- Supabase Storage に画像アップロード  
- ホーム画面に常時表示  

### 🔥 2. マイルストーンロードマップ
- 縦スクロールで進捗を確認  
- 達成した項目は自動で緑色に  
- 長押しで「理由」を記録できる  

### 🔥 3. タスク管理
- 日々の行動をタスクとして登録  
- チェック可能  
- 長押しで理由モーダル表示  
- マイルストーンごとにタスクを紐付け  

### 🔥 4. 認証（Supabase Auth）
- ログイン / サインアップ  
- Middleware によるルート保護  
- RLS によるユーザーごとのデータ分離  

---

## 📂 ディレクトリ構成（主要部分）

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
│   ├── auth/              # Supabase Auth 関連
│   ├── favicon.ico
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
├── store/                 # 状態管理（必要に応じて）
│
└── middleware.ts          # 認証保護（Middleware）
```

---

## 🧩 実装済みコンポーネント

- VisionBoard（画像アップロード＋編集）  
- TodayTaskList（今日のタスク）  
- MilestoneProgress（進捗ウィジェット）  
- MilestoneRoadmap（縦スクロール）  
- ReasonsModal（理由記録）  
- TaskCard（長押しで理由表示）  
- TaskReasonModal  
- BottomNav  
- Modal（汎用）  

---

## 🔐 セキュリティ

- Supabase Auth による認証  
- Middleware で未ログインユーザーをブロック  
- RLS によるユーザーごとのデータ分離  
- Storage ポリシーで画像もユーザー単位で管理  

---

## 🧪 品質

- TypeScript エラーなし  
- Next.js ビルド成功  
- Supabase RLS 動作確認済み  
- 本番環境（Vercel）で動作確認済み  

---

## 🚧 今後の改善予定

- PWA 対応（ホーム画面追加・オフライン対応）  
- プッシュ通知（タスクリマインダー）  
- ウィジェット表示（iOS / Android）  
- マイルストーンの期限管理  
- 達成率のグラフ化  

---

## 🛠 セットアップ方法（ローカル）

1. Supabase でプロジェクト作成  
2. `supabase_schema.sql` を SQL Editor で実行  
3. `.env.local` を作成し以下を設定：
NEXT_PUBLIC_SUPABASE_URL=xxxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx

4. 依存関係インストール
```npm install```

5. 開発サーバー起動  
```npm run dev```

---

## 🌐 デプロイ

- Vercel にてデプロイ済み  
- 環境変数（URL / anon key）を設定して自動デプロイ  

---

## ✨ 作者

- **Rense1**  
- Data Science 専攻  
- AI チーム（Claude Code）と協働し、要件定義〜実装まで担当  