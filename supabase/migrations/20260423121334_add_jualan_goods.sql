-- Migration: Add Jualan Goods Marketplace
-- Date: 2026-04-23
-- Description: Creates fresh tables for community goods marketplace (jualan)
--              Independent from existing marketplace_items tables

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create jualan_categories table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jualan_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    icon text,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_category_slug UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_jualan_categories_tenant ON jualan_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jualan_categories_active ON jualan_categories(is_active);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Create jualan_goods table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jualan_goods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id uuid REFERENCES jualan_categories(id) ON DELETE SET NULL,
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    owner_display_name text NOT NULL,
    owner_blok_rumah text,
    name text NOT NULL,
    slug text NOT NULL,
    summary text,
    description text,
    base_price numeric NOT NULL DEFAULT 0,
    discount_percent numeric NOT NULL DEFAULT 0,
    discount_amount numeric GENERATED ALWAYS AS (base_price * discount_percent / 100) STORED,
    final_price numeric GENERATED ALWAYS AS (base_price - (base_price * discount_percent / 100)) STORED,
    currency_code text NOT NULL DEFAULT 'IDR',
    unit_label text NOT NULL DEFAULT 'pcs',
    stock_qty integer NOT NULL DEFAULT 0,
    sold_count integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    wa_number text,
    is_featured boolean NOT NULL DEFAULT false,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz,
    created_by uuid REFERENCES users(id),
    updated_by uuid REFERENCES users(id),
    
    CONSTRAINT unique_goods_slug UNIQUE (tenant_id, slug),
    CONSTRAINT check_discount_percent CHECK (discount_percent >= 0 AND discount_percent <= 100),
    CONSTRAINT check_prices CHECK (base_price >= 0 AND final_price >= 0),
    CONSTRAINT check_stock CHECK (stock_qty >= 0),
    CONSTRAINT check_sold_count CHECK (sold_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_jualan_goods_tenant ON jualan_goods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jualan_goods_category ON jualan_goods(category_id);
CREATE INDEX IF NOT EXISTS idx_jualan_goods_owner ON jualan_goods(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_jualan_goods_active ON jualan_goods(is_active);
CREATE INDEX IF NOT EXISTS idx_jualan_goods_featured ON jualan_goods(is_featured);
CREATE INDEX IF NOT EXISTS idx_jualan_goods_published ON jualan_goods(published_at);
CREATE INDEX IF NOT EXISTS idx_jualan_goods_price ON jualan_goods(final_price);
CREATE INDEX IF NOT EXISTS idx_jualan_goods_sold ON jualan_goods(sold_count);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Create jualan_item_media table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS jualan_item_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL REFERENCES jualan_goods(id) ON DELETE CASCADE,
    url text NOT NULL,
    alt_text text,
    sort_order integer NOT NULL DEFAULT 0,
    is_primary boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jualan_item_media_item ON jualan_item_media(item_id);
CREATE INDEX IF NOT EXISTS idx_jualan_item_media_primary ON jualan_item_media(is_primary);

-- Function to ensure only one primary image per item
CREATE OR REPLACE FUNCTION enforce_single_primary_media()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = true THEN
        UPDATE jualan_item_media
        SET is_primary = false
        WHERE item_id = NEW.item_id
        AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jualan_item_media_single_primary
    BEFORE INSERT OR UPDATE ON jualan_item_media
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_primary_media();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Create trigger to auto-update updated_at timestamp
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_jualan_goods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jualan_goods_updated_at
    BEFORE UPDATE ON jualan_goods
    FOR EACH ROW
    EXECUTE FUNCTION update_jualan_goods_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Row Level Security (RLS) Policies
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE jualan_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jualan_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE jualan_item_media ENABLE ROW LEVEL SECURITY;

-- jualan_categories policies
CREATE POLICY "Categories are viewable by authenticated users in same tenant"
    ON jualan_categories FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tenant_users tu
            WHERE tu.tenant_id = jualan_categories.tenant_id
            AND tu.user_id = auth.uid()
            AND tu.status = 'ACTIVE'
        )
    );

