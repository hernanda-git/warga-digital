# Aset RT — Inventory Management Feature

**Status**: Implemented  
**Created**: 2026-05-20  
**Tech**: Supabase (Postgres), Next.js 15 App Router, Tailwind CSS, `@/lib/api-response`

---

## Overview

Aset RT is an inventory management module for logging and monitoring physical assets owned by the RT community — including electronics, furniture, vehicles, tools, and more.

The feature provides:
- **Asset listing** with search, category filter, and sort
- **Hero stats** (total assets, new this month, items needing maintenance)
- **Full CRUD** via REST API with soft-delete
- **Category-based organization** with customizable tags

The landing page `FeatureGrid` links to `/asset-rt`.

---

## Database Schema

### Migration File

`supabase/migrations/20260520000000_create_rt_assets.sql`

### `rt_asset_categories`

Pre-seeded categories scoped to the default tenant:

| Name | Icon | Color |
|------|------|-------|
| Elektronik | 🔌 | blue |
| Furnitur | 🪑 | amber |
| Kendaraan | 🚗 | purple |
| Mesin | ⚙️ | gray |
| Peralatan | 🔧 | green |
| Lainnya | 📦 | gray |

```sql
CREATE TABLE rt_asset_categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  icon       VARCHAR(10),
  color      VARCHAR(20) NOT NULL DEFAULT 'gray'
              CHECK (color IN ('blue', 'green', 'amber', 'purple', 'gray')),
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
```

### `rt_assets`

Main asset table with full inventory tracking:

```sql
CREATE TABLE rt_assets (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id           UUID         NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  name                   VARCHAR(200) NOT NULL,
  description            TEXT,
  location               VARCHAR(200),
  category_id            UUID         REFERENCES rt_asset_categories(id) ON DELETE SET NULL,
  quantity               INT          NOT NULL DEFAULT 1,
  unit_label             VARCHAR(30)  NOT NULL DEFAULT 'Unit',
  status                 VARCHAR(30)  NOT NULL DEFAULT 'Aktif'
                           CHECK (status IN ('Aktif', 'Servis', 'Rusak', 'Garansi')),
  tags                   TEXT[],
  purchase_date          DATE,
  last_maintenance_date  DATE,
  condition              VARCHAR(20)  NOT NULL DEFAULT 'Baik'
                           CHECK (condition IN ('Baik', 'Rusak Ringan', 'Rusak Berat', 'Servis')),
  notes                  TEXT,
  created_by             UUID         REFERENCES users(id),
  updated_by             UUID         REFERENCES users(id),
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ,
  deleted_at             TIMESTAMPTZ
);
```

### Key Indexes

- `idx_rt_assets_tenant_community` on `(tenant_id, community_id)` — primary lookup
- `idx_rt_assets_category` on `(category_id)` — filter by category
- `idx_rt_assets_deleted` on `(deleted_at)` WHERE NOT NULL — soft-delete scans

### RLS Policies

Both tables have permissive policies for authenticated users within the same tenant:
- `SELECT` — any active `tenant_users` record
- `INSERT / UPDATE / DELETE` — any authenticated user in the tenant

> **Agent note**: If admin-role scoping is needed later, refine the policies to check `tenant_user_roles` against a role allowlist (similar to `ROLE_IDS_CAN_SUBMIT_KAS_RT` pattern in `seed-ids.ts`).

---

## Type Definitions

**File**: `src/types/asset-rt.ts`

```typescript
interface AssetItem {
  id: string;
  tenant_id: string;
  community_id: string;
  name: string;
  description: string | null;
  location: string | null;
  category_id: string | null;
  category: AssetCategory | null;
  quantity: number;
  unit_label: string;
  status: "Aktif" | "Servis" | "Rusak" | "Garansi";
  tags: string[];
  purchase_date: string | null;
  last_maintenance_date: string | null;
  condition: "Baik" | "Rusak Ringan" | "Rusak Berat" | "Servis";
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_by_full_name: string | null;
  updated_by_full_name: string | null;
  created_at: string;
  updated_at: string | null;
}

interface AssetCategory {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  sort_order: number;
}

interface AssetStats {
  total: number;
  new_this_month: number;
  needs_maintenance: number;
}

interface AssetFilterState {
  search: string;
  categoryFilter: string;
  sortBy: "newest" | "oldest" | "name_asc" | "name_desc";
}
```

---

## API Routes

All routes are prefixed with `/api/asset-rt`. They use the standardized response helpers from `@/lib/api-response`:

- **Success**: `{ success: true, data: T }`
- **Error**: `{ success: false, error: { message, code? } }`

### `GET /api/asset-rt`

List assets with full-text search, category filter, sorting, and pagination.

