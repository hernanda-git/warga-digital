-- ============================================================
-- RT Asset Logs
-- Single polymorphic table for all asset history entries.
-- log_type discriminates which extra columns are relevant.
-- ============================================================

CREATE TYPE rt_asset_log_type AS ENUM (
  'status_change',
  'part_replacement',
  'maintenance',
  'general'
);

CREATE TABLE rt_asset_logs (
  id            UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id      UUID                NOT NULL REFERENCES rt_assets(id) ON DELETE CASCADE,
  tenant_id     UUID                NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- discriminator
  log_type      rt_asset_log_type   NOT NULL,

  -- status_change fields
  old_status    VARCHAR(20),          -- 'used' | 'unused' | 'unset'
  new_status    VARCHAR(20),          -- 'used' | 'unused' | 'unset'

  -- part_replacement fields
  part_name     VARCHAR(200),
  replaced_with VARCHAR(200),

  -- shared narrative (used by maintenance, general, and optionally part_replacement)
  notes         TEXT,

  -- audit
  logged_by     UUID                REFERENCES users(id),
  logged_at     TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rt_asset_logs_asset  ON rt_asset_logs (asset_id, logged_at DESC);
CREATE INDEX idx_rt_asset_logs_tenant ON rt_asset_logs (tenant_id);

-- RLS
ALTER TABLE rt_asset_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users in the same tenant may read
CREATE POLICY "rt_asset_logs_select" ON rt_asset_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = rt_asset_logs.tenant_id
        AND tu.user_id   = auth.uid()
        AND tu.status    = 'ACTIVE'
    )
  );

-- Authenticated users in the same tenant may insert
CREATE POLICY "rt_asset_logs_insert" ON rt_asset_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = rt_asset_logs.tenant_id
        AND tu.user_id   = auth.uid()
        AND tu.status    = 'ACTIVE'
    )
  );

-- No UPDATE or DELETE — logs are immutable.
