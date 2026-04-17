-- Migration: Add Kas RT Summary RPC Function
-- Description: Creates a PostgreSQL function for efficient summary calculation
-- using SQL aggregation instead of fetching all transactions

-- ────────────────────────────────────────────────────────────────────────────
-- Function: get_kas_rt_summary
-- Calculates financial summary with single SQL query using conditional aggregation
-- ────────────────────────────────────────────────────────────────────────────

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
    -- Total balance (all transactions: income = +amount, expense = -amount)
    COALESCE(
      SUM(
        CASE 
          WHEN type = 'income' THEN amount 
          ELSE -amount 
        END
      ), 
      0
    )::NUMERIC AS balance,
    
    -- Balance up to end of previous month
    COALESCE(
      SUM(
        CASE 
          WHEN date <= p_prev_month_end THEN
            CASE 
              WHEN type = 'income' THEN amount 
              ELSE -amount 
            END
          ELSE 0 
        END
      ), 
      0
    )::NUMERIC AS balance_end_prev_month,
    
    -- This month income
    COALESCE(
      SUM(
        CASE 
          WHEN date >= p_this_month_start AND type = 'income' THEN amount 
          ELSE 0 
        END
      ), 
      0
    )::NUMERIC AS this_month_income,
    
    -- This month expense
    COALESCE(
      SUM(
        CASE 
          WHEN date >= p_this_month_start AND type = 'expense' THEN amount 
          ELSE 0 
        END
      ), 
      0
    )::NUMERIC AS this_month_expense,
    
    -- Previous month net (income - expense)
    COALESCE(
      SUM(
        CASE 
          WHEN date >= p_prev_month_start AND date <= p_prev_month_end THEN
            CASE 
              WHEN type = 'income' THEN amount 
              ELSE -amount 
            END
          ELSE 0 
        END
      ), 
      0
    )::NUMERIC AS prev_month_net
    
  FROM kas_rt_transactions
  WHERE 
    tenant_id = p_tenant_id
    AND community_id = p_community_id
    AND deleted_at IS NULL;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_kas_rt_summary IS 
  'Calculates Kas RT financial summary using SQL aggregation. Excludes soft-deleted transactions.';
