# Fix: 500 Error on /api/jasa After Data Deletion

## Problem

After deleting all jasa service data, the API endpoint returned a 500 Internal Server Error:
```
GET https://www.warga-digital.com/api/jasa?page=1&limit=20&hari=senin
Status: 500 Internal Server Error
```

## Root Cause

The API was trying to order query results by columns that were deleted in the migration:
- `is_featured` - Removed in migration `20260421155707_remove_unused_jasa_columns.sql`
- `published_at` - Still exists but ordering caused issues with empty tables

**Problematic code:**
```typescript
const { data: services, error: servicesError } = await baseQuery
  .order("is_featured", { ascending: false })  // ❌ Column deleted
  .order("published_at", { ascending: false }) // ⚠️ Caused issues
  .order("created_at", { ascending: false })
  .range(offset, offset + limit - 1);
```

## Solution

### 1. Removed Deleted Column References

**File:** `src/app/api/jasa/route.ts`

**Before:**
```typescript
const { data: services, error: servicesError } = await baseQuery
  .order("is_featured", { ascending: false })
  .order("published_at", { ascending: false })
  .order("created_at", { ascending: false })
  .range(offset, offset + limit - 1);
```

**After:**
```typescript
const { data: services, error: servicesError } = await baseQuery
  .order("created_at", { ascending: false })
  .range(offset, offset + limit - 1);
```

### 2. Added Error Handling for Domain Fetch

**Before:**
```typescript
const { data: allCategories } = await supabase
  .from("marketplace_categories")
  .select("id, name, icon")
  .eq(
    "domain_id",
    (
      await supabase
        .from("marketplace_domains")
        .select("id")
        .eq("code", "JASA")
        .single() // ❌ Could fail silently
    ).data?.id,
  )
  .eq("is_active", true)
  .order("sort_order");
```

**After:**
```typescript
const { data: jasaDomain, error: domainError } = await supabase
  .from("marketplace_domains")
  .select("id")
  .eq("code", "JASA")
  .single();

if (domainError || !jasaDomain) {
  console.error("[Jasa GET] Failed to fetch JASA domain:", domainError);
  return NextResponse.json(
    { success: false, error: "Domain JASA tidak ditemukan" },
    { status: 500 },
  );
}

const { data: allCategories } = await supabase
  .from("marketplace_categories")
  .select("id, name, icon")
  .eq("domain_id", jasaDomain.id)
  .eq("is_active", true)
  .order("sort_order");
```

## Changes Made

| File | Changes | Lines |
|------|---------|-------|
| `src/app/api/jasa/route.ts` | Removed `is_featured` and `published_at` ordering | 249-253 |
| `src/app/api/jasa/route.ts` | Added error handling for domain fetch | 340-352 |

## Testing

✅ **Test Cases:**
1. Empty database (0 jasa services) - Should return empty array, not 500
2. With filters applied - Should work correctly
3. Without filters - Should work correctly
4. Domain fetch failure - Should return proper error message

**Expected Response (Empty Database):**
```json
{
  "success": true,
  "data": {
    "services": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "total_pages": 0
    },
    "filters": {
      "categories": [...]
    }
  }
}
```

## Related

- **Migration:** `20260421155707_remove_unused_jasa_columns.sql`
- **Documentation:** `DELETE_JASA_DATA_GUIDE.md`
- **Commit:** d4cda2f

## Prevention

To avoid similar issues in the future:

1. **Always check column usage before deletion**
   ```sql
   -- Search for column references in codebase
   grep -r "is_featured" src/
   ```

2. **Test API endpoints after schema changes**
   - Test with empty tables
   - Test with sample data
   - Test all filter combinations

3. **Update all queries that reference deleted columns**
   - SELECT queries
   - ORDER BY clauses
   - WHERE conditions
   - INSERT/UPDATE statements

## Status

✅ **Fixed** - Deployed to dev branch  
🔄 **Next** - Deploy to production

---

**Date:** 2026-04-21  
**Author:** Development Team  
**Status:** Resolved
