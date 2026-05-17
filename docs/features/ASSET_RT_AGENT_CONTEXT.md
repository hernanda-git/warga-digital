# Asset RT — Agent Context File

> **Purpose**: Everything another agent needs to work on the Asset RT feature.
> **No prior context assumed** — read this first before editing any Asset RT code.

---

## What Is Asset RT?

A mobile-first inventory management module inside the **Warga Digital** app. It lets RT (neighbourhood association) members log, track, and browse physical assets owned by the community — laptops, furniture, vehicles, tools, etc.

It lives at `/asset-rt` in the app and is linked from the landing page's feature grid ("Asset RT" card).

---

## Quick Facts

| Item | Value |
|------|-------|
| Page route | `/asset-rt` |
| API prefix | `/api/asset-rt` |
| DB migration | `supabase/migrations/20260520000000_create_rt_assets.sql` |
| Types | `src/types/asset-rt.ts` |
| SSR data layer | `src/app/asset-rt/data.ts` |
| Server page | `src/app/asset-rt/page.tsx` |
| Client component | `src/app/asset-rt/AssetRtPageClient.tsx` |
| Loading state | `src/app/asset-rt/loading.tsx` |
| Feature grid link | `src/components/landing/FeatureGrid.tsx` |
| Nav registration | `src/components/app-shell.tsx` (added to `APP_ROUTES`) |

---

## Database

### `rt_asset_categories`

```sql
CREATE TABLE rt_asset_categories (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  sort_order SMALLINT    NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
```

Seeded with 6 categories: **Elektronik, Furnitur, Kendaraan, Mesin, Peralatan, Lainnya**.

No `icon` or `color` stored in DB — the frontend assigns colours dynamically via a deterministic hash of the category name (6-theme palette).

### `rt_assets`

```sql
CREATE TABLE rt_assets (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id  UUID         NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  location      VARCHAR(200),
  image_url     TEXT,
  category_id   UUID         REFERENCES rt_asset_categories(id) ON DELETE SET NULL,
  quantity      INT          NOT NULL DEFAULT 1,
  unit_label    VARCHAR(30)  NOT NULL DEFAULT 'Unit',
  is_used       BOOLEAN,
  tags          TEXT[],
  purchase_date DATE,
  notes         TEXT,
  created_by    UUID         REFERENCES users(id),
  updated_by    UUID         REFERENCES users(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ
);
```

**Key design decisions:**
- **`is_used`** is a nullable boolean — the simplest possible status model:
  - `true` → "Digunakan"
  - `false` → "Tidak Digunakan"
  - `null` → "Tidak Terpakai"
- No `condition`, `last_maintenance_date`, or complicated status enum.
- **Soft-delete** via `deleted_at` — nothing is ever permanently deleted.
- **`image_url`** stores an absolute URL (Supabase Storage / R2 / any external image). The frontend renders it as a banner on the card when present.

### Indexes

- `(tenant_id, community_id)` — primary lookup
- `(category_id)` — filter-by-category
- `(deleted_at)` WHERE NOT NULL — soft-delete filtering
- `(tenant_id, community_id, deleted_at)` WHERE NULL — active queries

### RLS

Both tables allow SELECT/INSERT/UPDATE/DELETE for any authenticated user who has an active `tenant_users` record in the same tenant. Refinement to admin-only roles is a future task.

---

## TypeScript Types (`src/types/asset-rt.ts`)

```typescript
interface AssetCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface AssetItem {
  id: string;
  tenant_id: string;
  community_id: string;
  name: string;
  description: string | null;
  location: string | null;
  image_url: string | null;
  category_id: string | null;
  category: AssetCategory | null;
  quantity: number;
  unit_label: string;
  is_used: boolean | null;
  tags: string[];
  purchase_date: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_by_full_name: string | null;
  updated_by_full_name: string | null;
  created_at: string;
  updated_at: string | null;
}

interface AssetStats {
  total: number;
  new_this_month: number;
  in_use: number;
  not_in_use: number;
}

interface AssetFilterState {
  search: string;
  categoryFilter: string;   // category UUID or "all"
  sortBy: "newest" | "oldest" | "name_asc" | "name_desc";
}

interface AssetFormState {
  name: string;
  description: string;
  location: string;
  image_url: string;
  category_id: string;
  quantity: string;
  unit_label: string;
  is_used: string;          // "true" | "false" | "null"
  purchase_date: string;
  tags: string;             // comma-separated, API splits into array
  notes: string;
}
```

---

## API Routes

