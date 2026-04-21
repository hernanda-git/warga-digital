-- ================================================================
-- QUICK DELETE - All Jasa Service Data
-- ================================================================
-- Run this to delete ALL jasa services and related data
-- WARNING: CANNOT BE UNDONE!
-- ================================================================

-- Delete all related data in correct order
BEGIN;

-- 1. Delete sub-services (child tables)
DELETE FROM jasa_sub_services 
WHERE jasa_service_id IN (SELECT id FROM jasa_services);

-- 2. Delete media records (child tables)
DELETE FROM jasa_service_media 
WHERE service_id IN (SELECT id FROM jasa_services);

-- 3. Delete jasa services (parent table)
DELETE FROM jasa_services;

COMMIT;

-- Verify deletion
SELECT 
    'jasa_services' as table_name, COUNT(*) as count FROM jasa_services
UNION ALL
SELECT 'jasa_service_media', COUNT(*) FROM jasa_service_media
UNION ALL
SELECT 'jasa_sub_services', COUNT(*) FROM jasa_sub_services;

-- Result should show 0 for all tables
