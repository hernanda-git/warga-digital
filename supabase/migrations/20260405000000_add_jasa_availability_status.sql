-- =============================================================================
-- WARGA DIGITAL — Add Availability Status Column
-- Migration: 20260405000000_add_jasa_availability_status.sql
-- Created: 2026-04-05
-- 
-- This handles the case where table already exists but missing availability_status
-- =============================================================================

-- Add column if not exists
ALTER TABLE jasa_services ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'TIDAK_TERSEDIA';

-- Update existing rows to have proper values
UPDATE jasa_services SET availability_status = 'TERSEDIA' WHERE availability_status IS NULL OR availability_status = '';

-- Drop old constraint if exists
ALTER TABLE jasa_services DROP CONSTRAINT IF EXISTS check_availability_status;

-- Add new constraint
ALTER TABLE jasa_services ADD CONSTRAINT check_availability_status 
CHECK (availability_status IN ('TERSEDIA', 'TIDAK_TERSEDIA', 'FULL_BOOKED'));

-- Add index
DROP INDEX IF EXISTS idx_jasa_services_availability_status;
CREATE INDEX idx_jasa_services_availability_status ON jasa_services (status, availability_status);

-- Verify
SELECT name, availability_status, status FROM jasa_services LIMIT 5;