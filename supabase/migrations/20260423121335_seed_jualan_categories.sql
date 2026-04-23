-- Seed default jualan categories
-- Date: 2026-04-23
-- Description: Seeds default categories for jualan goods marketplace
--              Uses placeholder tenant_id - should be updated per deployment

-- Get the first active tenant (typically the main community)
DO $$
DECLARE
    v_tenant_id uuid;
BEGIN
    SELECT id INTO v_tenant_id
    FROM tenants
    WHERE status = 'ACTIVE'
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE NOTICE 'No active tenant found. Skipping category seeding.';
        RETURN;
    END IF;
    
    -- Insert default categories
    INSERT INTO jualan_categories (id, tenant_id, name, slug, icon, sort_order, is_active)
    VALUES
        (gen_random_uuid(), v_tenant_id, 'Sembako', 'sembako', '🛍️', 1, true),
        (gen_random_uuid(), v_tenant_id, 'Makanan & Minuman', 'makanan-minuman', '🍱', 2, true),
        (gen_random_uuid(), v_tenant_id, 'Kerajinan Tangan', 'kerajinan-tangan', '🎨', 3, true),
        (gen_random_uuid(), v_tenant_id, 'Sayur & Buah', 'sayur-buah', '🥬', 4, true),
        (gen_random_uuid(), v_tenant_id, 'Kebutuhan Rumah Tangga', 'kebutuhan-rumah-tangga', '🏠', 5, true),
        (gen_random_uuid(), v_tenant_id, 'Fashion & Pakaian', 'fashion-pakaian', '👕', 6, true),
        (gen_random_uuid(), v_tenant_id, 'Elektronik & Aksesoris', 'elektronik-aksesoris', '📱', 7, true),
        (gen_random_uuid(), v_tenant_id, 'Lainnya', 'lainnya', '📦', 8, true)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Successfully seeded jualan categories for tenant: %', v_tenant_id;
END $$;
