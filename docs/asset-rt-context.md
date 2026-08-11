# Asset RT Module — Codebase Context

## Project
**Warga Digital** — Next.js 15 App Router + React 18 + TypeScript 5 + Tailwind CSS 3 + Supabase (cloud: `gwmxxfqoxjvrfwxhhpin.supabase.co`). Deployed on Vercel. Path alias `@/*` → `./src/*`.

## Module overview
Aset RT (Asset RT) = neighborhood inventory/asset tracking. Manages physical assets (lampu, sensor, kendaraan, mesin, peralatan) owned by the RT. Supports:
- CRUD assets (name, description, location, category, quantity, unit, image, usage status, purchase date, tags, notes)
- Category management with dynamic theming (no stored colours)
- Usage status: `is_used` boolean | null → `Digunakan` / `Tidak Digunakan` / `Tidak Terpakai`
- Image upload via signed R2 URLs (browser → R2 directly)
- Asset history logs (riwayat) — polymorphic log table with 8 log types
- Soft-delete (deleted_at)
- Stats dashboard (total, new this month, in use, not in use)
- Admin-only create/edit/delete; all authenticated users can read

## Architecture & data flow

### Server-side (SSR)
- `src/app/asset-rt/page.tsx` — SSR entry point. Calls `data.ts` fetch functions, passes initial data to `AssetRtPageClient`.
- `src/app/asset-rt/data.ts` — Server data layer. Exports: `requireAuth`, `fetchAssetCategories`, `fetchAssetStats`, `fetchAssets`, `fetchAssetById`, `fetchAssetLogs`. All use `createServerClient()` from `@/lib/supabase/server`.
- `src/app/asset-rt/[id]/page.tsx` — Individual asset detail page (SSR). Loads asset + logs server-side, passes to `AssetDetailClient`.
- `src/app/asset-rt/[id]/edit/page.tsx` — Edit page (client component). Fetches asset + categories client-side.
- `src/app/asset-rt/new/page.tsx` — New asset page (client component). Fetches categories client-side.

### Client-side
- `src/app/asset-rt/AssetRtPageClient.tsx` — Main list page component. Manages search, category filter, sort, stats, infinite-scroll list. Renders asset cards with hero gradient header, search bar, category filter chips, sort toggle, stats cards, and asset list with image, tags, usage status.
- `src/app/asset-rt/[id]/AssetDetailClient.tsx` — Asset detail page. Renders hero strip with category/usage chips, image card, info cards (quantity, purchase date, created/updated), tags, notes, and asset history log entries. Includes "Tambah Riwayat" bottom sheet for logging status changes, part replacements, maintenance, notes, image attachments, and quantity changes.

### Components
- `AssetRtPageClient.tsx` — List page with hero, search, filter chips, stats, asset grid
- `AssetDetailClient.tsx` — Detail page with hero, info cards, tags, notes, history logs
- `AddLogSheet` (inside `AssetDetailClient.tsx`) — Bottom-sheet form for adding log entries with 6 log types
- `LogEntry` (inside `AssetDetailClient.tsx`) — Renders individual history log entries with type-specific icons/colors
- `src/app/asset-rt/loading.tsx` — `<PageLoader message="Memuat daftar aset..." />`
- `src/app/asset-rt/[id]/loading.tsx` — `<PageLoader message="Memuat detail aset..." />`

## Key hooks & utilities
- `src/lib/api-client.ts` — `apiFetch` wrapper: dispatches `auth:unauthorized` event on 401; returns original `Response` for error reading. Drop-in replacement for `fetch`.
- `src/lib/supabase/server.ts` — `createServerClient()` using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (service role JWT, bypasses RLS).
- `src/lib/r2.ts` — `getR2Client()`, `serverUpload()`, `generateSignedUploadUrl()`, `getPublicUrl()`, `getPublicUrlSafe()`, `ALLOWED_ATTACHMENT_TYPES` (images: jpeg, jpg, png, webp, gif, heic, avif), `MAX_IMAGE_FILE_SIZE` (10MB).
- `src/lib/notifications.ts` — `notifyAllActiveUsers` for notifications.
- `src/lib/auth/session.ts` — Custom JWT session via `jose` (365-day expiry). `getSessionFromCookie()` reads from `wd_session` cookie, verifies JWT, checks DB, does sliding-window renewal.
- `src/lib/auth/admin-guard.ts` — `requireAdmin(supabase, userId)` checks `tenant_users` (ACTIVE) + `tenant_user_roles` (role_id IN `ROLE_IDS_ADMIN = [4, 5]`, revoked_at IS NULL)
- `src/stores/auth-store.ts` — Zustand store: `{ user, isAuthenticated, isAdmin, logoUrl }` persisted to localStorage as `warga-auth`. `isAdmin` is checked client-side to show/hide admin-only UI (Tambah/Edit buttons).

