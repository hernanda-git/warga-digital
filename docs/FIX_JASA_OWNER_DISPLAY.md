# Fix: Jasa Service Owner Display Issue

## Problem

Jasa service cards were displaying "Unknown" as the owner name despite having correct `owner_user_id` values in the database.

## Root Cause

The API query used an **INNER JOIN** (`!inner`) to fetch owner information, which **excluded** users who didn't have a primary house record in the `user_houses` table.

### Technical Details

**Problematic Query** (`src/app/api/jasa/route.ts`):
```typescript
const { data: owners } = await supabase
  .from("users")
  .select(`
    id,
    full_name,
    user_houses!inner(           // ❌ INNER JOIN excludes users without houses
      houses(blok_rumah)
    )
  `)
  .in("id", ownerIds)
  .eq("user_houses.is_primary", true);
```

**Why This Failed:**
1. `!inner` = INNER JOIN - only returns matching records
2. Users without `user_houses` records were excluded
3. Users with `is_primary=false` were excluded
4. Empty `full_name` values caused fallback to "Unknown"

## Solution Implemented

### 1. Code Changes

#### Change 1: INNER JOIN → LEFT JOIN
**File:** `src/app/api/jasa/route.ts` (Line 264)

```typescript
// BEFORE
user_houses!inner(
  houses(blok_rumah)
)

// AFTER
user_houses!left(
  houses(blok_rumah)
)
```

**Effect:** Includes ALL owners, even those without houses

---

#### Change 2: Improve Name Handling
**File:** `src/app/api/jasa/route.ts` (Line 283)

```typescript
// BEFORE
name: u.full_name

// AFTER
name: u.full_name?.trim() || 'Unknown'
```

**Effect:** Handles null, undefined, and empty string values

---

#### Change 3: Better Fallback Logic
**File:** `src/app/api/jasa/route.ts` (Line 326)

```typescript
// BEFORE
owner_display_name: owner?.name || "Unknown"

// AFTER
owner_display_name: (owner?.name && owner.name.trim()) 
  ? owner.name.trim() 
  : "Unknown"
```

**Effect:** Properly handles empty strings and whitespace

---

### 2. Database Migration

**File:** `supabase/migrations/20260422042042_fix_owner_data_integrity.sql`

#### Migration Steps:

1. **Diagnostic Queries** - Identify affected users
2. **Data Fix** - Create missing `user_houses` records
3. **Cleanup** - Fix empty `full_name` values
4. **Documentation** - Add field comments
5. **Verification** - Confirm fixes applied

#### Key SQL:
```sql
-- Create user_houses for owners without primary houses
INSERT INTO user_houses (...)
SELECT 
  gen_random_uuid(),
  tu.tenant_id,
  u.id,
  COALESCE(
    (SELECT uh2.house_id FROM user_houses uh2 WHERE uh2.user_id = u.id LIMIT 1),
    (SELECT h2.id FROM houses h2 WHERE h2.tenant_id = tu.tenant_id LIMIT 1)
  ),
  'OWNER',
  true,
  'ACTIVE',
  NOW(),
  u.id
FROM users u
INNER JOIN tenant_users tu ON u.id = tu.user_id
WHERE u.id IN (SELECT DISTINCT owner_user_id FROM jasa_services)
AND NOT EXISTS (
  SELECT 1 FROM user_houses uh 
  WHERE uh.user_id = u.id AND uh.is_primary = true
);
```

---

### 3. Field Documentation

Added comments to clarify field purposes:

```sql
COMMENT ON COLUMN jasa_services.owner_user_id IS 
  'Service owner (business context) - displayed on card, used for authorization. 
   References users.id. Should point to the actual service provider.';

COMMENT ON COLUMN jasa_services.created_by IS 
  'Record creator (audit trail) - tracks who created the database record. 
   References users.id. May differ from owner_user_id if admin created on behalf of user.
   Never changes after creation.';

COMMENT ON COLUMN jasa_services.owner_display_name IS 
  'Denormalized display name of the service owner at time of creation.
   Copied from users.full_name during service creation.
   Does not auto-update if user changes their name.';
```

---

## Impact Analysis

### Before Fix

| Scenario | Result | Issue |
|----------|--------|-------|
| User with primary house | ✅ Shows name | Works correctly |
| User without house | ❌ Shows "Unknown" | INNER JOIN excluded them |
| Empty `full_name` | ❌ Shows "Unknown" | Empty string is falsy |
| Multiple services | ⚠️ Inconsistent | Depends on house status |

### After Fix

| Scenario | Result | Notes |
|----------|--------|-------|
| User with primary house | ✅ Shows name + block | Works as before |
| User without house | ✅ Shows name, block=null | No longer "Unknown" |
| Empty `full_name` | ✅ Shows "Unknown" | Expected behavior |
| Multiple services | ✅ Consistent | All show correctly |

---

## Testing

### Test Scenarios

