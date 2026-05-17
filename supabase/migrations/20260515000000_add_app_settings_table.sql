-- Create app_settings table for storing key-value configuration
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  UNIQUE (tenant_id, key)
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read settings
CREATE POLICY "Authenticated users can read app_settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Only service_role (admin API) can write
CREATE POLICY "Only service_role can insert app_settings"
  ON app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (FALSE);

CREATE POLICY "Only service_role can update app_settings"
  ON app_settings
  FOR UPDATE
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

CREATE POLICY "Only service_role can delete app_settings"
  ON app_settings
  FOR DELETE
  TO authenticated
  USING (FALSE);

-- Anon cannot access at all
CREATE POLICY "Anon cannot read app_settings"
  ON app_settings
  FOR ALL
  TO anon
  USING (FALSE)
  WITH CHECK (FALSE);

-- Seed the default logo_url setting for the default tenant
INSERT INTO app_settings (tenant_id, key, value)
VALUES (
  'a0000000-0000-7000-8000-000000000001'::uuid,
  'logo_url',
  NULL
)
ON CONFLICT (tenant_id, key) DO NOTHING;