## API endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/asset-rt` | List assets with search, category filter, pagination, sorting |
| POST | `/api/asset-rt` | Create asset (admin only) |
| GET | `/api/asset-rt/[id]` | Get single asset by ID |
| PUT | `/api/asset-rt/[id]` | Update asset (admin only) |
| DELETE | `/api/asset-rt/[id]` | Soft-delete asset (admin only) |
| GET | `/api/asset-rt/categories` | List active asset categories |
| GET | `/api/asset-rt/stats` | Aggregate stats (total, new_this_month, in_use, not_in_use) |
| POST | `/api/asset-rt/upload` | Generate signed R2 upload URL (admin only) |
| GET | `/api/asset-rt/[id]/logs` | List asset history logs |
| POST | `/api/asset-rt/[id]/logs` | Create asset history log entry (admin only) |

## POST body fields (`/api/asset-rt`)

### Create asset body
JSON: `name*, description, location, image_url, category_id, quantity, unit_label, is_used ("true"|"false"|"null"), tags (CSV), purchase_date, notes`

### Update asset body (`PUT /api/asset-rt/[id]`)
JSON: `name, description, location, image_url, category_id, quantity, unit_label, is_used, tags, purchase_date, notes` — all optional (partial update). Auto-logs changes via `log_rt_asset_update()` trigger.

### Asset log body (`POST /api/asset-rt/[id]/logs`)
JSON: `log_type*` (one of: `status_change`, `part_replacement`, `maintenance`, `general`, `image_attachment`, `quantity_change`), plus type-specific fields:
- `status_change`: `new_status` ("used"|"unused"|"unset") — auto-updates `rt_assets.is_used`
- `part_replacement`: `part_name*, replaced_with*, notes`
- `maintenance`: `notes*`
- `general`: `notes*` — auto-syncs to `rt_assets.notes`
- `image_attachment`: `image_url*, notes*`
- `quantity_change`: `new_quantity*, notes` — auto-updates `rt_assets.quantity`

## Types (`src/types/asset-rt.ts`)

### AssetCategory
{ id, name, sort_order }

### AssetItem
{ id, tenant_id, community_id, name, description, location, image_url, category_id, category: AssetCategory | null, quantity, unit_label, is_used: boolean | null, tags, purchase_date, notes, created_by, updated_by, created_by_full_name, updated_by_full_name, created_at, updated_at }

### AssetStats
{ total, new_this_month, in_use, not_in_use }

### AssetFilterState
{ search, categoryFilter, sortBy: "newest" | "oldest" | "name_asc" | "name_desc" }

### AssetFormState
{ name, description, location, image_url, category_id, quantity, unit_label, is_used, purchase_date, tags, notes }

### AssetLogType
"status_change" | "part_replacement" | "maintenance" | "general" | "image_attachment" | "quantity_change" | "asset_update" | "expense"

### AssetUsageStatus
"used" | "unused" | "unset"

### AssetLog
{ id, asset_id, tenant_id, log_type, old_status, new_status, part_name, replaced_with, image_url, old_quantity, new_quantity, notes, logged_by, logged_by_full_name, logged_at }

### AssetLogFormState
{ log_type, new_status, part_name, replaced_with, notes, imageFile, imagePreview, new_quantity }

## DB tables

### `rt_asset_categories`
(id, tenant_id, name, sort_order, is_active, created_at)
Seeded categories: Elektronik(1), Furnitur(2), Kendaraan(3), Mesin(4), Peralatan(5), Lainnya(6)

