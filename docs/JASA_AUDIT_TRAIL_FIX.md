# Jasa Service Creation & Update - Audit Trail Fix

## Issue

The `created_by` and `updated_by` fields were not being mapped and inserted into the database when creating or updating jasa services.

## Root Cause

When inserting or updating records in the `jasa_services` table, the API endpoints were not setting the audit trail fields:
- `created_by`: Should contain the user ID who created the service
- `updated_by`: Should contain the user ID who last updated the service

## Solution

### 1. Fixed POST `/api/jasa` (Create)

**File**: `src/app/api/jasa/route.ts`

**Before**:
```typescript
const { data: newService, error: insertError } = await supabase
  .from("jasa_services")
  .insert({
    tenant_id: tenantUser.tenant_id,
    category_id,
    owner_user_id: session.userId,
    owner_display_name: user.full_name,
    name,
    slug,
    description,
    summary,
    estimated_price,
    currency_code: "IDR",
    hari_operasional,
    jam_operasional_mulai: jam_mulai,
    jam_operasional_selesai: jam_selesai,
    status: finalStatus,
    published_at: new Date().toISOString(),
    wa_number,
    location_note,
    // ❌ Missing: created_by, updated_by
  })
```

**After**:
```typescript
const { data: newService, error: insertError } = await supabase
  .from("jasa_services")
  .insert({
    tenant_id: tenantUser.tenant_id,
    category_id,
    owner_user_id: session.userId,
    owner_display_name: user.full_name,
    name,
    slug,
    description,
    summary,
    estimated_price,
    currency_code: "IDR",
    hari_operasional,
    jam_operasional_mulai: jam_mulai,
    jam_operasional_selesai: jam_selesai,
    is_available: finalStatus === "AVAILABLE",
    published_at: new Date().toISOString(),
    wa_number,
    location_note,
    created_by: session.userId,  // ✅ Added
    updated_by: session.userId,  // ✅ Added
  })
```

**Changes**:
- ✅ Added `created_by: session.userId`
- ✅ Added `updated_by: session.userId`
- ✅ Changed `status` to `is_available` for consistency with database schema

---

### 2. Fixed PUT `/api/jasa/[id]` (Update)

**File**: `src/app/api/jasa/[id]/route.ts`

**Before**:
```typescript
const updateData: any = { updated_at: new Date().toISOString() };

if (body.name !== undefined) updateData.name = body.name;
if (body.description !== undefined) updateData.description = body.description;
// ... other fields
if (body.status !== undefined) updateData.status = body.status;
```

**After**:
```typescript
const updateData: any = {
  updated_at: new Date().toISOString(),
  updated_by: session.userId,  // ✅ Added
};

if (body.name !== undefined) updateData.name = body.name;
if (body.description !== undefined) updateData.description = body.description;
// ... other fields
if (body.is_available !== undefined) updateData.is_available = body.is_available;  // ✅ Changed
```

**Changes**:
- ✅ Added `updated_by: session.userId` to update data
- ✅ Changed `status` to `is_available` in interface and update logic

---

### 3. Updated Type Definitions

**File**: `src/app/api/jasa/[id]/route.ts`

Updated `UpdateJasaRequest` interface:
```typescript
interface UpdateJasaRequest {
  name?: string;
  description?: string;
  summary?: string;
  estimated_price?: number;
  category_id?: string;
  hari_operasional?: Record<string, boolean>;
  jam_operasional_mulai?: string;
  jam_operasional_selesai?: string;
  is_available?: boolean;  // ✅ Changed from status?: string
  wa_number?: string;
  location_note?: string;
}
```

---

### 4. Cleaned Up GET Query

**File**: `src/app/api/jasa/[id]/route.ts`

Removed unused properties from SELECT query:
- ❌ Removed `currency_code`
- ❌ Removed `rating_avg`
- ❌ Removed `rating_count`
- ❌ Removed `is_featured`
- ❌ Removed `published_at`

Kept only necessary properties for the detail view.

---

## Database Schema Reference

```sql
jasa_services (
  id                        UUID PRIMARY KEY,
  tenant_id                 UUID NOT NULL,
  category_id               UUID NOT NULL,
  owner_user_id             UUID NOT NULL,
  owner_display_name        TEXT NOT NULL,
  name                      TEXT NOT NULL,
  slug                      TEXT NOT NULL,
  description               TEXT,
  summary                   TEXT,
  estimated_price           NUMERIC NOT NULL,
  currency_code             TEXT NOT NULL DEFAULT 'IDR',
  hari_operasional          JSONB NOT NULL,
  jam_operasional_mulai     TIME NOT NULL,
  jam_operasional_selesai   TIME NOT NULL,
  is_available              BOOLEAN NOT NULL DEFAULT true,
  wa_number                 TEXT,
  location_note             TEXT,
  rating_avg                NUMERIC DEFAULT 0,
  rating_count              INTEGER DEFAULT 0,
  is_featured               BOOLEAN DEFAULT false,
  published_at              TIMESTAMP,
  created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by                UUID,        -- ✅ Now properly set
  updated_at                TIMESTAMP,
  updated_by                UUID,        -- ✅ Now properly set
  status                    TEXT,        -- ⚠️ Deprecated, use is_available
  ...
)
```

---

## Testing Checklist

- [ ] Create new jasa service → Verify `created_by` and `updated_by` are set
- [ ] Update jasa service → Verify `updated_by` is updated
- [ ] Check database directly: `SELECT id, name, created_by, updated_by FROM jasa_services;`
- [ ] Verify audit trail in admin dashboard (if available)

---

## Related Files Modified

1. `src/app/api/jasa/route.ts` - Fixed POST endpoint
2. `src/app/api/jasa/[id]/route.ts` - Fixed PUT and GET endpoints
3. `src/types/database.ts` - Already updated with correct types

---

## Additional Notes

### Status vs Is Available

There was confusion between `status` and `is_available` fields:

- **Old approach**: Used `status` field with values like "AVAILABLE", "NOT_AVAILABLE"
- **New approach**: Use `is_available` boolean field (true/false)

The `status` field is deprecated but may still exist in the database for backward compatibility. All new code should use `is_available`.

### Session User ID

All audit trail fields now correctly use `session.userId` from the authenticated session, ensuring proper tracking of who created/modified each service.

---

**Status**: ✅ Complete  
**Date**: 2026-04-21  
**Related**: See `JASA_CARD_PROPERTY_MAPPING.md` for card property optimization
