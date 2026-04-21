# Jasa Card Property Mapping - Documentation

## Overview

This document describes the property mapping between the Jasa Card component, API layer, and database schema. Created as part of the property mapping cleanup and optimization effort.

**Status**: ✅ Complete  
**Last Updated**: 2026-04-21

---

## Required Properties (11 Total)

The `JasaCard` component uses only 11 essential properties from the `JasaServiceWithMedia` interface:

| # | Property | Type | Database Source | Used For |
|---|----------|------|-----------------|----------|
| 1 | `id` | `string` | `jasa_services.id` | React key |
| 2 | `name` | `string` | `jasa_services.name` | Service title display |
| 3 | `description` | `string \| null` | `jasa_services.description` | Service description (2 lines) |
| 4 | `estimated_price` | `number` | `jasa_services.estimated_price` | Price display (formatted to Rupiah) |
| 5 | `hari_operasional` | `Record<string, boolean>` | `jasa_services.hari_operasional` | Available days summary |
| 6 | `is_available` | `boolean` | `jasa_services.is_available` | Filter queries (not displayed) |
| 7 | `wa_number` | `string \| null` | `jasa_services.wa_number` | WhatsApp contact handler |
| 8 | `owner_display_name` | `string` | `users.full_name` | Provider name display |
| 9 | `owner_blok_rumah` | `string \| null` | `houses.blok_rumah` (via `user_houses`) | Block number display |
| 10 | `category_icon` | `string \| null` | `marketplace_categories.icon` | Fallback icon when no image |
| 11 | `primary_image_url` | `string \| null` | `jasa_service_media.url` | Primary service image |

---

## Database Schema Relations

```
jasa_services
├── id (PK)
├── name
├── description
├── estimated_price
├── hari_operasional (JSONB)
├── is_available (boolean)
├── wa_number
├── owner_user_id (FK → users.id)
├── category_id (FK → marketplace_categories.id)
└── created_at

users (via owner_user_id)
├── id (PK)
├── full_name → owner_display_name
└── ...

user_houses (bridge table)
├── user_id (FK → users.id)
├── house_id (FK → houses.id)
└── is_primary (boolean) ← filter for primary house

houses (via user_houses.house_id)
├── id (PK)
└── blok_rumah → owner_blok_rumah

marketplace_categories (via category_id)
├── id (PK)
├── icon → category_icon
└── ...

jasa_service_media (via service_id)
├── service_id (FK → jasa_services.id)
├── url → primary_image_url
└── is_primary (boolean) ← filter for primary image
```

---

## API Response Structure

### GET `/api/jasa` Response

```typescript
{
  success: boolean;
  data: {
    services: JasaServiceWithMedia[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
    filters: {
      categories: Array<{ 
        id: string; 
        name: string; 
        icon: string | null; 
      }>;
    };
  };
}
```

### JasaServiceWithMedia Interface

```typescript
interface JasaServiceWithMedia {
  id: string;
  name: string;
  description: string | null;
  estimated_price: number;
  hari_operasional: Record<string, boolean>;
  is_available: boolean;
  wa_number: string | null;
  owner_display_name: string;
  owner_blok_rumah: string | null;
  category_icon: string | null;
  primary_image_url: string | null;
}
```

---

## Removed Properties

These properties were **removed** from the card interface to simplify and improve performance:

| Property | Reason for Removal |
|----------|-------------------|
| `summary` | Not used in card display, redundant with `description` |
| `currency_code` | Always "IDR", not displayed |
| `jam_operasional_mulai` | Not displayed in card view |
| `jam_operasional_selesai` | Not displayed in card view |
| `location_note` | Not displayed in card view |
| `rating_avg` | Not displayed in card view |
| `rating_count` | Not displayed in card view |
| `is_featured` | Only used for sorting, not display |
| `published_at` | Not displayed in card view |
| `category_name` | Not displayed in card view |
| `created_at` | Not displayed in card view |
| `updated_at` | Not displayed in card view |
| `owner_user_id` | Internal use only, not for display |
| `category_id` | Internal use only, not for display |

---

## Key Fixes Applied

### 1. Fixed `owner_blok_rumah` Mapping

**Problem**: Field was being fetched from non-existent `users.blok_rumah`

**Before**:
```typescript
const { data: owners } = await supabase
  .from("users")
  .select("id, full_name, blok_rumah")  // ❌ blok_rumah doesn't exist in users table
  .in("id", ownerIds);
```

**After**:
```typescript
const { data: owners } = await supabase
  .from("users")
  .select(`
    id,
    full_name,
    user_houses!inner(
      houses(
        blok_rumah
      )
    )
  `)
  .in("id", ownerIds)
  .eq("user_houses.is_primary", true);  // ✅ Correctly fetches from houses via user_houses
```

### 2. Removed `summary` Field

**Before**: Used `service.summary || service.description`

**After**: Only uses `service.description`

### 3. Performance Optimizations

- Added `React.memo` to `JasaCard` component
- Reduced API payload from 24+ properties to 11 properties
- Optimized database queries to select only required fields
- Cleaner type definitions for better TypeScript performance

---

## Usage Examples

### Landing Page

```tsx
<JasaCard
  key={service.id}
  service={service}
  onClick={() => router.push(`/jasa#${service.id}`)}
/>
```

### Jasa List Page

```tsx
<JasaCard
  key={service.id}
  service={service}
  onClick={() => handleViewService(service.id)}
  onContact={() => handleContact(service)}
/>
```

---

## Files Modified

1. `src/types/database.ts` - Updated type definitions
2. `src/app/api/jasa/route.ts` - Fixed API query and response mapping
3. `src/components/jasa/JasaCard.tsx` - Added memo, removed unused properties
4. `docs/JASA_CARD_PROPERTY_MAPPING.md` - This documentation

---

## Future Work

- [ ] Investigate `created_by` field mapping in jasa service creation form
- [ ] Add audit trail for `created_by` and `updated_by` fields
- [ ] Consider adding rating display to card in future iterations
- [ ] Add `location_note` display if location becomes important for UX

---

**Related Documentation**:
- [Database Schema](./DATABASE_SCHEMA.md)
- [API Documentation](./API_REFERENCE.md)
- [Component Architecture](./COMPONENT_GUIDE.md)
