# REVIVE — iOS ビルド手順書（友人 Mac 用）

## 事前に必要なもの（あなた側で用意）
- [ ] Apple Developer Program 登録済み（$99/年）→ appleid.apple.com
- [ ] このプロジェクトフォルダを友人 Mac に渡す（zip / USB / GitHub）
- [ ] `node_modules` は渡さなくてよい（友人側で `npm install`）

---

## 友人 Mac での作業手順

### Step 1 — 環境セットアップ

```bash
# Node.js（v18以上）がない場合
brew install node

# Xcode は App Store からインストール（13GB 程度・時間かかる）
# インストール後にコマンドラインツールを有効化
xcode-select --install

# CocoaPods
sudo gem install cocoapods
```

### Step 2 — プロジェクトの準備

```bash
# プロジェクトフォルダに移動
cd revive-app   # フォルダ名はあなたが渡したもの

# 依存関係インストール
npm install

# Web アセットをビルドして Capacitor に同期
npm run cap:sync
```

### Step 3 — iOS フォルダを生成

```bash
npx cap add ios
```

### Step 4 — CocoaPods でネイティブ依存関係をインストール

```bash
cd ios/App
pod install
cd ../..
```

### Step 5 — Xcode でプロジェクトを開く

```bash
npx cap open ios
# または
open ios/App/App.xcworkspace
```

> ⚠️ `.xcworkspace` を開くこと。`.xcodeproj` ではない。

---

## Xcode での設定

### Signing & Capabilities
1. 左のツリーで **App** プロジェクトを選択
2. **Signing & Capabilities** タブ
3. **Team** → Apple Developer アカウントを選択
4. **Bundle Identifier** を `com.revive.app` に設定
5. Xcode が自動で証明書・プロビジョニングを作成する

### App Groups（ウィジェット用・必須）
1. **Signing & Capabilities** → `+ Capability` → **App Groups** を追加
2. `+` ボタンで `group.com.revive.app` を追加
3. ウィジェット Extension（後述）にも同じ App Group を追加すること

### Push Notifications（後で対応する場合）
1. `+ Capability` → **Push Notifications** を追加
2. `+ Capability` → **Background Modes** → **Remote notifications** にチェック

---

## WidgetPlugin の追加（ウィジェット連携用）

Androidの `WidgetPlugin.kt` に相当するiOS版プラグインです。

1. `ios-source/RevivePlugin/WidgetPlugin.swift` を `ios/App/App/` にコピー
2. `ios/App/App/AppDelegate.swift` の `application(_:didFinishLaunchingWithOptions:)` に追記：
   ```swift
   // 既存の super.application(...) の後に追加
   let bridge = self.bridge
   bridge?.registerPlugin(WidgetPlugin.self)
   ```

---

## WidgetKit 拡張の追加（ホーム画面ウィジェット）

### 1. Widget Extension ターゲットを追加

1. Xcode メニュー → **File → New → Target...**
2. **Widget Extension** を選択 → Next
3. Product Name: `ReviveWidget`
4. Include Configuration Intent: **オフ**（チェックを外す）
5. **Finish** → "Activate scheme?" → **Activate**

### 2. Swift ファイルをコピー

1. `ios-source/ReviveWidget/ReviveWidget.swift` を `ios/ReviveWidget/` フォルダにコピー
2. Xcode でファイルを右クリック → "Add Files to ReviveWidget..."

### 3. Widget Extension に App Group を追加

1. 左ツリーで **ReviveWidget** ターゲットを選択
2. **Signing & Capabilities** → `+ Capability` → **App Groups**
3. `group.com.revive.app` を追加（App と同じ ID）

### 4. WidgetKit Framework のリンク確認

1. **ReviveWidget** ターゲット → **Build Phases** → **Link Binary With Libraries**
2. `WidgetKit.framework` が含まれているか確認（通常は自動で追加済み）

---

## 実機ビルド（テスト）

1. iPhone を Mac に USB 接続
2. iPhone の **設定 → デベロッパ** でデバイスを信頼
3. Xcode 上部でターゲットデバイスを自分の iPhone に変更
4. **▶ ビルド** ボタンを押す

ビルド後、iPhone のホーム画面を長押し → `+` → REVIVE でウィジェットを追加できます。

---

## TestFlight / App Store 提出

### 1. App Store Connect でアプリを作成
- [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- マイ App → `+` → 新規 App
- プラットフォーム：iOS
- バンドル ID：`com.revive.app`（Apple Developer Portal で事前登録が必要）

### 2. Archive（配布用ビルド）を作成
1. Xcode のターゲットを **Any iOS Device（arm64）** に変更
2. メニュー → **Product → Archive**
3. Organizer が開くので **Distribute App** をクリック
4. **App Store Connect** → **Upload** → すべてデフォルトで進む

### 3. TestFlight で内部テスト
1. App Store Connect → TestFlight
2. アップロードされたビルドを選択
3. テスターのメールアドレスを追加
4. テスター側で TestFlight アプリをインストールして確認

### 4. 審査提出
1. App Store Connect → 「このビルドを提出する準備ができました」
2. 必要情報を入力：
   - スクリーンショット（iPhone 6.7インチ必須、iPad は任意）
   - プライバシーポリシー URL（必須）
   - アプリ説明文・キーワード
   - レーティング情報

---

## Supabase / Google OAuth の iOS 設定

### Supabase ダッシュボードで設定（あなたが行う）
1. Authentication → URL Configuration
2. **Redirect URLs** に追加：
   ```
   com.revive.app://auth/callback
   ```

### iOS の URL Scheme 設定（Xcode で行う）
1. `ios/App/App/Info.plist` を開く（または Xcode の Info タブ）
2. URL Types を追加：
   - Identifier：`com.revive.app`
   - URL Schemes：`com.revive.app`

これで `com.revive.app://auth/callback` が iOS でも動作する。

---

## よくある問題

| 問題 | 対処 |
|------|------|
| `pod install` でエラー | `pod repo update` を実行してから再試行 |
| Signing エラー | Apple Developer に登録したアカウントで Xcode にサインイン |
| WebView が真っ白 | `npm run cap:sync` を再実行して Xcode でビルド |
| `command not found: pod` | `sudo gem install cocoapods` |
| Archive できない | Target を "Any iOS Device" に変更しているか確認 |
| ウィジェットが「Premium限定」と表示 | アプリを起動して Supabase で `is_premium = true` に設定 |
| ウィジェットにタスクが出ない | アプリを一度開いてタスク画面を表示（App Group に同期される） |

---

## 友人に渡すファイル一覧

```
revive-app/
├── src/
├── public/
├── android/          ← そのまま渡す
├── ios-source/       ← iOS用Swiftファイル（Xcodeで追加する）
│   ├── ReviveWidget/
│   │   └── ReviveWidget.swift   ← WidgetKit拡張
│   └── RevivePlugin/
│       └── WidgetPlugin.swift   ← Capacitorブリッジ
├── capacitor.config.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
└── .env.local        ← Supabase の環境変数（必須）
```

> `node_modules/` と `out/` は渡さなくてよい。
