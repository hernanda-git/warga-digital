-- ============================================================
-- Add image_attachment, quantity_change, and asset_update log types
-- ============================================================

-- Safely extend the enum (skip if label already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'image_attachment'
      AND enumtypid = 'rt_asset_log_type'::regtype
  ) THEN
    ALTER TYPE rt_asset_log_type ADD VALUE 'image_attachment';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'quantity_change'
      AND enumtypid = 'rt_asset_log_type'::regtype
  ) THEN
    ALTER TYPE rt_asset_log_type ADD VALUE 'quantity_change';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'asset_update'
      AND enumtypid = 'rt_asset_log_type'::regtype
  ) THEN
    ALTER TYPE rt_asset_log_type ADD VALUE 'asset_update';
  END IF;
END
$$;

-- Add columns safely (IF NOT EXISTS)
ALTER TABLE rt_asset_logs ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE rt_asset_logs ADD COLUMN IF NOT EXISTS old_quantity INT;
ALTER TABLE rt_asset_logs ADD COLUMN IF NOT EXISTS new_quantity INT;

COMMENT ON COLUMN rt_asset_logs.image_url    IS 'URL gambar lampiran (untuk log tipe image_attachment)';
COMMENT ON COLUMN rt_asset_logs.old_quantity IS 'Jumlah sebelum perubahan (untuk log tipe quantity_change)';
COMMENT ON COLUMN rt_asset_logs.new_quantity IS 'Jumlah setelah perubahan (untuk log tipe quantity_change)';


-- ============================================================
-- Auto-log trigger for general asset edits
-- Fires only when non-log-handled columns change
-- ============================================================

CREATE OR REPLACE FUNCTION log_rt_asset_update()
RETURNS TRIGGER AS $$
DECLARE
  change_parts TEXT[];
  change_summary TEXT;
BEGIN
  -- Collect changed meaningful fields
  -- Exclude: is_used (handled by status_change log), quantity (handled by quantity_change log),
  --         updated_by, updated_at, deleted_at (internal timestamps)
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    change_parts := array_append(change_parts,
      'nama: "' || COALESCE(OLD.name, '') || '" → "' || COALESCE(NEW.name, '') || '"');
  END IF;

  IF OLD.description IS DISTINCT FROM NEW.description THEN
    change_parts := array_append(change_parts, 'deskripsi diubah');
  END IF;

  IF OLD.location IS DISTINCT FROM NEW.location THEN
    change_parts := array_append(change_parts,
      'lokasi: "' || COALESCE(OLD.location, '') || '" → "' || COALESCE(NEW.location, '') || '"');
  END IF;

  IF OLD.image_url IS DISTINCT FROM NEW.image_url THEN
    change_parts := array_append(change_parts, 'foto diubah');
  END IF;

  IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    change_parts := array_append(change_parts, 'kategori diubah');
  END IF;

  IF OLD.unit_label IS DISTINCT FROM NEW.unit_label THEN
    change_parts := array_append(change_parts,
      'satuan: "' || COALESCE(OLD.unit_label, '') || '" → "' || COALESCE(NEW.unit_label, '') || '"');
  END IF;

  IF OLD.tags IS DISTINCT FROM NEW.tags THEN
    change_parts := array_append(change_parts, 'tag diubah');
  END IF;

  IF OLD.purchase_date IS DISTINCT FROM NEW.purchase_date THEN
    change_parts := array_append(change_parts, 'tgl pembelian diubah');
  END IF;

  IF OLD.notes IS DISTINCT FROM NEW.notes THEN
    change_parts := array_append(change_parts, 'catatan diubah');
  END IF;

  -- Only insert when something actually changed
  IF array_length(change_parts, 1) IS NOT NULL THEN
    change_summary := array_to_string(change_parts, '; ');

    INSERT INTO rt_asset_logs (asset_id, tenant_id, log_type, notes, logged_at)
    VALUES (NEW.id, NEW.tenant_id, 'asset_update', change_summary, NOW());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rt_assets_after_update ON rt_assets;

CREATE TRIGGER trg_rt_assets_after_update
  AFTER UPDATE ON rt_assets
  FOR EACH ROW
  EXECUTE FUNCTION log_rt_asset_update();
