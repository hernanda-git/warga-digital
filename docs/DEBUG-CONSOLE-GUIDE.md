# Debug Console Log Guide

## How to Debug

### 1. Open Browser DevTools
- Press **F12** or **Ctrl+Shift+I**
- Go to **Console** tab
- Clear console (trash icon)

### 2. Test the Flow

#### Scenario A: Adding New Member with Custom Data
1. Go to Organisasi → Manage
2. Click "Tambah Anggota"
3. Select a user (or leave as Vacant)
4. Check "Gunakan Data Custom"
5. Fill in custom fields
6. Click "Tambah Anggota"

**Watch Console for:**
```
[Manage Page] Submitting member: {...}
[Manage Page] Sending customPayload: {...}
[Manage Page] POST to /api/organisation/roles/...
[Organisation POST] Received request: {...}
[Organisation POST] Inserting custom data for member: ...
[Organisation POST] Custom insert result: {...}
[Organisation POST] ✅ Custom data inserted successfully
[Manage Page] POST response: {...}
```

#### Scenario B: Editing Member to Add Custom Data
1. Go to Organisasi → Manage
2. Click edit (pencil) on any member
3. Check "Gunakan Data Custom"
4. Change the name
5. Click "Simpan Perubahan"

**Watch Console for:**
```
[Manage Page] Submitting member: {...}
[Manage Page] PATCH to /api/organisation/members/...
[Organisation PATCH] Received request: {...}
[Organisation PATCH] Upserting custom data for member: ...
[Organisation PATCH] Custom upsert result: {...}
[Organisation PATCH] ✅ Custom data upserted successfully
[Manage Page] PATCH response: {...}
```

#### Scenario C: Viewing Organisasi Page
1. Go to Organisasi page
2. Watch console

**You should see:**
```
[Organisasi Page] Fetching /api/organisation...
[Organisation API] Fetching custom data for X members
[Organisation API] Member IDs: [...]
[Organisation API] Customs query result: {...}
[Organisation API] Custom data map: {...}
[Organisasi Page] Received organisation data: {...}
```

### 3. Copy Console Output

**Copy ALL console logs** and share them. Look for:

✅ **Success indicators:**
- `[Organisation POST] ✅ Custom data inserted successfully`
- `[Organisation PATCH] ✅ Custom data upserted successfully`
- `[Organisation API] Custom data map:` has entries
- `[Organisasi Page] Member with custom data:` shows members

❌ **Error indicators:**
- `[Organisation] Failed to insert custom data:` with error object
- `[Organisation] Failed to upsert custom data:` with error object
- `[Organisation API] Error fetching customs:` with error object
- RLS policy errors
- Permission denied errors

### 4. Common Error Patterns

#### RLS Policy Error
```
Error: new row violates row-level security policy for table "organisation_member_customs"
```
**Fix**: Check if user has `can_manage_organisation` role

#### Permission Denied
```
Error: permission denied for table organisation_member_customs
```
**Fix**: Verify RLS policies are installed correctly

#### Custom Data Not Fetched
```
[Organisation API] Customs query result: { data: [], error: null, count: 0 }
```
**Fix**: Table is empty - custom data was never saved

#### Custom Data Not in Response
```
[Organisation API] Custom data map: {}
```
**Fix**: Query returned no results - check member IDs match

### 5. Database Check

Run this in Supabase SQL Editor to verify:
```sql
SELECT 
  om.id as member_id,
  om.full_name as base_name,
  omc.custom_full_name as custom_name,
  omc.custom_block_name,
  omc.custom_whatsapp_number,
  om.user_id
FROM organisation_members om
LEFT JOIN organisation_member_customs omc ON om.id = omc.organisation_member_id
ORDER BY om.created_at DESC
LIMIT 20;
```

**Expected**: Some rows should have `custom_name` NOT NULL

### 6. What to Share

When asking for help, provide:
1. **Full console log** (copy all text from console)
2. **Database query result** (from step 5)
3. **What you tried to do** (add new member? edit existing?)
4. **Expected vs actual result**

---

## Quick Fixes

### If custom data INSERT fails:
```sql
-- Check your user has the right role
SELECT 
  tu.user_id,
  r.name as role_name,
  tur.revoked_at
FROM tenant_users tu
JOIN tenant_user_roles tur ON tu.id = tur.tenant_user_id
JOIN roles r ON tur.role_id = r.id
WHERE tu.user_id = auth.uid();
```

### If custom data SELECT fails:
```sql
-- Check if table has data
SELECT COUNT(*) FROM organisation_member_customs;

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'organisation_member_customs';
```

### If data exists but doesn't show:
```sql
-- Check if member IDs match
SELECT om.id, om.full_name, omc.organisation_member_id
FROM organisation_members om
LEFT JOIN organisation_member_customs omc ON om.id = omc.organisation_member_id;
```

---

**Next Step**: Run the test scenarios, copy the console output, and share it!