### `rt_assets`
(id, tenant_id, community_id, name, description, location, category_id → rt_asset_categories.id, quantity DEFAULT 1, unit_label DEFAULT 'Unit', image_url, is_used BOOLEAN, tags TEXT[], purchase_date DATE, notes TEXT, created_by → users.id, updated_by → users.id, created_at, updated_at, deleted_at)

### `rt_asset_logs`
(id, asset_id → rt_assets.id, tenant_id, log_type (ENUM: status_change, part_replacement, maintenance, general, image_attachment, quantity_change, asset_update, expense), old_status, new_status, part_name, replaced_with, image_url, old_quantity, new_quantity, notes, logged_by → users.id, logged_at)
- No UPDATE or DELETE — logs are immutable
- `trg_rt_assets_after_update` trigger auto-inserts `asset_update` log rows on rt_assets UPDATE (tracks: name, description, location, image_url, category_id, unit_label, tags, purchase_date, notes changes)

### Related: `kas_rt_transactions`
Extended with `asset_id UUID REFERENCES rt_assets(id)` (nullable, for expense transactions). Added by migration `20260522_add_expense_asset_link.sql`.

## Constants
- `DEFAULT_TENANT_ID` = `a0000000-0000-7000-8000-000000000001` (from `.env` / `seed-ids.ts`)
- `DEFAULT_COMMUNITY_ID` = `b0000000-0000-7000-8000-000000000002`
- `ROLE_IDS_ADMIN` = `[4, 5]` (RT_ADMIN=4, RW_ADMIN=5) — required for create/edit/delete
- `VALID_SORT_OPTIONS` = `["newest", "oldest", "name_asc", "name_desc"]`

## Styling conventions
- Uses CSS variables: `--color-primary` (teal/green), `--color-primary-hover`, `--color-primary-shadow`, `--color-primary-light`, `--color-input-border`, `--color-body-muted`, `--color-app-title`, `--color-app-body`, `--color-app-surface`, `--color-app-surface-alt`, `--app-max-width`, `--color-surface`, `--color-surface-alt`.
- Category colours are dynamic: hash-based from `categoryColor(name)` → 6-theme palette (blue, amber, purple, gray, green, pink)
- Usage colours: Digunakan (green #DCFCE7/#15803D), Tidak Digunakan (amber #FDF0DC/#7A4A0A), Tidak Terpakai (gray #F3F4F6/#6B7280)
- Asset page header: gradient teal background (`linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`)
- Asset cards: white surface with shadow, rounded-2xl
- Log entry icons/colors per type: status_change (blue), part_replacement (amber), maintenance (purple), general (gray), image_attachment (green), quantity_change (purple), asset_update (gray), expense (red)
- Dark mode: class-based (`darkMode: "class"`)
- Custom utility: `.scrollbar-hide`
- Asset image uses `<img>` (not Next/Image) — direct src from R2/Supabase URL
- Responsive: `lg:max-w-4xl lg:mx-auto` container on desktop

## Auth flow
- Custom JWT session via `jose` (365-day expiry). `getSessionFromCookie()` reads from `wd_session` cookie.
- Asset list/detail pages: `requireAuth()` — any authenticated user (SSR redirect to `/auth/login` if no session)
- Asset create/edit/delete: `requireAdmin(supabase, session.userId)` — requires ACTIVE tenant_user with role in `ROLE_IDS_ADMIN = [4, 5]` (RT_ADMIN, RW_ADMIN)
- Asset log creation: also requires admin
- Asset image upload: requires admin
- `apiFetch` dispatches `auth:unauthorized` event on 401; `AuthInterceptor` redirects to login

## Image upload flow (create & edit)
1. Client: user selects image → FileReader generates preview → stores `File` in state
2. On submit: `POST /api/asset-rt/upload` with `{ filename, contentType, size }` → returns `{ uploadUrl, publicUrl, objectKey }`
3. Client: direct `PUT` to R2 `uploadUrl` with file as body, header `x-amz-content-sha256: UNSIGNED-PAYLOAD`
4. Client: sends `publicUrl` as `image_url` in the asset POST/PUT body
5. R2 object key format: `asset-rt/{year}/{month}/{day}/{uuid}-{sanitized-filename}`