1. **Normal User with House**
   ```sql
   -- Should show: owner name + block number
   SELECT owner_display_name, owner_blok_rumah 
   FROM jasa_services 
   WHERE owner_user_id = 'user-with-house';
   ```

2. **User Without House**
   ```sql
   -- Should show: owner name, block=null (not "Unknown")
   SELECT owner_display_name, owner_blok_rumah 
   FROM jasa_services 
   WHERE owner_user_id = 'user-without-house';
   ```

3. **Empty Name Handling**
   ```sql
   -- Should show: "Unknown" (acceptable)
   SELECT owner_display_name 
   FROM jasa_services 
   WHERE owner_user_id = 'user-empty-name';
   ```

### Verification Queries

```sql
-- Check all owners now have valid names
SELECT 
  u.full_name,
  COUNT(js.id) as service_count
FROM jasa_services js
INNER JOIN users u ON js.owner_user_id = u.id
GROUP BY u.full_name
HAVING COUNT(js.id) > 0;

-- Check owners with primary houses
SELECT 
  COUNT(DISTINCT js.owner_user_id) as owners_with_houses,
  COUNT(js.id) as services_with_houses
FROM jasa_services js
INNER JOIN user_houses uh ON js.owner_user_id = uh.user_id AND uh.is_primary = true;
```

---

## Deployment

### Prerequisites
- [ ] Backup database before running migration
- [ ] Test in staging environment
- [ ] Verify no services break

### Deployment Steps

1. **Deploy Code Changes**
   ```bash
   git pull origin dev
   npm run build
   npm run start
   ```

2. **Run Database Migration**
   - Go to Supabase Dashboard → SQL Editor
   - Copy contents from `20260422042042_fix_owner_data_integrity.sql`
   - Run migration
   - Verify output shows successful fixes

3. **Verify Deployment**
   - Check jasa service list page
   - Verify owner names display correctly
   - Check for any "Unknown" values (should be minimal)

4. **Monitor Logs**
   - Watch for API errors
   - Check for any new "Unknown" displays
   - Monitor database performance

---

## Rollback Plan

If issues occur:

### Code Rollback
```bash
git revert <commit-hash>
```

### Database Rollback
```sql
-- Remove user_houses records created by migration
DELETE FROM user_houses
WHERE created_at > NOW() - INTERVAL '1 hour'
AND is_primary = true
AND user_id IN (SELECT DISTINCT owner_user_id FROM jasa_services);

-- Remove comments
COMMENT ON COLUMN jasa_services.owner_user_id IS NULL;
COMMENT ON COLUMN jasa_services.created_by IS NULL;
COMMENT ON COLUMN jasa_services.owner_display_name IS NULL;
```

---

## Future Improvements

### 1. Add Validation
Prevent creation of jasa services without primary house:

```typescript
// In POST /api/jasa
const { data: userHouse } = await supabase
  .from("user_houses")
  .select("house_id")
  .eq("user_id", session.userId)
  .eq("is_primary", true)
  .maybeSingle();

if (!userHouse) {
  return NextResponse.json({
    success: false,
    error: "Anda harus memiliki rumah utama sebelum membuat layanan"
  }, { status: 400 });
}
```

### 2. Add Database Constraint
Ensure all owners have houses:

```sql
-- Add trigger to validate before insert
CREATE OR REPLACE FUNCTION validate_owner_has_house()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_houses 
    WHERE user_id = NEW.owner_user_id AND is_primary = true
  ) THEN
    RAISE EXCEPTION 'Service owner must have a primary house';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_owner_house_before_insert
BEFORE INSERT ON jasa_services
FOR EACH ROW
EXECUTE FUNCTION validate_owner_has_house();
```

### 3. Add Index for Performance
Optimize owner lookup queries:

```sql
CREATE INDEX idx_user_houses_primary 
ON user_houses (user_id, is_primary) 
WHERE is_primary = true;
```

---

## Related Issues

- **Property Mapping**: See `JASA_CARD_PROPERTY_MAPPING.md`
- **Audit Trail**: See `JASA_AUDIT_TRAIL_FIX.md`
- **500 Error Fix**: See `FIX_JASA_500_ERROR.md`

---

## Checklist

### Code Changes
- [x] Change `!inner` to `!left` in owner query
- [x] Add `.trim()` to name handling
- [x] Improve fallback logic for empty names
- [x] Add comprehensive comments

### Database Changes
- [x] Create migration file
- [x] Add diagnostic queries
- [x] Add data fix queries
- [x] Add documentation comments
- [x] Add verification queries

### Documentation
- [x] Create fix documentation
- [x] Add deployment guide
- [x] Add rollback instructions
- [x] Add future improvements

### Testing
- [ ] Run diagnostic queries
- [ ] Test in staging environment
- [ ] Verify all scenarios
- [ ] Deploy to production
- [ ] Monitor after deployment

---

**Status:** ✅ Code Complete, Pending Migration  
**Date:** 2026-04-22  
**Author:** Development Team  
**Reviewed:** Pending