**Query params**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `search` | string | — | Searches `name` and `location` via `ilike` |
| `category` | UUID | — | Filter by `category_id` |
| `sort` | enum | `newest` | `newest`, `oldest`, `name_asc`, `name_desc` |
| `page` | int | `1` | Page number (1-based) |
| `limit` | int | `20` | Items per page (max 50) |

**Response**: `{ assets: AssetItem[], total, page, limit, totalPages }`

### `POST /api/asset-rt`

Create a new asset.

**Body** (JSON):
```json
{
  "name": "Laptop Dell XPS 15",
  "description": "Laptop untuk operasional RT",
  "location": "Ruang IT — Lt. 3",
  "category_id": "uuid-of-elektronik",
  "quantity": 5,
  "unit_label": "Unit",
  "status": "Aktif",
  "condition": "Baik",
  "tags": "Garansi,Elektronik",
  "purchase_date": "2023-01-12",
  "last_maintenance_date": "2025-05-02",
  "notes": ""
}
```

> Tags are submitted as a comma-separated string. The API splits and trims them into a `TEXT[]` array.

### `GET /api/asset-rt/[id]`

Get a single asset by UUID, including its category and creator/updater names.

**Response**: Single `AssetItem`

### `PUT /api/asset-rt/[id]`

Update an existing asset. Only provided fields are updated; missing fields retain their current values.

### `DELETE /api/asset-rt/[id]`

Soft-delete an asset (sets `deleted_at`). Returns `{ deleted: true }`.

### `GET /api/asset-rt/stats`

Hero section aggregate stats. Three parallel `SELECT count(*) head` queries:

| Field | Definition |
|-------|------------|
| `total` | All non-deleted assets |
| `new_this_month` | Assets with `created_at` ≥ first day of current month |
| `needs_maintenance` | Assets where `status = 'Servis'` OR `condition` is `Servis`, `Rusak Berat`, or `Rusak Ringan` |

**Response**: `{ total: number, new_this_month: number, needs_maintenance: number }`

### `GET /api/asset-rt/categories`

Returns all active categories for the default tenant, ordered by `sort_order`.

**Response**: `AssetCategory[]`

---

## File Structure

```
src/
├── app/
│   ├── asset-rt/
│   │   ├── page.tsx                # Server component — fetches initial data
│   │   ├── AssetRtPageClient.tsx   # Client component — interactive UI
│   │   ├── data.ts                 # Server data layer (SSR fetchers)
│   │   └── loading.tsx             # Loading skeleton
│   │
│   └── api/
│       └── asset-rt/
│           ├── route.ts            # GET (list) + POST (create)
│           ├── [id]/route.ts       # GET (detail) + PUT (update) + DELETE
│           ├── stats/route.ts      # GET (hero stats)
│           └── categories/route.ts # GET (filter categories)
│
├── types/
│   └── asset-rt.ts                 # TypeScript interfaces & types
│
└── components/
    └── landing/
        └── FeatureGrid.tsx         # Updated href → "/asset-rt" (modified)
```

### Modified Files

| File | Change |
|------|--------|
| `src/components/landing/FeatureGrid.tsx` | `href` changed from `#asset-rt` → `/asset-rt` |
| `src/components/app-shell.tsx` | Added `/asset-rt` to `APP_ROUTES` for nav visibility |

---

## Architecture

### Data Flow

```
Browser                          Server
  │                                │
  ├─ Initial page load ────────────┤
  │                                ├─ requireAuth() → redirect if no session
  │                                ├─ fetchAssetCategories()
  │                                ├─ fetchAssetStats()
  │                                └─ fetchAssets(filter)
  │                                │
  │◄── SSR: page.tsx ──────────────┘
  │
  ├─ Client: AssetRtPageClient ───┐
  │  ├─ Search (debounced 350ms) ─┤
  │  ├─ Category filter ──────────┤─ apiFetch('/api/asset-rt?...')
  │  ├─ Sort toggle ──────────────┤
  │  └─ Refresh stats ────────────┘
```

### Server Data Layer (`data.ts`)

Follows the same pattern as `kas-rt/data.ts`:

- `requireAuth()` — session guard, redirects to `/auth/login` if missing
- `fetchAssetCategories()` — SSR-safe category fetch
- `fetchAssetStats()` — SSR-safe stats aggregation
- `fetchAssets(params)` — SSR-safe paginated asset fetch with filtering/sorting

All functions use `createServerClient()` from `@/lib/supabase/server` (service role key, no RLS bypass issues).

### Client Component (`AssetRtPageClient.tsx`)

Key behaviors:
- **Debounced search** — 350ms delay to avoid excessive API calls
- **Category chips** — horizontally scrollable, "All" chip resets filter
- **Sort toggle** — cycles through: newest → oldest → A-Z → newest
- **Live stats** — re-fetched alongside every asset query
- **Tag colors** — derived from category (blue/amber/purple/gray/green) or common status keywords (Aktif=green, Servis=amber, Garansi=gray)
- **Empty state** — shows icon + message when no assets match filters

