-- =============================================================================
-- WARGA DIGITAL — Fix Owner Data Integrity
-- Migration: 20260422042042_fix_owner_data_integrity.sql
-- Created: 2026-04-22
--
-- Purpose: Ensure all jasa service owners have proper user_houses records
-- to prevent "Unknown" owner display in the UI.
--
-- Issues Fixed:
-- 1. Users without primary house records were excluded from owner queries
-- 2. Empty full_name values caused "Unknown" display
-- 3. Missing documentation for owner_user_id vs created_by fields
--
-- Migration Strategy:
-- 1. Identify jasa service owners without primary houses
-- 2. Create user_houses records for affected users (if possible)
-- 3. Add documentation comments to clarify field purposes
-- 4. Verify data integrity
-- =============================================================================

-- ================================================================
-- STEP 1: DIAGNOSTIC - Check current state
-- ================================================================

-- Show owners without primary houses
SELECT 
  js.id as service_id,
  js.owner_user_id,
  js.owner_display_name as stored_name,
  u.full_name as user_full_name,
  uh.id as user_house_id,
  uh.is_primary,
  h.blok_rumah
FROM jasa_services js
INNER JOIN users u ON js.owner_user_id = u.id
LEFT JOIN user_houses uh ON u.id = uh.user_id AND uh.is_primary = true
LEFT JOIN houses h ON uh.house_id = h.id
WHERE uh.id IS NULL
ORDER BY js.created_at DESC;

-- Count services by owner house status
SELECT 
  CASE 
    WHEN uh.id IS NULL THEN 'No Primary House'
    ELSE 'Has Primary House'
  END as house_status,
  COUNT(*) as service_count
FROM jasa_services js
LEFT JOIN user_houses uh ON js.owner_user_id = uh.user_id AND uh.is_primary = true
GROUP BY house_status;

-- ================================================================
-- STEP 2: DATA FIX - Create missing user_houses records
-- ================================================================

-- Insert user_houses records for owners without primary houses
-- This uses their existing tenant membership and assigns a default house
INSERT INTO user_houses (
  id,
  tenant_id,
  user_id,
  house_id,
  relationship,
  is_primary,
  status,
  created_at,
  created_by
)
SELECT 
  gen_random_uuid() as id,
  tu.tenant_id,
  u.id as user_id,
  COALESCE(
    -- Try to get house from existing user_houses (any house they're associated with)
    (SELECT uh2.house_id FROM user_houses uh2 WHERE uh2.user_id = u.id LIMIT 1),
    -- Or get a house from their tenant (first available)
    (SELECT h2.id FROM houses h2 WHERE h2.tenant_id = tu.tenant_id LIMIT 1)
  ) as house_id,
  'OWNER' as relationship,
  true as is_primary,
  'ACTIVE' as status,
  NOW() as created_at,
  u.id as created_by
FROM users u
INNER JOIN tenant_users tu ON u.id = tu.user_id
WHERE u.id IN (SELECT DISTINCT owner_user_id FROM jasa_services)
AND NOT EXISTS (
  SELECT 1 FROM user_houses uh 
  WHERE uh.user_id = u.id AND uh.is_primary = true
)
AND EXISTS (
  -- Ensure we can find a house for this user
  SELECT 1 FROM user_houses uh2 WHERE uh2.user_id = u.id
  OR EXISTS (SELECT 1 FROM houses h2 WHERE h2.tenant_id = tu.tenant_id)
)
ON CONFLICT DO NOTHING;

-- ================================================================
-- STEP 3: DATA CLEANUP - Fix empty full_name values
-- ================================================================

-- Update users with empty full_name to use a default value
UPDATE users
SET full_name = 'User ' || SUBSTRING(id::text FROM 1 FOR 8)
WHERE id IN (SELECT DISTINCT owner_user_id FROM jasa_services)
AND (full_name IS NULL OR full_name = '' OR LENGTH(TRIM(full_name)) = 0);

-- ================================================================
-- STEP 4: DOCUMENTATION - Add field comments
-- ================================================================

COMMENT ON COLUMN jasa_services.owner_user_id IS 
  'Service owner (business context) - displayed on card, used for authorization. 
   References users.id. Should point to the actual service provider.';

COMMENT ON COLUMN jasa_services.created_by IS 
  'Record creator (audit trail) - tracks who created the database record. 
   References users.id. May differ from owner_user_id if admin created on behalf of user.
   Never changes after creation.';

COMMENT ON COLUMN jasa_services.owner_display_name IS 
  'Denormalized display name of the service owner at time of creation.
   Copied from users.full_name during service creation.
   Does not auto-update if user changes their name.';

-- ================================================================
-- STEP 5: VERIFICATION - Confirm fixes
-- ================================================================

-- Verify all owners now have primary houses
SELECT 
  'After Fix: Owners with primary house' as check_type,
  COUNT(DISTINCT js.owner_user_id) as owner_count,
  COUNT(js.id) as service_count
FROM jasa_services js
INNER JOIN user_houses uh ON js.owner_user_id = uh.user_id AND uh.is_primary = true;

-- Verify no empty full_name values
SELECT 
  'After Fix: Owners with valid names' as check_type,
  COUNT(*) as owner_count
FROM users
WHERE id IN (SELECT DISTINCT owner_user_id FROM jasa_services)
AND full_name IS NOT NULL 
AND full_name != '' 
AND LENGTH(TRIM(full_name)) > 0;

-- Show sample of fixed data
SELECT 
  js.id as service_id,
  js.name as service_name,
  js.owner_user_id,
  u.full_name as owner_name,
  h.blok_rumah as owner_block,
  js.created_by,
  creator.full_name as creator_name
FROM jasa_services js
INNER JOIN users u ON js.owner_user_id = u.id
LEFT JOIN user_houses uh ON u.id = uh.user_id AND uh.is_primary = true
LEFT JOIN houses h ON uh.house_id = h.id
LEFT JOIN users creator ON js.created_by = creator.id
ORDER BY js.created_at DESC
LIMIT 10;

-- ================================================================
-- STEP 6: SUMMARY
-- ================================================================

SELECT 
  'Migration Complete' as status,
  (SELECT COUNT(*) FROM jasa_services) as total_services,
  (SELECT COUNT(DISTINCT owner_user_id) FROM jasa_services) as unique_owners,
  (
    SELECT COUNT(DISTINCT js.owner_user_id)
    FROM jasa_services js
    INNER JOIN user_houses uh ON js.owner_user_id = uh.user_id AND uh.is_primary = true
  ) as owners_with_primary_house,
  (
    SELECT COUNT(*)
    FROM users
    WHERE id IN (SELECT DISTINCT owner_user_id FROM jasa_services)
    AND full_name IS NOT NULL AND full_name != '' AND LENGTH(TRIM(full_name)) > 0
  ) as owners_with_valid_names;

-- ================================================================
-- ROLLBACK (IF NEEDED)
-- ================================================================
-- To rollback, run:
/*
-- Remove user_houses records created by this migration
DELETE FROM user_houses
WHERE created_at > NOW() - INTERVAL '1 hour'
AND is_primary = true
AND user_id IN (SELECT DISTINCT owner_user_id FROM jasa_services);

-- Restore empty full_name values (if you have a backup)
-- This is difficult without a backup, so test before running migration

-- Remove comments
COMMENT ON COLUMN jasa_services.owner_user_id IS NULL;
COMMENT ON COLUMN jasa_services.created_by IS NULL;
COMMENT ON COLUMN jasa_services.owner_display_name IS NULL;
*/
