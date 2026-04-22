# 🚨 CRITICAL: Migration Not Applied

## Problem
The custom data is **NOT showing** because the database migration hasn't been run yet in Supabase. The `organisation_member_customs` table either:
1. Doesn't exist, OR
2. Has incorrect RLS policies blocking INSERTs

## ✅ Solution: Run the Migration NOW

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com
2. Select your project
3. Go to **SQL Editor** → **New Query**

### Step 2: Run Migration 1 (Custom Data Table)
1. Open the file: `supabase/migrations/20260422000000_create_organisation_member_customs.sql`
2. Copy **ALL** the content
3. Paste into Supabase SQL Editor
4. Click **RUN** (or Ctrl+Enter)

**Expected Result**: 
```
Success. No rows returned
```

If you see an error, share it immediately.

### Step 3: Run Migration 2 (Avatars Bucket)
1. Open a **new query** in Supabase SQL Editor
2. Open the file: `supabase/migrations/20260422000001_avatars_storage_bucket.sql`
3. Copy **ALL** the content
4. Paste into Supabase SQL Editor
5. Click **RUN**

**Expected Result**:
```
Success. No rows returned
```

### Step 4: Verify Installation
1. Open a **new query** in Supabase SQL Editor
2. Open the file: `supabase/migrations/test-organisation-custom-data.sql`
3. Copy **ALL** the content
4. Paste into Supabase SQL Editor
5. Click **RUN**

**Expected Results** (should see 4 result sets):
1. `organisation_member_customs table exists` → result = **1**
2. `avatars bucket exists` → result = **1**
3. `organisation_member_customs policies` → **3 rows** (policies list)
4. `avatars storage policies` → **4 rows** (policies list)

### Step 5: Test Custom Data
1. Run this query to test INSERT:
```sql
-- Get first member ID
SELECT id FROM organisation_members LIMIT 1;
```

2. Copy the ID from results, then run:
```sql
-- Replace MEMBER_ID_HERE with actual ID
INSERT INTO organisation_member_customs (
  organisation_member_id,
  custom_full_name,
  custom_block_name,
  custom_whatsapp_number,
  custom_profile_picture_url
) VALUES (
  'MEMBER_ID_HERE',  -- Paste the ID from step 1
  'Test Custom Name',
  'Test Block',
  '6281234567890',
  NULL
);
```

**Expected**: `Success. 1 row inserted`

If it says "Success" but 0 rows, or throws an error → **RLS policy issue**

3. Verify the insert worked:
```sql
SELECT 
  om.id,
  om.full_name as base_name,
  omc.custom_full_name as custom_name,
  CASE 
    WHEN omc.custom_full_name IS NOT NULL THEN '✅ Has Custom Data'
    ELSE '❌ No Custom Data'
  END as status
FROM organisation_members om
LEFT JOIN organisation_member_customs omc ON om.id = omc.organisation_member_id
WHERE omc.custom_full_name IS NOT NULL;
```

**Expected**: At least 1 row with status = `✅ Has Custom Data`

### Step 6: Test in Application
1. Go to Organisasi → Manage
2. Click "Tambah Anggota" or edit existing member
3. Check "Gunakan Data Custom"
4. Fill in:
   - Nama: `Test Custom`
   - Blok: `Test`
   - WhatsApp: `62800000000`
   - Upload a photo (optional)
5. Click "Tambah Anggota" or "Simpan Perubahan"
6. Go back to Organisasi page
7. **Verify**: The custom name should appear

---

## 🔍 Troubleshooting

### Error: "relation does not exist"
**Cause**: Migration 1 didn't run  
**Fix**: Re-run Migration 1 SQL

### Error: "permission denied"
**Cause**: Your user doesn't have permissions  
**Fix**: Make sure you're logged in as project owner/admin

### Error: "new row violates row-level security policy"
**Cause**: RLS policy is blocking the INSERT  
**Fix**: Check if your user has `can_manage_organisation` role:

```sql
SELECT 
  tu.user_id,
  r.name as role_name,
  tur.revoked_at
FROM tenant_users tu
JOIN tenant_user_roles tur ON tu.id = tur.tenant_user_id
JOIN roles r ON tur.role_id = r.id
WHERE tu.user_id = auth.uid();
```

If no `can_manage_organisation` role appears, you need to add it:
```sql
-- Find your tenant_user_id
SELECT id FROM tenant_users WHERE user_id = auth.uid();

-- Add role (replace TENANT_USER_ID with actual ID)
INSERT INTO tenant_user_roles (tenant_user_id, role_id)
SELECT 
  'TENANT_USER_ID',  -- Replace with your ID
  id 
FROM roles 
WHERE name = 'can_manage_organisation';
```

### Insert succeeds but data doesn't show in app
**Cause**: API not fetching custom data  
**Fix**: Check browser console for errors, verify API response

---

## 📋 Quick Checklist

Before testing in app, ensure:
- [ ] Migration 1 ran successfully (table created)
- [ ] Migration 2 ran successfully (bucket created)
- [ ] Test script shows all tables/buckets exist
- [ ] Manual INSERT test works
- [ ] Your user has `can_manage_organisation` role
- [ ] No RLS policy errors

---

## 🎯 Success Criteria

After running migrations, this query should return rows with custom data:

```sql
SELECT 
  om.id as member_id,
  om.full_name as base_name,
  omc.custom_full_name as custom_name,
  om.user_id
FROM organisation_members om
LEFT JOIN organisation_member_customs omc ON om.id = omc.organisation_member_id
ORDER BY om.created_at DESC
LIMIT 10;
```

**Before**: All `custom_name` = NULL  
**After**: Some `custom_name` = actual custom names

---

**Next Step**: Run the migrations NOW and report the results!
