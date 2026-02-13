# LINE 家計簿アプリ 📒

LINEでメッセージを送るだけで自動的に家計簿をつけられるアプリです。

## 機能

- 📝 LINEメッセージで収支を登録
- 🤖 カテゴリ自動分類（キーワードベース）
- 💰 収入/支出の自動判定
- 📊 月次集計コマンド
- 📌 固定費管理

## 使い方

### 登録

```
ランチ 1200
スーパー 4500 食費
給料 250000
家賃 70000 固定
電気 8000 光熱費 固定
```

**形式:** `{説明} {金額} [{カテゴリ}] [固定]`

- カテゴリ省略時はキーワードから自動分類
- 「固定」をつけると固定費として登録
- 給料・ボーナス等は自動的に「収入」として判定

### コマンド

| コマンド | 内容 |
|---------|------|
| `今月` | 今月の集計（収入・支出・残高・カテゴリ別） |
| `固定一覧` | 登録済み固定費の一覧 |

## セットアップ

### 1. LINE Developers 設定

1. [LINE Developers Console](https://developers.line.biz/) にアクセス
2. プロバイダーを作成
3. **Messaging API** チャンネルを作成
4. 以下を控える:
   - **Channel Secret** （基本設定 → チャネルシークレット）
   - **Channel Access Token** （Messaging API設定 → チャネルアクセストークン 発行）

### 2. Supabase 設定

1. [Supabase](https://supabase.com/) でプロジェクトを作成
2. SQL Editor で `supabase-schema.sql` の内容を実行
3. 以下を控える:
   - **Project URL** （Settings → API → Project URL）
   - **anon key** （Settings → API → Project API keys → anon public）

### 3. Vercel デプロイ

```bash
# Vercel CLI をインストール（未インストールの場合）
npm i -g vercel

# デプロイ
vercel

# 環境変数を設定
vercel env add LINE_CHANNEL_SECRET
vercel env add LINE_CHANNEL_ACCESS_TOKEN
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY

# 環境変数を反映して再デプロイ
vercel --prod
```

### 4. Webhook URL 設定

1. LINE Developers Console → Messaging API 設定
2. Webhook URL を設定: `https://your-project.vercel.app/api/webhook`
3. **Webhook の利用** をオンにする
4. **応答メッセージ** をオフにする（LINE公式アカウント設定）

### 5. 動作確認

LINE アプリで Bot を友だち追加して、メッセージを送信！

## 技術スタック

| 項目 | 技術 | 料金 |
|------|------|------|
| サーバー | Vercel Serverless Functions | 無料枠 |
| DB | Supabase (PostgreSQL) | 無料枠 |
| LINE | Messaging API | 無料 |
| ランタイム | Node.js | - |

## プロジェクト構成

```
line-kakeibo/
├── api/
│   └── webhook.js        ← Webhook エンドポイント
├── lib/
│   ├── supabase.js       ← Supabase クライアント
│   ├── parser.js         ← メッセージ解析
│   ├── category.js       ← カテゴリ自動分類
│   ├── db.js             ← DB操作
│   └── summary.js        ← 集計フォーマット
├── test/
│   └── test.js           ← ユニットテスト
├── supabase-schema.sql   ← DB テーブル定義
├── vercel.json           ← Vercel 設定
├── package.json
└── .env.example
```

## ローカル開発

```bash
# 依存インストール
npm install

# テスト実行
npm test
```
