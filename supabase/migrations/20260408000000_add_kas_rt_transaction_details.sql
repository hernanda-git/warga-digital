-- =============================================================================
-- Add kas_rt_transaction_details table
-- Stores actual expense breakdowns per transaction (snapshot at creation time)
-- =============================================================================

-- Create the table
CREATE TABLE kas_rt_transaction_details (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id   UUID         NOT NULL REFERENCES kas_rt_transactions(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  rate_per_warga   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (rate_per_warga >= 0),
  jumlah_warga     INT          NOT NULL DEFAULT 0 CHECK (jumlah_warga >= 0),
  subtotal         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  sort_order       INT          NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE kas_rt_transaction_details IS 'Snapshot of expense breakdown at transaction creation time. Each detail represents a component (e.g., Satpam+Sampah, Kas RW) with rate per resident, number of residents, and subtotal.';

COMMENT ON COLUMN kas_rt_transaction_details.transaction_id IS 'Reference to the parent kas_rt_transactions record.';

COMMENT ON COLUMN kas_rt_transaction_details.name IS 'Name of the expense component (e.g., "Satpam+Sampah", "Kas RW").';

COMMENT ON COLUMN kas_rt_transaction_details.rate_per_warga IS 'Amount per resident at the time of transaction creation.';

COMMENT ON COLUMN kas_rt_transaction_details.jumlah_warga IS 'Number of residents used in the calculation at transaction creation time.';

COMMENT ON COLUMN kas_rt_transaction_details.subtotal IS 'Calculated as rate_per_warga * jumlah_warga.';

-- Indexes for efficient lookup
CREATE INDEX idx_kas_rt_transaction_details_transaction 
  ON kas_rt_transaction_details (transaction_id, sort_order);

-- Enable RLS
ALTER TABLE kas_rt_transaction_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can read transaction details (they're part of the transaction data)
CREATE POLICY "Anyone can read kas RT transaction details" 
  ON kas_rt_transaction_details 
  FOR SELECT 
  USING (TRUE);

-- Anon cannot write transaction details
CREATE POLICY "Anon cannot write kas RT transaction details" 
  ON kas_rt_transaction_details 
  FOR ALL 
  TO anon 
  USING (false) 
  WITH CHECK (false);

-- Authenticated users can insert (will be restricted by API auth guard)
CREATE POLICY "Authenticated users can insert kas RT transaction details" 
  ON kas_rt_transaction_details 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (TRUE);

-- Authenticated users can update (will be restricted by API auth guard)
CREATE POLICY "Authenticated users can update kas RT transaction details" 
  ON kas_rt_transaction_details 
  FOR UPDATE 
  TO authenticated 
  USING (TRUE)
  WITH CHECK (TRUE);

-- Authenticated users can delete (will be restricted by API auth guard)
CREATE POLICY "Authenticated users can delete kas RT transaction details" 
  ON kas_rt_transaction_details 
  FOR DELETE 
  TO authenticated 
  USING (TRUE);
