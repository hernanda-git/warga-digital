# 🗑️ Delete All Jasa Data - Quick Reference

## ⚡ Quick Delete (Copy-Paste This)

```sql
BEGIN;
DELETE FROM jasa_sub_services WHERE jasa_service_id IN (SELECT id FROM jasa_services);
DELETE FROM jasa_service_media WHERE service_id IN (SELECT id FROM jasa_services);
DELETE FROM jasa_services;
COMMIT;
```

## 📋 Steps

1. **Run SQL** → Supabase Dashboard → SQL Editor → Paste query above → Run
2. **Delete Files** → Storage → jasa-images → Select All → Delete
3. **Verify** → Run: `SELECT COUNT(*) FROM jasa_services;` → Should return 0

## 📁 Files Created

| File | Purpose |
|------|---------|
| `delete_all_jasa_data_quick.sql` | Quick copy-paste SQL |
| `delete_all_jasa_data.sql` | Full version with backup/rollback |
| `delete-jasa-images-helper.js` | Script to delete storage files |
| `DELETE_JASA_DATA_GUIDE.md` | Complete guide |

## ⚠️ Important

- **CANNOT BE UNDONE** - Make backup first if needed
- **Storage files NOT auto-deleted** - Must delete manually
- **Test in staging first** - Recommended

## 🔙 Rollback (If Backup Created)

```sql
INSERT INTO jasa_services SELECT * FROM jasa_services_backup_20260421;
INSERT INTO jasa_service_media SELECT * FROM jasa_service_media_backup_20260421;
INSERT INTO jasa_sub_services SELECT * FROM jasa_sub_services_backup_20260421;
```

## 📖 Full Documentation

See `DELETE_JASA_DATA_GUIDE.md` for detailed instructions.

---

**Status**: ✅ Ready to use  
**Pushed**: dev branch  
**Risk**: ⚠️ HIGH - Permanent deletion
