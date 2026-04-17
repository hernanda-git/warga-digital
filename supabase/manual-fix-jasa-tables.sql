-- =============================================================================
-- WARGA DIGITAL — Manual Fix for Jasa Tables
-- File: manual-fix-jasa-tables.sql
--
-- This script manually fixes the jasa tables by dropping and recreating them
-- with the complete schema required by the application.
--
-- Run this in your Supabase SQL Editor to immediately fix the schema issues.
-- WARNING: This will drop existing jasa data - backup if needed!
-- =============================================================================

-- Step 1: Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS jasa_service_media CASCADE;
DROP TABLE IF EXISTS jasa_sub_services CASCADE;
DROP TABLE IF EXISTS jasa_services CASCADE;

-- Step 2: Create jasa_services table with complete schema
CREATE TABLE jasa_services (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id           UUID NOT NULL REFERENCES marketplace_categories(id) ON DELETE RESTRICT,
  owner_user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_display_name    VARCHAR(150) NOT NULL,
  name                  VARCHAR(200) NOT NULL,
  slug                  VARCHAR(220) NOT NULL UNIQUE,
  description           TEXT,
  summary               VARCHAR(300),
  estimated_price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency_code         VARCHAR(3) NOT NULL DEFAULT 'IDR',
  hari_operasional      JSONB NOT NULL DEFAULT '{}',
  jam_operasional_mulai VARCHAR(5) NOT NULL,
  jam_operasional_selesai VARCHAR(5) NOT NULL,
  is_available          BOOLEAN NOT NULL DEFAULT true,
  status                VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'ARCHIVED')),
  wa_number             VARCHAR(20),
  location_note         TEXT,
  rating_avg            NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
  rating_count          INT NOT NULL DEFAULT 0,
  is_featured           BOOLEAN NOT NULL DEFAULT false,
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES users(id),
  updated_at            TIMESTAMPTZ,
  updated_by            UUID REFERENCES users(id)
);

-- Step 3: Create jasa_sub_services table
CREATE TABLE jasa_sub_services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jasa_service_id   UUID NOT NULL REFERENCES jasa_services(id) ON DELETE CASCADE,
  name              VARCHAR(200) NOT NULL,
  description       TEXT,
  price             NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

-- Step 4: Create jasa_service_media table
CREATE TABLE jasa_service_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES jasa_services(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt_text    VARCHAR(200),
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 5: Create unique constraint for primary images
CREATE UNIQUE INDEX jasa_service_media_primary
  ON jasa_service_media (service_id) WHERE is_primary = true;

-- Step 6: Create indexes for performance
CREATE INDEX idx_jasa_services_category ON jasa_services (category_id, status);
CREATE INDEX idx_jasa_services_owner ON jasa_services (owner_user_id, status);
CREATE INDEX idx_jasa_services_tenant ON jasa_services (tenant_id, status);
CREATE INDEX idx_jasa_services_slug ON jasa_services (slug);
CREATE INDEX idx_jasa_services_featured ON jasa_services (status, is_featured) WHERE is_featured = true;
CREATE INDEX idx_jasa_services_published ON jasa_services (status, published_at DESC);
CREATE INDEX idx_jasa_sub_services_parent ON jasa_sub_services (jasa_service_id);
CREATE INDEX idx_jasa_service_media_service ON jasa_service_media (service_id, sort_order);

-- Step 7: Enable Row Level Security
ALTER TABLE jasa_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE jasa_sub_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE jasa_service_media ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS Policies for jasa_services
CREATE POLICY "Anyone can read active jasa services" ON jasa_services FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Owner can insert jasa services" ON jasa_services FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owner can update own jasa services" ON jasa_services FOR UPDATE USING (owner_user_id = auth.uid());
CREATE POLICY "Owner can delete own jasa services" ON jasa_services FOR DELETE USING (owner_user_id = auth.uid());

-- Step 9: Create RLS Policies for jasa_sub_services
CREATE POLICY "Anyone can read sub services of active jasa" ON jasa_sub_services FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jasa_services js WHERE js.id = jasa_service_id AND js.status = 'ACTIVE'
  )
);
CREATE POLICY "Owner can insert sub services" ON jasa_sub_services FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM jasa_services js WHERE js.id = jasa_service_id AND js.owner_user_id = auth.uid()
  )
);
CREATE POLICY "Owner can update own sub services" ON jasa_sub_services FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM jasa_services js WHERE js.id = jasa_service_id AND js.owner_user_id = auth.uid()
  )
);
CREATE POLICY "Owner can delete own sub services" ON jasa_sub_services FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM jasa_services js WHERE js.id = jasa_service_id AND js.owner_user_id = auth.uid()
  )
);

-- Step 10: Create RLS Policies for jasa_service_media
CREATE POLICY "Anyone can read media of active jasa services" ON jasa_service_media FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM jasa_services js WHERE js.id = service_id AND js.status = 'ACTIVE'
  )
);
CREATE POLICY "Owner can insert media for own services" ON jasa_service_media FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM jasa_services js WHERE js.id = service_id AND js.owner_user_id = auth.uid()
  )
);
CREATE POLICY "Owner can update media for own services" ON jasa_service_media FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM jasa_services js WHERE js.id = service_id AND js.owner_user_id = auth.uid()
  )
);
CREATE POLICY "Owner can delete media for own services" ON jasa_service_media FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM jasa_services js WHERE js.id = service_id AND js.owner_user_id = auth.uid()
  )
);

-- Step 11: Verification query
-- Run this after execution to verify tables were created:
-- SELECT
--   schemaname, tablename, tableowner
-- FROM pg_tables
-- WHERE tablename LIKE 'jasa_%'
-- ORDER BY tablename;

-- =============================================================================
-- FIX COMPLETE
-- =============================================================================

-- The jasa tables are now properly created with all required columns.
-- You can now create jasa services through the application.
-- Make sure to run the category seeding script as well if categories are missing.
