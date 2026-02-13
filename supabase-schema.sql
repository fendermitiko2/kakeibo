-- ============================================
-- LINE 家計簿アプリ: Supabase テーブル定義
-- ============================================
-- Supabase の SQL Editor で実行してください

-- 取引テーブル
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,              -- 'YYYY-MM' 形式
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,          -- 金額（正の整数）
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL DEFAULT 'その他',
  is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス: ユーザー × 月 での集計を高速化
CREATE INDEX IF NOT EXISTS idx_transactions_user_month
  ON transactions (user_id, month);

-- インデックス: 固定費の検索を高速化
CREATE INDEX IF NOT EXISTS idx_transactions_fixed
  ON transactions (user_id, is_fixed)
  WHERE is_fixed = TRUE;

-- RLS (Row Level Security) を有効化
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- anon キーで全操作を許可するポリシー
-- （個人用アプリのため。本番ではJWTで制限推奨）
CREATE POLICY "Allow all operations for anon"
  ON transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);
