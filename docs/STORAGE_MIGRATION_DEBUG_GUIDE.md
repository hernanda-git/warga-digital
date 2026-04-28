# Storage Migration Debug Guide

## Overview
Comprehensive debug logging has been added to the storage migration system to help diagnose issues.

## Log File Location
```
E:\WF\P\WargaDigital\warga-digital\logs\migrate-storage-debug.log
```

## What Was Fixed

### 1. Debug Logger Created (`src/lib/debug-logger.ts`)
- Writes timestamped logs to `logs/migrate-storage-debug.log`
- Functions: `debug()`, `info()`, `warn()`, `logError()`
- Automatically clears log on each new scan operation

### 2. Migration Route Enhanced (`src/app/api/admin/migrate-storage/route.ts`)

**GET Endpoint (Scan):**
- Logs environment variable status
- Logs each bucket scan query and results
- **Avatars**: Now checks R2 file existence (Option B) instead of counting all users
- Logs detailed counts for each bucket

**POST Endpoint (Migration):**
- Logs request ID for tracing
- Logs admin user verification
- Logs each file processing step:
  - Download from Supabase
  - Upload to R2
  - Verification check
  - Database update
- Logs final summary (completed/skipped/failed)

**Key Functions:**
- `checkFileExistsInR2()` - Uses HEAD request to verify file exists in R2
- Each migration function now:
  - Skips files already in R2
  - Verifies uploads succeeded
  - Logs detailed error messages

### 3. Client-Side Logging (`src/app/admin/migrate-storage/page.tsx`)
- Console logs for all user actions
- Logs fetch requests and responses
- Logs migration results and errors
- Open browser DevTools Console to see these logs

### 4. R2 Client Export (`src/lib/r2.ts`)
- Exported `getR2Client()` function for use in migration route

## How to Debug

### Step 1: Open Two Views
1. **Browser DevTools Console** - For client-side logs
2. **Log File** - `logs/migrate-storage-debug.log` (tail or refresh after each operation)

### Step 2: Run Scan
1. Navigate to `/admin/migrate-storage`
2. Click "Refresh Status"
3. Check log file for:
   ```
   [timestamp] [INFO] === SCAN START (Request ID: xxx) ===
   [timestamp] [DEBUG] Environment check
   [timestamp] [INFO] Scanning avatars...
   [timestamp] [DEBUG] Found X users with avatars
   [timestamp] [DEBUG] Avatar needs migration: user xxx, path xxx
   [timestamp] [INFO] Avatars scan complete: X/Y need migration
   ```

### Step 3: Run Migration
1. Click "Migrasi" button for a bucket
2. Watch browser console for:
   ```
   [MigrateStorage] Starting migration for bucket: avatars
   [MigrateStorage] Sending POST request...
   [MigrateStorage] Migration response status: 200
   [MigrateStorage] Migration result: {...}
   ```
3. Check log file for detailed server-side operations

### Step 4: Analyze Results
**Success Pattern:**
```
[INFO] Starting avatars migration...
[DEBUG] Processing avatar: user xxx
[INFO] Uploading avatar to R2: user xxx
[DEBUG] Avatar successfully uploaded and verified in R2: user xxx
[INFO] Avatars migration complete: X/Y completed
```

**Skip Pattern (already migrated):**
```
[DEBUG] Processing avatar: user xxx
[DEBUG] Avatar already exists in R2, skipping: user xxx
```

**Error Pattern:**
```
[DEBUG] Processing avatar: user xxx
[WARN] Avatar file not found in Supabase: user xxx
[INFO] Avatars migration complete: X/Y completed
```

## Common Issues & Solutions

### Issue 1: Counts Don't Change After Migration
**Cause**: Files already exist in R2 (skipped)
**Check**: Look for "Already in R2" in logs
**Solution**: This is correct behavior - files are already migrated

### Issue 2: All Files Skipped - "File not found in Supabase"
**Cause**: Supabase Storage bucket is empty or inaccessible
**Check**: Look for "File not found in Supabase" warnings
**Solution**: 
- Verify Supabase Storage bucket has files
- Check `SUPABASE_URL` environment variable
- Check bucket permissions

### Issue 3: Upload Verification Failed
**Cause**: R2 upload failed silently
**Check**: Look for "Upload verification failed" errors
**Solution**:
- Verify R2 environment variables are correct
- Check R2 bucket exists and is accessible
- Check R2 permissions/CORS settings

### Issue 4: Database Update Failed
**Cause**: Supabase DB permission issue
**Check**: Look for "DB update failed" errors
**Solution**:
- Check Supabase RLS policies
- Verify admin user has write permissions
- Check Supabase connection string

## Environment Variables Required
```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# R2
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=warga-digital
R2_PUBLIC_BASE_URL=https://oo.warga-digital.com
```

## Migration Order Recommendation
1. **Avatars** - Run first (foundational)
2. **Jasa Images** - Run second
3. **Kas RT Attachments** - Run third
4. **Related Data** - Run last (updates URL references)

## Verification Steps
After migration:
1. Run scan again - counts should show 0 "Perlu migrasi"
2. Check log file - all items should show "ok" or "skipped"
3. Test file access:
   - Avatars: Check profile pages
   - Jasa: Check jasa listing pages
   - Kas RT: Check transaction attachments
4. Verify R2 bucket contains expected files

## Log File Management
- Log is automatically cleared on each scan
- Manual clear: Delete `logs/migrate-storage-debug.log`
- Archive: Copy log file before running new migration