CREATE POLICY "Categories can be inserted by authenticated users in same tenant"
    ON jualan_categories FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tenant_users tu
            WHERE tu.tenant_id = jualan_categories.tenant_id
            AND tu.user_id = auth.uid()
            AND tu.status = 'ACTIVE'
        )
    );

CREATE POLICY "Categories can be updated by authenticated users in same tenant"
    ON jualan_categories FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tenant_users tu
            WHERE tu.tenant_id = jualan_categories.tenant_id
            AND tu.user_id = auth.uid()
            AND tu.status = 'ACTIVE'
        )
    );

-- jualan_goods policies
CREATE POLICY "Goods are viewable by authenticated users in same tenant"
    ON jualan_goods FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM tenant_users tu
            WHERE tu.tenant_id = jualan_goods.tenant_id
            AND tu.user_id = auth.uid()
            AND tu.status = 'ACTIVE'
        )
    );

CREATE POLICY "Goods can be inserted by authenticated users in same tenant"
    ON jualan_goods FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tenant_users tu
            WHERE tu.tenant_id = jualan_goods.tenant_id
            AND tu.user_id = auth.uid()
            AND tu.status = 'ACTIVE'
        )
    );

CREATE POLICY "Goods can be updated by owner"
    ON jualan_goods FOR UPDATE
    TO authenticated
    USING (owner_user_id = auth.uid());

CREATE POLICY "Goods can be deleted by owner"
    ON jualan_goods FOR DELETE
    TO authenticated
    USING (owner_user_id = auth.uid());

-- jualan_item_media policies
CREATE POLICY "Item media are viewable by authenticated users"
    ON jualan_item_media FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM jualan_goods g
            JOIN tenant_users tu ON tu.tenant_id = g.tenant_id
            WHERE g.id = jualan_item_media.item_id
            AND tu.user_id = auth.uid()
            AND tu.status = 'ACTIVE'
        )
    );

CREATE POLICY "Item media can be inserted by authenticated users"
    ON jualan_item_media FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM jualan_goods g
            JOIN tenant_users tu ON tu.tenant_id = g.tenant_id
            WHERE g.id = jualan_item_media.item_id
            AND tu.user_id = auth.uid()
            AND tu.status = 'ACTIVE'
        )
    );

CREATE POLICY "Item media can be updated by item owner"
    ON jualan_item_media FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM jualan_goods g
            WHERE g.id = jualan_item_media.item_id
            AND g.owner_user_id = auth.uid()
        )
    );

CREATE POLICY "Item media can be deleted by item owner"
    ON jualan_item_media FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM jualan_goods g
            WHERE g.id = jualan_item_media.item_id
            AND g.owner_user_id = auth.uid()
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Comments
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE jualan_categories IS 'Categories for jualan goods marketplace';
COMMENT ON TABLE jualan_goods IS 'Community goods for sale (jualan)';
COMMENT ON TABLE jualan_item_media IS 'Media images for jualan goods';

COMMENT ON COLUMN jualan_goods.is_active IS 'true = showing in listing, false = hidden';
COMMENT ON COLUMN jualan_goods.discount_percent IS 'Discount percentage (0-100)';
COMMENT ON COLUMN jualan_goods.discount_amount IS 'Generated: base_price * discount_percent / 100';
COMMENT ON COLUMN jualan_goods.final_price IS 'Generated: base_price - discount_amount';
COMMENT ON COLUMN jualan_goods.unit_label IS 'Unit of measurement (kg, pcs, pack, etc.)';
COMMENT ON COLUMN jualan_goods.sold_count IS 'Manually updated by seller';
COMMENT ON COLUMN jualan_goods.stock_qty IS 'Current available stock';
