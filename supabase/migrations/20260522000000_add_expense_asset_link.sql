-- =============================================================================
-- WARGA DIGITAL — Link Kas RT Expenses to RT Assets
-- Version: v0.3.0
-- Created: 2026-05-22
--
-- Adds expense→asset linking and auto-logging:
--   1. asset_id FK on kas_rt_transactions (nullable, for expense transactions)
--   2. 'expense' value in rt_asset_log_type enum
--   3. transaction_id + payment_amount + payment_date on rt_asset_logs
-- =============================================================================


-- =============================================================================
-- 1. Add asset_id to kas_rt_transactions
-- =============================================================================

ALTER TABLE kas_rt_transactions
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES rt_assets(id) ON DELETE SET NULL;

COMMENT ON COLUMN kas_rt_transactions.asset_id
  IS 'Aset terkait (untuk transaksi pengeluaran)';

CREATE INDEX IF NOT EXISTS idx_kas_rt_transactions_asset
  ON kas_rt_transactions (asset_id);


-- =============================================================================
-- 2. Add 'expense' to rt_asset_log_type enum
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'expense'
      AND enumtypid = 'rt_asset_log_type'::regtype
  ) THEN
    ALTER TYPE rt_asset_log_type ADD VALUE 'expense';
  END IF;
END $$;


-- =============================================================================
-- 3. Add expense-specific columns to rt_asset_logs
-- =============================================================================

ALTER TABLE rt_asset_logs
ADD COLUMN IF NOT EXISTS transaction_id  UUID REFERENCES kas_rt_transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_amount  NUMERIC(14,2),
ADD COLUMN IF NOT EXISTS payment_date    DATE;

CREATE INDEX IF NOT EXISTS idx_rt_asset_logs_transaction
  ON rt_asset_logs (transaction_id);

COMMENT ON COLUMN rt_asset_logs.transaction_id  IS 'Referensi ke transaksi kas RT (untuk log tipe expense)';
COMMENT ON COLUMN rt_asset_logs.payment_amount  IS 'Jumlah pembayaran (untuk log tipe expense)';
COMMENT ON COLUMN rt_asset_logs.payment_date    IS 'Tanggal pembayaran (untuk log tipe expense)';


-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================