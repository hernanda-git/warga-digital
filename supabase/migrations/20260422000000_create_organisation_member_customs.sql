-- =============================================================================
-- WARGA DIGITAL — Organisation Member Customs
-- Created: 2026-04-22
--
-- Adds support for custom name, profile picture, and WhatsApp number
-- for organisation members, separate from their actual user data.
-- =============================================================================

-- Create organisation_member_customs table
CREATE TABLE organisation_member_customs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_member_id UUID NOT NULL UNIQUE REFERENCES organisation_members(id) ON DELETE CASCADE,
  custom_full_name TEXT NOT NULL,
  custom_block_name TEXT NOT NULL DEFAULT '',
  custom_whatsapp_number TEXT NOT NULL,
  custom_profile_picture_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_organisation_member_customs_member_id 
  ON organisation_member_customs(organisation_member_id);

-- Add comment
COMMENT ON TABLE organisation_member_customs IS 'Custom display data for organisation members (overrides user data)';
COMMENT ON COLUMN organisation_member_customs.organisation_member_id IS 'References organisation_members.id (1:1 relationship)';
COMMENT ON COLUMN organisation_member_customs.custom_full_name IS 'Custom display name for the member';
COMMENT ON COLUMN organisation_member_customs.custom_block_name IS 'Custom block/area name';
COMMENT ON COLUMN organisation_member_customs.custom_whatsapp_number IS 'Custom WhatsApp number for contact';
COMMENT ON COLUMN organisation_member_customs.custom_profile_picture_url IS 'Custom profile picture URL';

-- Enable RLS
ALTER TABLE organisation_member_customs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same as organisation_members)
-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Organisation member customs: no anon access" ON organisation_member_customs;
DROP POLICY IF EXISTS "Organisation member customs: view for tenant users" ON organisation_member_customs;
DROP POLICY IF EXISTS "Organisation member customs: manage for admins" ON organisation_member_customs;

-- No anon access
CREATE POLICY "Organisation member customs: no anon access" 
  ON organisation_member_customs 
  FOR ALL TO anon 
  USING (false) 
  WITH CHECK (false);

-- Allow authenticated users to view customs for their tenant
CREATE POLICY "Organisation member customs: view for tenant users" 
  ON organisation_member_customs 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members om
      JOIN organisation_roles orl ON om.organisation_role_id = orl.id
      JOIN tenant_users tu ON orl.tenant_id = tu.tenant_id
      WHERE tu.user_id = auth.uid()
        AND tu.status = 'ACTIVE'
        AND om.id = organisation_member_customs.organisation_member_id
    )
  );

-- Allow users with canManageOrganisation to manage customs
CREATE POLICY "Organisation member customs: manage for admins" 
  ON organisation_member_customs 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.status = 'ACTIVE'
        AND EXISTS (
          SELECT 1 
          FROM tenant_user_roles tur
          JOIN roles r ON tur.role_id = r.id
          WHERE tur.tenant_user_id = tu.id
            AND tur.revoked_at IS NULL
            AND r.name = 'can_manage_organisation'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.status = 'ACTIVE'
        AND EXISTS (
          SELECT 1 
          FROM tenant_user_roles tur
          JOIN roles r ON tur.role_id = r.id
          WHERE tur.tenant_user_id = tu.id
            AND tur.revoked_at IS NULL
            AND r.name = 'can_manage_organisation'
        )
    )
  );
