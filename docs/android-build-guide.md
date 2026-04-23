# REVIVE — Android ビルド & Google Play 提出手順書

## 前提環境
- Android Studio（最新版）インストール済み
- JDK 17 以上（Android Studio 同梱版で可）
- Node.js 18 以上

---

## Step 1 — Web アセットをビルドして Capacitor に同期

```bash
# プロジェクトルートで実行
npm run cap:sync
# 内部で next build && npx cap sync が実行される
```

---
a
## Step 2 — Keystore（署名鍵）を作成

**1回だけ実行。絶対に紛失・漏洩させないこと。**

```bash
keytool -genkey -v \
  -keystore revive-release.keystore \
  -alias revive \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

対話プロンプトで入力する内容：
| 項目 | 例 |
|------|----|
| キーストアパスワード | （強力なパスワードを設定） |
| 名前と姓 | Rense Kawakami |
| 組織単位 | （空欄でOK） |
| 組織 | REVIVE |
| 都市 | Tokyo |
| 都道府県 | Tokyo |
| 国コード | JP |

生成された `revive-release.keystore` を **安全な場所に保管**（OneDrive / パスワードマネージャー推奨）。

---

## Step 3 — gradle.properties に署名情報を追加

`android/gradle.properties` に追記（Git にコミットしない）：

```properties
REVIVE_KEYSTORE_PATH=/path/to/revive-release.keystore
REVIVE_KEYSTORE_PASSWORD=あなたのパスワード
REVIVE_KEY_ALIAS=revive
REVIVE_KEY_PASSWORD=あなたのパスワード
```

`android/app/build.gradle` の `android {}` ブロックに追加：

```groovy
signingConfigs {
    release {
        storeFile file(REVIVE_KEYSTORE_PATH)
        storePassword REVIVE_KEYSTORE_PASSWORD
        keyAlias REVIVE_KEY_ALIAS
        keyPassword REVIVE_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

---

## Step 4 — AAB（Android App Bundle）を生成

```bash
cd android
./gradlew bundleRelease
```

出力先：`android/app/build/outputs/bundle/release/app-release.aab`

---

## Step 5 — Google Play Console への提出

1. [Google Play Console](https://play.google.com/console) でアプリを新規作成
2. アプリ名：**REVIVE** / パッケージ名：`com.revive.app`
3. 内部テスト → `app-release.aab` をアップロード
4. 必要情報を入力：
   - アプリカテゴリ：ライフスタイル / 生産性
   - コンテンツレーティング：全年齢
   - プライバシーポリシー URL（必須）
5. Google OAuth を使う場合：
   - Play Console → アプリの署名 → **SHA-1 フィンガープリント** を取得
   - Google Cloud Console → OAuth 同意画面 → 承認済みのリダイレクト URI に追加：
     `com.revive.app:/auth/callback`
   - Supabase Dashboard → Authentication → URL Configuration → Redirect URLs に同じ URL を追加

---

## versionCode の更新方法

リリースごとに `android/app/build.gradle` の `versionCode` を +1 する：

```groovy
defaultConfig {
    versionCode 2        // ← リリースごとに増やす
    versionName "1.1"   // ← ユーザー表示用バージョン
}
```

---

## トラブルシューティング

| エラー | 対処 |
|--------|------|
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | 既存アプリを削除してから再インストール |
| `Keystore was tampered` | keystore ファイルのパスを確認 |
| WebView 真っ白 | `npm run cap:sync` を再実行 |
| Google ログインが失敗 | SHA-1 が Google Cloud Console に登録されているか確認 |
