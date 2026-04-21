# Database Migration Guide - Jasa Services Cleanup

## Overview

This migration removes unused and deprecated columns from the `jasa_services` table to improve database performance and maintain consistency with the application code.

**Migration Date**: 2026-04-21  
**Migration File**: `20260421155707_remove_unused_jasa_columns.sql`  
**Affected Table**: `jasa_services`

---

## Changes Summary

### Columns Removed (3)

| Column | Type | Reason | Replacement |
|--------|------|--------|-------------|
| `status` | TEXT | Deprecated field | `is_available` (BOOLEAN) |
| `rating_avg` | NUMERIC | Not implemented | N/A (no rating system) |
| `rating_count` | INTEGER | Not implemented | N/A (no rating system) |

### Columns Kept (Still in Use)

| Column | Usage |
|--------|-------|
| `summary` | Used in create/edit forms and search queries |
| `currency_code` | Always set to 'IDR' |
| `is_featured` | Used for sorting (ORDER BY is_featured DESC) |
| `published_at` | Used for sorting (ORDER BY published_at DESC) |
| `jam_operasional_mulai` | Used in create/edit forms |
| `jam_operasional_selesai` | Used in create/edit forms |
| `location_note` | Used in create/edit forms |
| `wa_number` | Used for WhatsApp contact |
| `created_by` | Audit trail (now properly set) |
| `updated_by` | Audit trail (now properly set) |

---

## Pre-Migration Checklist

- [ ] **Backup database** - Create a full backup before running migration
- [ ] **Test in staging** - Run migration on staging environment first
- [ ] **Verify application** - Ensure app works with new schema in staging
- [ ] **Schedule downtime** - Plan for brief maintenance window if needed
- [ ] **Notify team** - Inform developers about schema changes

---

## Migration Steps

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy contents from `20260421155707_remove_unused_jasa_columns.sql`
3. Paste into SQL Editor
4. Click **Run** to execute
5. Verify results in output panel

### Option 2: Using Supabase CLI

```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Push migration to production
npx supabase db push

# Or apply specific migration
npx supabase migration up
```

### Option 3: Direct Database Connection

```bash
# Connect to your Supabase database
psql postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Run migration file
\i path/to/20260421155707_remove_unused_jasa_columns.sql
```

---

## Post-Migration Verification

### 1. Check Schema

Run this query to verify columns were removed:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'jasa_services'
ORDER BY ordinal_position;
```

**Expected Result**: Should NOT include `status`, `rating_avg`, `rating_count`

### 2. Test Application

- [ ] Create new jasa service → Verify it saves correctly
- [ ] Edit existing jasa service → Verify updates work
- [ ] View jasa service list → Verify all services display
- [ ] Check audit trail → Verify `created_by` and `updated_by` are set

### 3. Check for Errors

Monitor Supabase logs for any errors:
- Go to **Supabase Dashboard** → **Logs**
- Filter for `jasa_services` table
- Look for any constraint violations or missing column errors

---

## Rollback Plan

If issues occur, run this rollback script:

```sql
-- Add back removed columns
ALTER TABLE jasa_services ADD COLUMN status TEXT;
ALTER TABLE jasa_services ADD COLUMN rating_avg NUMERIC DEFAULT 0;
ALTER TABLE jasa_services ADD COLUMN rating_count INTEGER DEFAULT 0;

-- Restore data if needed
UPDATE jasa_services 
SET status = CASE WHEN is_available THEN 'AVAILABLE' ELSE 'NOT_AVAILABLE' END
WHERE status IS NULL;

-- Remove comments
COMMENT ON COLUMN jasa_services.created_by IS NULL;
COMMENT ON COLUMN jasa_services.updated_by IS NULL;
COMMENT ON COLUMN jasa_services.is_available IS NULL;
```

---

## Data Migration Notes

### Status → Is Available Conversion

The previous migration (`20260405000000_add_jasa_availability_status.sql`) already handled the data conversion:

```sql
-- Previous migration already did this:
UPDATE jasa_services
SET is_available = (status = 'AVAILABLE')
WHERE is_available IS NULL;
```

No additional data migration is needed for this column.

### Rating Columns

Since rating system was never implemented, `rating_avg` and `rating_count` were always 0. No data loss occurs by removing these columns.

---

## Impact Assessment

### Application Impact: **LOW** ✅

- All application code has been updated to use new schema
- No runtime dependencies on removed columns
- API endpoints already use `is_available` instead of `status`

### Performance Impact: **POSITIVE** ✅

- Reduced table size (fewer columns)
- Faster queries (less data to fetch)
- Cleaner schema (easier maintenance)

### Breaking Changes: **NONE** ✅

- Backward compatible (removed columns were unused)
- No API contract changes
- No frontend changes required

---

## Related Documentation

- [Jasa Card Property Mapping](./JASA_CARD_PROPERTY_MAPPING.md)
- [Jasa Audit Trail Fix](./JASA_AUDIT_TRAIL_FIX.md)
- [API Reference](./API_REFERENCE.md)

---

## Support

If you encounter issues:

1. Check rollback plan above
2. Review Supabase logs for errors
3. Contact development team
4. Restore from backup if critical

---

**Status**: ✅ Ready for Production  
**Reviewed**: 2026-04-21  
**Approved**: Pending DBA review
