# Complete Guide: Delete All Jasa Service Data

## ⚠️ WARNING - READ FIRST

This operation will **PERMANENTLY DELETE** all jasa service data including:
- All jasa service listings
- All uploaded images
- All sub-services
- All related metadata

**This CANNOT be undone!** Make sure you have a backup if needed.

---

## Quick Start (3 Steps)

### Step 1: Backup (Optional but Recommended)

```sql
-- Create backup tables
CREATE TABLE jasa_services_backup_20260421 AS SELECT * FROM jasa_services;
CREATE TABLE jasa_service_media_backup_20260421 AS SELECT * FROM jasa_service_media;
CREATE TABLE jasa_sub_services_backup_20260421 AS SELECT * FROM jasa_sub_services;
```

### Step 2: Delete Database Records

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
BEGIN;

DELETE FROM jasa_sub_services 
WHERE jasa_service_id IN (SELECT id FROM jasa_services);

DELETE FROM jasa_service_media 
WHERE service_id IN (SELECT id FROM jasa_services);

DELETE FROM jasa_services;

COMMIT;
```

### Step 3: Delete Storage Files (IMPORTANT!)

Go to **Supabase Dashboard → Storage → jasa-images** and:
1. Select all files (Ctrl+A or Cmd+A)
2. Click Delete
3. Confirm

**Note**: Database deletion does NOT remove storage files automatically!

---

## Detailed Instructions

### What Gets Deleted

| Table/Data | Records | Notes |
|------------|---------|-------|
| `jasa_services` | All | Main service listings |
| `jasa_service_media` | All | Image metadata from database |
| `jasa_sub_services` | All | Additional service offerings |
| Storage Bucket | All files | **Manual deletion required** |

### Method 1: Supabase Dashboard (Recommended)

1. **Open SQL Editor**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Navigate to **SQL Editor**

2. **Review Current Data** (Optional)
   ```sql
   SELECT COUNT(*) FROM jasa_services;
   SELECT COUNT(*) FROM jasa_service_media;
   SELECT COUNT(*) FROM jasa_sub_services;
   ```

3. **Run Deletion Query**
   - Copy the SQL from Step 2 above
   - Paste into SQL Editor
   - Click **Run**

4. **Verify Deletion**
   ```sql
   SELECT 
     'jasa_services' as table_name, COUNT(*) as count FROM jasa_services
   UNION ALL
   SELECT 'jasa_service_media', COUNT(*) FROM jasa_service_media
   UNION ALL
   SELECT 'jasa_sub_services', COUNT(*) FROM jasa_sub_services;
   ```
   - All counts should be **0**

5. **Delete Storage Files**
   - Go to **Storage** → **jasa-images** bucket
   - Select all files
   - Click **Delete**
   - Confirm deletion

### Method 2: Using Migration File

1. Open file: `supabase/migrations/delete_all_jasa_data_quick.sql`
2. Copy contents
3. Run in Supabase SQL Editor
4. Follow storage deletion steps above

### Method 3: Programmatic (Advanced)

Use the Supabase JavaScript client:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Delete database records
await supabase.from('jasa_sub_services').delete().neq('id', 0);
await supabase.from('jasa_service_media').delete().neq('id', 0);
await supabase.from('jasa_services').delete().neq('id', 0);

// Delete storage files
const { data } = await supabase.storage.from('jasa-images').list();
const paths = data.map(file => file.name);
await supabase.storage.from('jasa-images').remove(paths);
```

---

## Rollback (If You Created Backup)

```sql
-- Restore from backup tables
INSERT INTO jasa_services SELECT * FROM jasa_services_backup_20260421;
INSERT INTO jasa_service_media SELECT * FROM jasa_service_media_backup_20260421;
INSERT INTO jasa_sub_services SELECT * FROM jasa_sub_services_backup_20260421;

-- Drop backup tables
DROP TABLE jasa_services_backup_20260421;
DROP TABLE jasa_service_media_backup_20260421;
DROP TABLE jasa_sub_services_backup_20260421;
```

**Note**: Storage files cannot be restored from SQL backup. You need separate file backups.

---

## Files Provided

1. **`delete_all_jasa_data.sql`** - Comprehensive script with backup and rollback
2. **`delete_all_jasa_data_quick.sql`** - Quick delete version (copy-paste ready)
3. **`delete-jasa-images-helper.js`** - Helper script for storage deletion
4. **`DELETE_JASA_DATA_GUIDE.md`** - This guide

---

## Important Notes

### Storage Files

- Database deletion **does NOT** remove files from Supabase Storage
- Files continue to exist in `jasa-images` bucket until manually deleted
- Storage files incur hosting costs even if orphaned
- **Always delete storage files after database cleanup**

### Foreign Keys

If foreign key constraints have `ON DELETE CASCADE`:
- Deleting from `jasa_services` will automatically delete child records
- If not, you must delete child tables first (order matters!)

### Performance

- Deletion is instant for small datasets (< 1000 records)
- For large datasets, consider batch deletion:
  ```sql
  DELETE FROM jasa_services WHERE created_at < '2026-01-01';
  ```

### Audit Trail

After deletion, there's no record of:
- Which services existed
- Who created them
- When they were deleted

Consider exporting data first if you need audit history:
```sql
COPY jasa_services TO '/tmp/jasa_services_export.csv' WITH CSV HEADER;
```

---

## Troubleshooting

### Error: "foreign key constraint fails"

**Solution**: Delete child tables first
```sql
DELETE FROM jasa_sub_services;
DELETE FROM jasa_service_media;
DELETE FROM jasa_services;
```

### Error: "permission denied"

**Solution**: Use service role key or ensure you have admin privileges

### Storage files won't delete

**Solution**: 
1. Check bucket permissions
2. Use service role key for API deletion
3. Delete in smaller batches via Dashboard

---

## Checklist

Before running deletion:

- [ ] I understand this is permanent
- [ ] I have created a backup (if needed)
- [ ] I have exported data for audit (if needed)
- [ ] I know how to delete storage files
- [ ] I have tested in staging environment (recommended)

After running deletion:

- [ ] Verified all tables show 0 records
- [ ] Deleted files from storage bucket
- [ ] Tested application (no errors with empty tables)
- [ ] Cleaned up backup tables (if created)

---

## Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **SQL Editor**: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
- **Storage**: https://supabase.com/dashboard/project/YOUR_PROJECT/storage

---

**Last Updated**: 2026-04-21  
**Status**: Ready to use  
**Risk Level**: ⚠️ HIGH (destructive operation)