---

## UI/UX Design

The UI faithfully reproduces the approved mobile design mockup:

```
┌──────────────────────────────┐
│  INVENTARIS                👤│  ← Dark hero (#111827)
│  Daftar              ┌─────┐│
│  Aset                │ +   ││  ← Tambah Aset CTA
│                      └─────┘│
│  ┌──────┐ ┌──────┐ ┌──────┐ │
│  │ 124  │ │  8   │ │  3   │ │  ← Stats cards
│  │Total │ │Baru  │ │Perlu │ │
│  └──────┘ └──────┘ └──────┘ │
├──────────────────────────────┤
│ 🔍 Cari nama, lokasi…     ⚙️│  ← Search bar
├──────────────────────────────┤
│ Semua  🔌Elektronik  🪑Furnitur…│  ← Scrollable chips
├──────────────────────────────┤
│ 124 ASET           Terbaru ▼ │  ← List header
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ Laptop Dell XPS 15   5 U│ │  ← Card
│ │ 📍 Ruang IT — Lt. 3     │ │
│ │ 🔵Elektronik 🟢Aktif ⚪G│ │
│ │ ──────────────────────── │ │
│ │ Tgl. pembelian  │ Update│ │
│ │ 12 Jan 2023     │02 Mei │ │
│ ├──────────────────────────┤ │
│ │ 👤 Diperbarui oleh Andi  │ │
│ ├──────────────────────────┤ │
│ │  👁 Detail    │ ✏️ Edit  │ │  ← Actions
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

### Design Values

- **Background**: `#F5F5F3` (light warm gray)
- **Hero**: `#111827` (near-black with white text)
- **Cards**: White with `16px` border-radius, subtle shadow
- **Tag system**: 5 color variants (blue/green/amber/purple/gray) matching the original HTML spec
- **Typography**: Inter/Manrope (project standard), with precise font-size/weight from the mockup
- **Material Symbols**: Used for all icons (search, location, sort, person, visibility, edit, add, close, tune)

---

## Environment & Dependencies

No new environment variables are required. The feature reuses:

- `DEFAULT_TENANT_ID` — scopes categories and assets
- `DEFAULT_COMMUNITY_ID` — scopes assets to the community
- Supabase service role client (`createServerClient()`)
- Standard `apiFetch` wrapper for client-side requests

---

## Next Steps / Future Work

| Task | Priority |
|------|----------|
| **Create asset form** (`/asset-rt/new`) | High |
| **Asset detail page** (`/asset-rt/[id]`) | High |
| **Edit asset form** (`/asset-rt/[id]/edit`) | High |
| **Hard delete** (admin-only purge endpoint) | Low |
| **Asset image/media uploads** (Supabase Storage) | Medium |
| **Export to Excel/PDF** | Medium |
| **Audit log** for asset changes | Medium |
| **Refine RLS policies** to admin-role only for mutations | Low |

---

## Testing the API

### curl Examples

```bash
# List assets (first page)
curl http://localhost:3000/api/asset-rt

# Search by keyword
curl "http://localhost:3000/api/asset-rt?search=laptop"

# Filter by category
curl "http://localhost:3000/api/asset-rt?category=<UUID>"

# Create asset
curl -X POST http://localhost:3000/api/asset-rt \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop Dell XPS 15","quantity":5,"location":"Ruang IT","category_id":"<UUID>"}'

# Get stats
curl http://localhost:3000/api/asset-rt/stats

# Get categories
curl http://localhost:3000/api/asset-rt/categories
```

---

## Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `supabase/migrations/20260520000000_create_rt_assets.sql` | ~150 | Database tables, indexes, RLS, seeds |
| `src/types/asset-rt.ts` | 63 | TypeScript interfaces |
| `src/app/api/asset-rt/route.ts` | 218 | GET list + POST create |
| `src/app/api/asset-rt/[id]/route.ts` | 226 | GET detail + PUT update + DELETE |
| `src/app/api/asset-rt/stats/route.ts` | 74 | GET hero stats |
| `src/app/api/asset-rt/categories/route.ts` | 42 | GET categories |
| `src/app/asset-rt/data.ts` | 222 | Server data layer |
| `src/app/asset-rt/page.tsx` | 56 | Server page |
| `src/app/asset-rt/AssetRtPageClient.tsx` | 477 | Client page UI |
| `src/app/asset-rt/loading.tsx` | 5 | Loading state |

---

**Version**: 1.0.0  
**Last Updated**: 2026-05-20  
**Pattern**: Server Data Layer + Client Page (same as Kas RT)
