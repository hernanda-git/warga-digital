-- =============================================================================
-- DEBUG: Check RLS Policies
-- Run this to see if there are any issues with the policies
-- =============================================================================

-- 1. Check current user
SELECT auth.uid() as current_user_id;

-- 2. Check if current user has can_manage_organisation role
SELECT 
  tu.id as tenant_user_id,
  tu.user_id,
  tu.status,
  r.name as role_name,
  tur.revoked_at
FROM tenant_users tu
JOIN tenant_user_roles tur ON tu.id = tur.tenant_user_id
JOIN roles r ON tur.role_id = r.id
WHERE tu.user_id = auth.uid()
  AND r.name = 'can_manage_organisation'
  AND tur.revoked_at IS NULL;

-- 3. Try a direct INSERT (will fail if RLS blocks it)
-- First, get a valid member ID
SELECT id as test_member_id FROM organisation_members LIMIT 1;

-- Then try to insert (replace MEMBER_ID with actual ID from above)
-- INSERT INTO organisation_member_customs (
--   organisation_member_id,
--   custom_full_name,
--   custom_block_name,
--   custom_whatsapp_number
-- ) VALUES (
--   'MEMBER_ID',  -- Replace with actual ID
--   'Test Debug',
--   'Test Block',
--   '628000000000'
-- );

-- 4. Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'organisation_member_customs';

-- 5. Check if table is empty
SELECT COUNT(*) as custom_records_count FROM organisation_member_customs;
