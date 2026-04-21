-- ================================================================
-- DELETE ALL JASA SERVICE DATA
-- ================================================================
-- Purpose: Remove all jasa services and related data (images, sub-services)
-- Date: 2026-04-21
-- WARNING: This is a DESTRUCTIVE operation - cannot be undone!
-- ================================================================

-- ================================================================
-- STEP 1: PRE-DELETION BACKUP (RECOMMENDED)
-- ================================================================
-- Uncomment to create backup tables before deletion

-- CREATE TABLE jasa_services_backup AS 
-- SELECT * FROM jasa_services;

-- CREATE TABLE jasa_service_media_backup AS 
-- SELECT * FROM jasa_service_media;

-- CREATE TABLE jasa_sub_services_backup AS 
-- SELECT * FROM jasa_sub_services;

-- ================================================================
-- STEP 2: REVIEW DATA TO BE DELETED
-- ================================================================

-- Count records that will be deleted
SELECT 
    'jasa_services' as table_name, 
    COUNT(*) as record_count 
FROM jasa_services
UNION ALL
SELECT 
    'jasa_service_media' as table_name, 
    COUNT(*) as record_count 
FROM jasa_service_media
UNION ALL
SELECT 
    'jasa_sub_services' as table_name, 
    COUNT(*) as record_count 
FROM jasa_sub_services;

-- ================================================================
-- STEP 3: DELETE RELATED DATA (IN CORRECT ORDER)
-- ================================================================
-- Note: If CASCADE is enabled on foreign keys, only the first 
-- DELETE statement is needed. Otherwise, run all three.

-- Option A: If CASCADE is NOT enabled - delete in this order:

-- 3.1 Delete sub-services first (child records)
DELETE FROM jasa_sub_services 
WHERE jasa_service_id IN (SELECT id FROM jasa_services);

-- 3.2 Delete media records (child records)
DELETE FROM jasa_service_media 
WHERE service_id IN (SELECT id FROM jasa_services);

-- 3.3 Delete jasa services (parent records)
DELETE FROM jasa_services;

-- Option B: If CASCADE IS enabled - just run this:
-- DELETE FROM jasa_services CASCADE;

-- ================================================================
-- STEP 4: CLEANUP STORAGE BUCKET (MANUAL STEP REQUIRED)
-- ================================================================
-- Note: Database deletion does NOT remove files from Supabase Storage
-- You need to manually delete files from the 'jasa-images' bucket

-- Query to list all image paths that should be deleted from storage:
SELECT url 
FROM jasa_service_media 
WHERE service_id IN (SELECT id FROM jasa_services);

-- To delete from storage bucket, use Supabase Dashboard:
-- 1. Go to Storage → jasa-images bucket
-- 2. Select all folders/files
-- 3. Click Delete

-- Or use Supabase Storage API (advanced):
-- See: https://supabase.com/docs/reference/javascript/storage-remove

-- ================================================================
-- STEP 5: VERIFY DELETION
-- ================================================================

-- Verify all tables are empty
SELECT 
    'jasa_services' as table_name, 
    COUNT(*) as record_count 
FROM jasa_services
UNION ALL
SELECT 
    'jasa_service_media' as table_name, 
    COUNT(*) as record_count 
FROM jasa_service_media
UNION ALL
SELECT 
    'jasa_sub_services' as table_name, 
    COUNT(*) as record_count 
FROM jasa_sub_services;

-- Expected result: All counts should be 0

-- ================================================================
-- STEP 6: RESET AUTO-INCREMENT SEQUENCES (OPTIONAL)
-- ================================================================
-- If you want to reset ID counters to start from 1 again

-- For UUID columns, this is not needed
-- For SERIAL/IDENTITY columns, uncomment:

-- ALTER SEQUENCE jasa_services_id_seq RESTART WITH 1;
-- ALTER SEQUENCE jasa_service_media_id_seq RESTART WITH 1;
-- ALTER SEQUENCE jasa_sub_services_id_seq RESTART WITH 1;

-- ================================================================
-- ROLLBACK (IF BACKUP WAS CREATED)
-- ================================================================
-- Uncomment to restore from backup tables

-- INSERT INTO jasa_services SELECT * FROM jasa_services_backup;
-- INSERT INTO jasa_service_media SELECT * FROM jasa_service_media_backup;
-- INSERT INTO jasa_sub_services SELECT * FROM jasa_sub_services_backup;

-- DROP TABLE jasa_services_backup;
-- DROP TABLE jasa_service_media_backup;
-- DROP TABLE jasa_sub_services_backup;

-- ================================================================
-- COMPLETE DELETION SCRIPT (COPY-PASTE VERSION)
-- ================================================================
-- Run this block to delete everything in one go:

/*
BEGIN;

-- Delete child records first
DELETE FROM jasa_sub_services 
WHERE jasa_service_id IN (SELECT id FROM jasa_services);

DELETE FROM jasa_service_media 
WHERE service_id IN (SELECT id FROM jasa_services);

-- Delete parent records
DELETE FROM jasa_services;

COMMIT;
*/

-- ================================================================
-- WARNING: This operation is PERMANENT and cannot be undone!
-- Make sure you have a backup before proceeding.
-- ================================================================
