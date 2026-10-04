-- =============================================================================
-- House Payment Overrides — mark a house/blok as paid WITHOUT creating money
--
-- Problem: /kas-rt/house-status derives "Lunas" from the sum of real
-- kas_rt_transactions amounts (>= Rp1.440.000 for 12 months). There was no way
-- to record "this block is settled" when no money moved (waived IPL, arrears
-- carried by a decision, correction of an offline cash payment, etc.) without
-- inflating the cash totals with a phantom transaction.
--
-- Solution: an override credits *months*, never rupiah. It raises the paid
-- count and fills months visually, while every money figure (total2026,
-- balance, income/expense, summary) stays exactly as the real transactions
-- say. Marking and revoking are both recorded for audit; revoke is soft so
-- history is never destroyed.
-- =============================================================================

CREATE TABLE house_payment_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  year INT NOT NULL,
  -- How many monthly IPL installments this override credits (1..12).
  -- 12 = full year settled.
  credited_months INT NOT NULL DEFAULT 12,
  -- Short machine-ish label, e.g. 'PEMBEBASAN', 'KOREKSI', 'TITIP_BAYAR'.
  reason VARCHAR(40),
  -- Free-text justification shown in the audit list.
  notes TEXT,
  -- Soft state: revoking flips this to FALSE and stamps revoked_*. Never deleted.
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT house_payment_overrides_credited_months_check
    CHECK (credited_months BETWEEN 1 AND 12),
  CONSTRAINT house_payment_overrides_year_check
    CHECK (year BETWEEN 2020 AND 2100),
  -- A revoke must be complete: both stamps or neither.
  CONSTRAINT house_payment_overrides_revoke_pair_check
    CHECK ((revoked_at IS NULL) = (is_active))
);

-- At most one *active* override per house per year. Revoked rows are exempt so
-- the same house can be re-marked later without losing the earlier history.
CREATE UNIQUE INDEX uq_house_payment_overrides_active
  ON house_payment_overrides (tenant_id, community_id, house_id, year)
  WHERE is_active = TRUE;

CREATE INDEX idx_house_payment_overrides_house_id
  ON house_payment_overrides(house_id);
CREATE INDEX idx_house_payment_overrides_year
  ON house_payment_overrides(tenant_id, community_id, year);
CREATE INDEX idx_house_payment_overrides_active_year
  ON house_payment_overrides(tenant_id, community_id, year)
  WHERE is_active = TRUE;
CREATE INDEX idx_house_payment_overrides_marked_by
  ON house_payment_overrides(marked_by);

-- ── RLS: server-side (service role) only, mirroring the other kas-rt tables ──
ALTER TABLE house_payment_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "House payment overrides: no anon access"
  ON house_payment_overrides FOR ALL TO anon
  USING (false) WITH CHECK (false);

COMMENT ON TABLE house_payment_overrides IS
  'Credits monthly IPL installments to a house WITHOUT creating a kas_rt_transaction. Raises the paid/lunas count and fills months visually; never changes any money total. Revoke is soft (is_active=false + revoked_at) to preserve audit history.';
COMMENT ON COLUMN house_payment_overrides.credited_months IS
  'Number of monthly IPL installments credited (1..12). 12 = full year settled.';
COMMENT ON COLUMN house_payment_overrides.reason IS
  'Short label for why the override exists, e.g. PEMBEBASAN, KOREKSI, TITIP_BAYAR.';
COMMENT ON COLUMN house_payment_overrides.is_active IS
  'FALSE after revoke. Only active rows count toward paid totals.';
