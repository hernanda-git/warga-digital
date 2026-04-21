-- Migration: Remove unused columns from jasa_services table
-- Date: 2026-04-21
-- Description: Clean up database by removing truly unused columns
-- IMPORTANT: Backup your data before running this migration!

-- ================================================================
-- PART 1: SAFETY CHECK - Review current schema
-- ================================================================

-- Check current columns in jasa_services table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'jasa_services'
ORDER BY ordinal_position;

-- ================================================================
-- PART 2: REMOVE DEPRECATED AND UNUSED COLUMNS
-- ================================================================

-- 1. Remove 'status' column (deprecated, replaced by is_available boolean)
--    The application now uses is_available instead of status TEXT
--    Data migration: If status='AVAILABLE', set is_available=TRUE
ALTER TABLE jasa_services 
DROP COLUMN IF EXISTS status CASCADE;

-- 2. Remove 'rating_avg' column (not implemented, always 0)
--    No rating system is currently implemented in the application
ALTER TABLE jasa_services 
DROP COLUMN IF EXISTS rating_avg CASCADE;

-- 3. Remove 'rating_count' column (not implemented, always 0)
--    No rating system is currently implemented in the application
ALTER TABLE jasa_services 
DROP COLUMN IF EXISTS rating_count CASCADE;

-- ================================================================
-- PART 3: ADD DOCUMENTATION COMMENTS
-- ================================================================

COMMENT ON COLUMN jasa_services.created_by IS 'User ID who created this service (audit trail)';
COMMENT ON COLUMN jasa_services.updated_by IS 'User ID who last updated this service (audit trail)';
COMMENT ON COLUMN jasa_services.is_available IS 'Boolean flag indicating service availability (replaced deprecated status field)';

-- ================================================================
-- PART 4: VERIFICATION - Confirm changes
-- ================================================================

-- Show updated schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    CASE 
        WHEN column_name IN ('created_by', 'updated_by') THEN '✅ Audit trail'
        WHEN column_name = 'is_available' THEN '✅ Availability flag'
        ELSE 'Standard field'
    END as notes
FROM information_schema.columns
WHERE table_name = 'jasa_services'
ORDER BY ordinal_position;

-- ================================================================
-- ROLLBACK SCRIPT (Uncomment to rollback if needed)
-- ================================================================

-- Run this in SQL Editor if you need to rollback:
/*
ALTER TABLE jasa_services ADD COLUMN status TEXT;
ALTER TABLE jasa_services ADD COLUMN rating_avg NUMERIC DEFAULT 0;
ALTER TABLE jasa_services ADD COLUMN rating_count INTEGER DEFAULT 0;

-- Restore comments
COMMENT ON COLUMN jasa_services.created_by IS NULL;
COMMENT ON COLUMN jasa_services.updated_by IS NULL;
COMMENT ON COLUMN jasa_services.is_available IS NULL;
*/

-- ================================================================
-- SUMMARY
-- ================================================================
-- Columns removed:
--   - status (replaced by is_available)
--   - rating_avg (not implemented)
--   - rating_count (not implemented)
--
-- Columns kept (still in use):
--   - summary (used in forms and search)
--   - currency_code (always 'IDR')
--   - is_featured (used for sorting)
--   - published_at (used for sorting)
--   - jam_operasional_mulai (used in forms)
--   - jam_operasional_selesai (used in forms)
--   - location_note (used in forms)
--   - wa_number (used for contact)
-- ================================================================
