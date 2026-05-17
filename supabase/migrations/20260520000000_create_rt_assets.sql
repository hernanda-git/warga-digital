-- =============================================================================
-- WARGA DIGITAL — RT Assets (Aset RT)
-- Version: v0.3.0
-- Created: 2026-05-20
--
-- Creates tables for managing RT assets/inventory.
--
-- Philosophy:
--   • No complex maintenance/condition tracking — keep it simple.
--   • Status is a nullable boolean: used / unused / unassigned.
--   • Categories use dynamic theming (no hardcoded colour column).
--   • Asset image stored as URL (Supabase Storage or external).
--
-- Sections:
--   1.  RT Asset Categories Table
--   2.  RT Assets Table
--   3.  Indexes
--   4.  RLS Policies
--   5.  Seed Data
-- =============================================================================


-- =============================================================================
-- 1. RT ASSET CATEGORIES TABLE
-- =============================================================================

CREATE TABLE rt_asset_categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

COMMENT ON TABLE rt_asset_categories IS 'Kategori aset milik RT. Warna diatur oleh tema aplikasi (dynamic theming).';


-- =============================================================================
-- 2. RT ASSETS TABLE
-- =============================================================================

CREATE TABLE rt_assets (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id  UUID         NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  location      VARCHAR(200),
  category_id   UUID         REFERENCES rt_asset_categories(id) ON DELETE SET NULL,
  quantity      INT          NOT NULL DEFAULT 1,
  unit_label    VARCHAR(30)  NOT NULL DEFAULT 'Unit',
  image_url     TEXT,           -- URL gambar aset (Supabase Storage / R2)
  is_used       BOOLEAN,        -- true=digunakan, false=tidak digunakan, null=tidak terpakai
  tags          TEXT[],
  purchase_date DATE,
  notes         TEXT,
  created_by    UUID         REFERENCES users(id),
  updated_by    UUID         REFERENCES users(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ
);

COMMENT ON TABLE  rt_assets IS 'Master data aset/inventaris milik RT — barang fisik, kendaraan, peralatan, dsb.';
COMMENT ON COLUMN rt_assets.unit_label IS 'Satuan barang (contoh: Unit, Pcs, Set, Buah).';
COMMENT ON COLUMN rt_assets.is_used IS 'Status penggunaan: true=Digunakan, false=Tidak Digunakan, null=Tidak Terpakai.';
COMMENT ON COLUMN rt_assets.tags IS 'Array label/tag untuk pengelompokan tambahan (contoh: {"elektronik","ac","blok-a"}).';
COMMENT ON COLUMN rt_assets.deleted_at IS 'Soft-delete timestamp. Aset tidak dihapus permanen untuk jejak audit.';


-- =============================================================================
-- 3. INDEXES
-- =============================================================================

-- Primary lookups: tenant-scoped and community-scoped queries
CREATE INDEX idx_rt_assets_tenant_community
  ON rt_assets (tenant_id, community_id);

-- Filter by category (e.g. "tampilkan semua aset kategori Elektronik")
CREATE INDEX idx_rt_assets_category
  ON rt_assets (category_id);

-- Soft-delete filtering: exclude deleted rows in active queries
CREATE INDEX idx_rt_assets_deleted
  ON rt_assets (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Active-only queries (most common case)
CREATE INDEX idx_rt_assets_active
  ON rt_assets (tenant_id, community_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Category lookup within a tenant (admin UI sorting)
CREATE INDEX idx_rt_asset_categories_tenant_sort
  ON rt_asset_categories (tenant_id, sort_order);


-- =============================================================================
-- 4. RLS POLICIES
-- =============================================================================

-- Enable RLS on both tables
ALTER TABLE rt_asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE rt_assets ENABLE ROW LEVEL SECURITY;

-- ── Default deny for anonymous users ──────────────────────────────────────
CREATE POLICY "RT asset categories: no anon access"
  ON rt_asset_categories FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "RT assets: no anon access"
  ON rt_assets FOR ALL TO anon
  USING (false) WITH CHECK (false);

-- ── SELECT: any authenticated user in the same tenant can read ────────────
CREATE POLICY "Authenticated users can read rt_asset_categories"
  ON rt_asset_categories FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.status = 'ACTIVE'
    )
  );

CREATE POLICY "Authenticated users can read rt_assets"
  ON rt_assets FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.status = 'ACTIVE'
    )
  );

-- ── INSERT / UPDATE / DELETE: authenticated users in the same tenant ─────
-- These are intentionally permissive for now; admin-only refinement
-- (e.g. checking tenant_user_roles for RT_ADMIN / RT_BENDAHARA)
-- can be added later when the role system is more mature.
CREATE POLICY "Authenticated users can insert rt_asset_categories"
  ON rt_asset_categories FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.status = 'ACTIVE'
    )
  );

CREATE POLICY "Authenticated users can update rt_asset_categories"
  ON rt_asset_categories FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.status = 'ACTIVE'
    )
  );

CREATE POLICY "Authenticated users can delete rt_asset_categories"
  ON rt_asset_categories FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.status = 'ACTIVE'
    )
  );

CREATE POLICY "Authenticated users can insert rt_assets"
  ON rt_assets FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.status = 'ACTIVE'
    )
  );

CREATE POLICY "Authenticated users can update rt_assets"
  ON rt_assets FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.status = 'ACTIVE'
    )
  );

CREATE POLICY "Authenticated users can delete rt_assets"
  ON rt_assets FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid() AND tu.status = 'ACTIVE'
    )
  );


-- =============================================================================
-- 5. SEED DATA — Default asset categories
-- =============================================================================

INSERT INTO rt_asset_categories (tenant_id, name, sort_order)
SELECT
  'a0000000-0000-7000-8000-000000000001'::uuid AS tenant_id,
  v.name,
  v.sort_order
FROM (VALUES
  ('Elektronik',  1),
  ('Furnitur',    2),
  ('Kendaraan',   3),
  ('Mesin',       4),
  ('Peralatan',   5),
  ('Lainnya',     6)
) AS v(name, sort_order)
ON CONFLICT (tenant_id, name) DO NOTHING;


-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
