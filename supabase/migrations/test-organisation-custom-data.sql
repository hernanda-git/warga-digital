-- =============================================================================
-- WARGA DIGITAL — Test Organisation Custom Data
-- Quick verification script
-- =============================================================================

-- 1. Check if table exists
SELECT 
  'organisation_member_customs table exists' as test,
  COUNT(*) as result
FROM information_schema.tables 
WHERE table_name = 'organisation_member_customs';

-- 2. Check if avatars bucket exists
SELECT 
  'avatars bucket exists' as test,
  COUNT(*) as result
FROM storage.buckets 
WHERE id = 'avatars';

-- 3. Check RLS policies on organisation_member_customs
SELECT 
  'organisation_member_customs policies' as test,
  policyname
FROM pg_policies 
WHERE tablename = 'organisation_member_customs';

-- 4. Check RLS policies on storage.objects for avatars
SELECT 
  'avatars storage policies' as test,
  policyname
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%avatars%';

-- 5. Test insert (should work for admins)
-- Uncomment to test:
-- INSERT INTO organisation_member_customs (
--   organisation_member_id,
--   custom_full_name,
--   custom_block_name,
--   custom_whatsapp_number,
--   custom_profile_picture_url
-- )
-- SELECT 
--   om.id,
--   'Test Custom Name',
--   'Test Block',
--   '6281234567890',
--   NULL
-- FROM organisation_members om
-- LIMIT 1;

-- 6. Verify custom data is being returned by API
-- Run this after creating a custom member:
SELECT 
  om.id as member_id,
  om.full_name as base_name,
  omc.custom_full_name as custom_name,
  om.user_id,
  CASE 
    WHEN omc.custom_full_name IS NOT NULL THEN 'Has Custom Data'
    ELSE 'No Custom Data'
  END as status
FROM organisation_members om
LEFT JOIN organisation_member_customs omc ON om.id = omc.organisation_member_id
ORDER BY om.created_at DESC
LIMIT 10;
