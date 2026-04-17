-- =============================================================================
-- WARGA DIGITAL — Simplify Jasa Status
-- Migration: 20261212000000_simplify_jasa_status.sql
-- Created: 2026-12-12
--
-- Consolidate availability logic by removing redundant availability_status field
-- and using only status field with AVAILABLE/NOT_AVAILABLE values.
--
-- Migration strategy:
-- 1. Migrate data based on availability_status and current status
-- 2. Drop availability_status column and related constraints/indexes
-- 3. Update status enum to only AVAILABLE/NOT_AVAILABLE
-- 4. Update indexes, RLS policies to use AVAILABLE
-- =============================================================================

-- Step 1: Drop old status check constraint to allow updates
ALTER TABLE jasa_services DROP CONSTRAINT IF EXISTS jasa_services_status_check;

-- Step 2: Migrate existing data to new status values
-- AVAILABLE if availability_status = 'TERSEDIA' AND status IN ('ACTIVE', 'DRAFT')
-- NOT_AVAILABLE for all others (including FULL_BOOKED, SOLD_OUT, ARCHIVED)
UPDATE jasa_services SET status = 'AVAILABLE'
WHERE availability_status = 'TERSEDIA' AND status IN ('ACTIVE', 'DRAFT');

UPDATE jasa_services SET status = 'NOT_AVAILABLE'
WHERE NOT (availability_status = 'TERSEDIA' AND status IN ('ACTIVE', 'DRAFT'));

-- Step 3: Drop availability_status column and related objects
ALTER TABLE jasa_services DROP CONSTRAINT IF EXISTS check_availability_status;
DROP INDEX IF EXISTS idx_jasa_services_availability_status;
ALTER TABLE jasa_services DROP COLUMN IF EXISTS availability_status;

-- Step 4: Add new status check constraint
ALTER TABLE jasa_services ADD CONSTRAINT jasa_services_status_check
CHECK (status IN ('AVAILABLE', 'NOT_AVAILABLE'));

-- Step 4: Update indexes to use new status
DROP INDEX IF EXISTS idx_jasa_services_category;
DROP INDEX IF EXISTS idx_jasa_services_owner;
DROP INDEX IF EXISTS idx_jasa_services_tenant;
DROP INDEX IF EXISTS idx_jasa_services_featured;
DROP INDEX IF EXISTS idx_jasa_services_published;

CREATE INDEX idx_jasa_services_category ON jasa_services (category_id, status);
CREATE INDEX idx_jasa_services_owner ON jasa_services (owner_user_id, status);
CREATE INDEX idx_jasa_services_tenant ON jasa_services (tenant_id, status);
CREATE INDEX idx_jasa_services_featured ON jasa_services (status, is_featured) WHERE is_featured = true;
CREATE INDEX idx_jasa_services_published ON jasa_services (status, published_at DESC);

-- Step 5: Update RLS policies to use AVAILABLE instead of ACTIVE
DROP POLICY IF EXISTS "Anyone can read active jasa services" ON jasa_services;
CREATE POLICY "Anyone can read available jasa services" ON jasa_services FOR SELECT USING (status = 'AVAILABLE');

DROP POLICY IF EXISTS "Anyone can read sub services of active jasa" ON jasa_sub_services;
CREATE POLICY "Anyone can read sub services of available jasa" ON jasa_sub_services FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jasa_services js WHERE js.id = jasa_service_id AND js.status = 'AVAILABLE'
  )
);

DROP POLICY IF EXISTS "Anyone can read media of active jasa services" ON jasa_service_media;
CREATE POLICY "Anyone can read media of available jasa services" ON jasa_service_media FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jasa_services js WHERE js.id = service_id AND js.status = 'AVAILABLE'
  )
);

-- Step 6: Verification
-- Count services by new status
SELECT status, COUNT(*) as count FROM jasa_services GROUP BY status ORDER BY status;

-- Show sample of updated services
SELECT id, name, status FROM jasa_services LIMIT 10;