All routes return the standardised shape from `@/lib/api-response`:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { message: string, code?: string } }
```

### `GET /api/asset-rt`

List assets with filtering, search, sort, pagination.

**Query params:**

| Param | Default | Description |
|-------|---------|-------------|
| `search` | — | Searches `name` and `location` via `ilike` |
| `category` | — | Filter by `category_id` (UUID) |
| `sort` | `newest` | One of: `newest`, `oldest`, `name_asc`, `name_desc` |
| `page` | `1` | 1-based page number |
| `limit` | `20` | Items per page (max 50) |

**Response:** `{ assets: AssetItem[], total: number, page: number, limit: number, totalPages: number }`

### `POST /api/asset-rt`

Create a new asset.

**Body (JSON):**
```json
{
  "name": "Laptop Dell XPS 15",
  "description": "Laptop operasional RT",
  "location": "Ruang IT — Lt. 3",
  "image_url": "https://...",
  "category_id": "uuid-of-elektronik",
  "quantity": 5,
  "unit_label": "Unit",
  "is_used": "true",
  "tags": "Garansi, Baru",
  "purchase_date": "2023-01-12",
  "notes": ""
}
```

**Important:** `is_used` accepts `"true"` → `true`, `"false"` → `false`, any other value (including missing) → `null`. Tags are a comma-separated string that the API splits into a `TEXT[]` array.

### `GET /api/asset-rt/[id]`

Single asset detail (includes category, creator/updater names).

**Response:** Single `AssetItem`

### `PUT /api/asset-rt/[id]`

Partial update. Only provided fields change; missing fields stay as-is.

`is_used` accepts `"true"`, `"false"`, or `"null"` to explicitly set it back to null.

### `DELETE /api/asset-rt/[id]`

Soft-delete. Sets `deleted_at` timestamp. Returns `{ deleted: true }`.

### `GET /api/asset-rt/stats`

Hero section stats — 4 parallel count queries:

| Field | Counts |
|-------|--------|
| `total` | All non-deleted assets |
| `new_this_month` | Created this calendar month |
| `in_use` | `is_used = true` |
| `not_in_use` | `is_used = false` OR `is_used IS NULL` |

### `GET /api/asset-rt/categories`

All active categories, ordered by `sort_order`.

**Response:** `AssetCategory[]`

---

## Architecture & Data Flow

```
Browser                         Server
  │                               │
  ├─ GET /asset-rt ───────────────┤
  │                               ├─ requireAuth() → 401 redirect
  │                               ├─ fetchAssetCategories()   ← Supabase
  │                               ├─ fetchAssetStats()        ← Supabase
  │                               └─ fetchAssets(filter)      ← Supabase
  │                               │
  │◄── SSR render ────────────────┘
  │     (page.tsx → AssetRtPageClient)
  │
  ├─ Client interactivity ───────┐
  │  ├─ Search (350ms debounce) ─┤
  │  ├─ Category chip tap ───────┤── apiFetch("/api/asset-rt?...")
  │  ├─ Sort toggle ─────────────┤
  │  └─ Auto-refresh stats ──────┘
