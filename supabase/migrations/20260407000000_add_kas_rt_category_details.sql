-- =============================================================================
-- Add kas_rt_transaction_category_details table
-- Stores rate configurations for pre-calculated expense amounts
-- =============================================================================

-- Create the table
CREATE TABLE kas_rt_transaction_category_details (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      UUID         NOT NULL REFERENCES kas_rt_transaction_categories(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  rate_per_warga   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (rate_per_warga >= 0),
  sort_order       INT          NOT NULL DEFAULT 0,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ,
  UNIQUE (category_id, name)
);

-- Add comment
COMMENT ON TABLE kas_rt_transaction_category_details IS 'Rate configurations for pre-calculated Kas RT expense amounts. Each detail represents a component (e.g., Satpam+Sampah, Kas RW) with a rate per resident.';

COMMENT ON COLUMN kas_rt_transaction_category_details.rate_per_warga IS 'Amount per resident (warga). Total for this detail = rate_per_warga * jumlah_warga at transaction time.';

-- Indexes for efficient lookup
CREATE INDEX idx_kas_rt_category_details_category 
  ON kas_rt_transaction_category_details (category_id, sort_order);

CREATE INDEX idx_kas_rt_category_details_active 
  ON kas_rt_transaction_category_details (category_id) 
  WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE kas_rt_transaction_category_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can read category details (they're just rate templates, not sensitive)
CREATE POLICY "Anyone can read kas RT category details" 
  ON kas_rt_transaction_category_details 
  FOR SELECT 
  USING (TRUE);

-- Anon cannot write category details
CREATE POLICY "Anon cannot write kas RT category details" 
  ON kas_rt_transaction_category_details 
  FOR ALL 
  TO anon 
  USING (false) 
  WITH CHECK (false);

-- Authenticated users can insert (will be restricted by admin guard in API)
CREATE POLICY "Authenticated users can insert kas RT category details" 
  ON kas_rt_transaction_category_details 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (TRUE);

-- Authenticated users can update (will be restricted by admin guard in API)
CREATE POLICY "Authenticated users can update kas RT category details" 
  ON kas_rt_transaction_category_details 
  FOR UPDATE 
  TO authenticated 
  USING (TRUE)
  WITH CHECK (TRUE);

-- Authenticated users can delete (will be restricted by admin guard in API)
CREATE POLICY "Authenticated users can delete kas RT category details" 
  ON kas_rt_transaction_category_details 
  FOR DELETE 
  TO authenticated 
  USING (TRUE);
