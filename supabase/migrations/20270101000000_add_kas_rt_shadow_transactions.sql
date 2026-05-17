-- =============================================================================
-- Add shadow transaction support for Kas-RT
--
-- Changes:
--   1. Add `is_shadow` BOOLEAN column to kas_rt_transactions
--   2. Update CHECK constraint to allow negative amounts for shadow transactions
--   3. Update get_kas_rt_summary RPC to handle shadow transactions correctly
-- =============================================================================

-- 1. Add is_shadow column (default FALSE for backward compatibility)
ALTER TABLE kas_rt_transactions
  ADD COLUMN is_shadow BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Drop old CHECK constraint
ALTER TABLE kas_rt_transactions
  DROP CONSTRAINT IF EXISTS kas_rt_transactions_amount_check;

-- 3. Add new CHECK constraint
--    - Normal transactions (is_shadow = FALSE): amount must be > 0
--    - Shadow transactions (is_shadow = TRUE): amount can be positive or negative, but not zero
ALTER TABLE kas_rt_transactions
  ADD CONSTRAINT kas_rt_transactions_amount_check
  CHECK (
    (is_shadow = FALSE AND amount > 0)
    OR
    (is_shadow = TRUE AND amount != 0)
  );

-- 4. Add index for efficient filtering of shadow/non-shadow transactions
CREATE INDEX idx_kas_rt_tx_is_shadow ON kas_rt_transactions (is_shadow) WHERE is_shadow = TRUE;

-- 5. Update the RPC function to handle shadow transactions
--    Shadow transactions use signed amount directly (positive adds, negative subtracts)
CREATE OR REPLACE FUNCTION get_kas_rt_summary(
  p_tenant_id UUID,
  p_community_id UUID,
  p_this_month_start DATE,
  p_prev_month_end DATE,
  p_prev_month_start DATE
)
RETURNS TABLE (
  balance NUMERIC,
  balance_end_prev_month NUMERIC,
  this_month_income NUMERIC,
  this_month_expense NUMERIC,
  prev_month_net NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total balance: shadow uses signed amount directly, normal uses type-based sign
    COALESCE(SUM(signed_amount), 0)::NUMERIC AS balance,

    -- Balance up to end of previous month
    COALESCE(SUM(CASE WHEN date <= p_prev_month_end THEN signed_amount ELSE 0 END), 0)::NUMERIC AS balance_end_prev_month,

    -- This month income (only non-shadow, since shadow is yearly)
    COALESCE(SUM(CASE WHEN date >= p_this_month_start AND type = 'income' AND is_shadow = FALSE THEN amount ELSE 0 END), 0)::NUMERIC AS this_month_income,

    -- This month expense (only non-shadow, since shadow is yearly)
    COALESCE(SUM(CASE WHEN date >= p_this_month_start AND type = 'expense' AND is_shadow = FALSE THEN amount ELSE 0 END), 0)::NUMERIC AS this_month_expense,

    -- Previous month net (only non-shadow)
    COALESCE(SUM(CASE WHEN date >= p_prev_month_start AND date <= p_prev_month_end THEN signed_amount ELSE 0 END), 0)::NUMERIC AS prev_month_net

  FROM (
    SELECT *,
      CASE
        WHEN is_shadow THEN amount           -- shadow: signed value used directly
        WHEN type = 'income' THEN amount      -- normal income: positive
        ELSE -amount                          -- normal expense: negative
      END AS signed_amount
    FROM kas_rt_transactions
    WHERE
      tenant_id = p_tenant_id
      AND community_id = p_community_id
      AND deleted_at IS NULL
  ) sub;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_kas_rt_summary IS
  'Calculates Kas RT financial summary using SQL aggregation. Shadow transactions use signed amount directly. Excludes soft-deleted transactions.';

COMMENT ON COLUMN kas_rt_transactions.is_shadow IS
  'If TRUE, this is a shadow transaction (hidden from main UI, uses signed amount directly in calculations, always dated 31 Dec of the year).';