```

### Server Data Layer (`data.ts`)

Four functions, all using `createServerClient()` (Supabase service role):

```typescript
requireAuth()                           // redirects to /auth/login if no session
fetchAssetCategories() → AssetCategory[]
fetchAssetStats() → AssetStats | null
fetchAssets({ search?, category?, sort?, page?, limit? }) → FetchAssetsResult
```

### Client Component (`AssetRtPageClient.tsx`)

Key behaviours:
- **Debounced search**: 350ms delay after the user stops typing
- **Category chips**: Horizontally scrollable; "Semua" resets filter; chips are `AssetCategory[]` from API
- **Sort toggle**: Cycles Terbaru → Terlama → A-Z → Terbaru
- **Live stats**: Refetched on every filter change so the hero stays accurate
- **Image banner**: When `image_url` is present, renders a 160px `object-cover` banner at the top of each card
- **Empty state**: Icon + message when no assets match
- **Tag rendering**: Category name (themed colour) + usage status badge + up to 3 custom tags

---

## UI Structure (Mobile-first)

```
┌──────────────────────────────────┐
│  INVENTARIS                   👤 │  Dark hero (#111827)
│  Daftar                  ┌─────┐ │
│  Aset                    │ +   │ │  "Tambah Aset" → /asset-rt/new
│                          └─────┘ │
│  ┌─────┐ ┌─────┐ ┌──────┐       │
│  │ 124 │ │  8  │ │ 42   │       │  Total | Baru bulan ini | Digunakan
│  └─────┘ └─────┘ └──────┘       │
├──────────────────────────────────┤
│ 🔍 Cari nama, lokasi…         ⚙️│  Search (debounced)
├──────────────────────────────────┤
│ Semua  Elektronik  Furnitur  …  │  Scrollable chips
├──────────────────────────────────┤
│ 124 ASET              Terbaru ▼ │  Sort toggle
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ [image_url banner if set]    │ │  160px image
│ ├──────────────────────────────┤ │
│ │ Laptop Dell XPS 15      5 U │ │  Name + qty chip
│ │ 📍 Ruang IT — Lt. 3        │ │  Location
│ │ 🔵Elektronik 🟢Digunakan    │ │  Tags: category + usage + custom
│ │ ─────────────────────────── │ │
│ │ Tgl. pembelian   │ Update   │ │
│ │ 12 Jan 2023      │02 Mei '25│ │
│ ├──────────────────────────────┤ │
│ │ 👤 Diperbarui oleh Andi      │ │  User + relative time
│ ├──────────────────────────────┤ │
│ │  👁 Detail    │  ✏️ Edit     │ │  Actions
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### Design tokens used

- Page background: `#F5F5F3`
- Hero: `#111827` with white text and `white/[0.06]` stat boxes
- Cards: white, `rounded-2xl` (16px), subtle shadow
- Category badges: deterministic palette of 6 theme colours (blue, amber, purple, gray, green, pink)
- Usage badges: green for "Digunakan", amber for "Tidak Digunakan", gray for "Tidak Terpakai"
- Icons: Google Material Symbols (`material-symbols-outlined`)
- Font sizes follow the mockup precisely (28px heading, 22px stats, 15px card title, etc.)

---

## Server Page (`page.tsx`)

```typescript
// App Router page — async server component
export default async function AssetRTPage({ searchParams }) {
  const session = await requireAuth();
  const params = await searchParams;
  // Build filter state from URL params
  // Fetch categories, stats, and assets in parallel
  // Pass all as props to AssetRtPageClient
}
```

The initial fetch uses `limit: 20` so the client can load more via the API later.

---

## Key Patterns & Conventions

### API Response format
Always use helpers from `@/lib/api-response`:
- `successResponse(data, status?)` 
- `errorResponse(message, status?, code?)`
- `unauthorizedResponse()`
- `badRequestResponse(message, code?)`
- `notFoundResponse()`

### Auth
- Server: `getSessionFromCookie()` → `requireAuth()` redirects to `/auth/login`
- Client: `apiFetch` from `@/lib/api-client` (dispatches `auth:unauthorized` event on 401)

### Supabase
- Server: `createServerClient()` from `@/lib/supabase/server` (service role key)
- Client: Not used directly — all client data fetches go through the API routes via `apiFetch`

### Tenant scoping
All queries filter by `DEFAULT_TENANT_ID` and `DEFAULT_COMMUNITY_ID` from `@/lib/constants/seed-ids`. These come from `.env` with sensible fallbacks.

---

## Common Tasks for an Agent

### Adding a new field to the asset table

1. Add column in `supabase/migrations/20260520000000_create_rt_assets.sql`
2. Add field in `src/types/asset-rt.ts` (`AssetItem` and `AssetFormState`)
3. Map it in the API responses (`route.ts` and `[id]/route.ts` and `data.ts`)
4. Handle it in POST/PUT body parsing
5. Display it in `AssetRtPageClient.tsx`

### Adding a new API endpoint

Follow the pattern in `src/app/api/asset-rt/stats/route.ts`:
- Export `async function GET/POST/PUT/DELETE`
- Use `getSessionFromCookie()` + `createServerClient()` 
- Return with `successResponse()` / `errorResponse()`

### Adding a new category chip colour

Edit `THEME_COLORS` array in `AssetRtPageClient.tsx`. The hash-based lookup automatically distributes colours.

### Changing the usage status labels

Edit `getUsageLabel()` and `getUsageColor()` in `AssetRtPageClient.tsx`.

---

## Future Work (Not Yet Implemented)

These don't exist yet — agents should reference this list before assuming something is missing:

| Feature | Notes |
|---------|-------|
| **Create form** (`/asset-rt/new`) | Not built; "Tambah Aset" button has no target yet |
| **Detail page** (`/asset-rt/[id]`) | Not built; "Detail" button has no target yet |
| **Edit form** (`/asset-rt/[id]/edit`) | Not built; "Edit" button has no target yet |
| **Image upload** | `image_url` is manual URL entry; no upload widget yet |
| **Hard delete** (admin purge) | Only soft-delete exists |
| **Export** (Excel/PDF) | Not built |
| **Audit log** | Not built |
| **Admin-role RLS refinement** | Currently permissive; should be scoped to RT_ADMIN later |

---

## Files Index

| File | What it does |
|------|-------------|
| `supabase/migrations/20260520000000_create_rt_assets.sql` | Creates categories + assets tables, indexes, RLS, seed data |
| `src/types/asset-rt.ts` | All TypeScript interfaces |
| `src/app/api/asset-rt/route.ts` | GET (list) + POST (create) |
| `src/app/api/asset-rt/[id]/route.ts` | GET (detail) + PUT (update) + DELETE (soft) |
| `src/app/api/asset-rt/stats/route.ts` | GET (hero aggregate stats) |
| `src/app/api/asset-rt/categories/route.ts` | GET (all categories for filter chips) |
| `src/app/asset-rt/data.ts` | SSR-safe Supabase fetchers |
| `src/app/asset-rt/page.tsx` | Server page (composition, initial data fetch) |
| `src/app/asset-rt/AssetRtPageClient.tsx` | Full interactive client UI |
| `src/app/asset-rt/loading.tsx` | Loading skeleton |
| `src/components/landing/FeatureGrid.tsx` | Links to `/asset-rt` (modified) |
| `src/components/app-shell.tsx` | Added `/asset-rt` to `APP_ROUTES` |

---

> **Agent note**: Always run `npx tsc --noEmit` after making changes to verify type safety. The project uses `@/` path alias pointing to `./src/`.
