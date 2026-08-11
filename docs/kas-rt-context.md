# Kas-RT Module — Codebase Context

## Project
**Warga Digital** — Next.js 15 App Router + React 18 + TypeScript 5 + Tailwind CSS 3 + Supabase (cloud: `gwmxxfqoxjvrfwxhhpin.supabase.co`). Deployed on Vercel. Path alias `@/*` → `./src/*`.

## Module overview
Kas RT (Kas Rukun Tetangga) = neighborhood finance tracking. Tracks income (IPL, etc.) and expense (pengeluaran) transactions per house block, with auto-calculation from per-warga rates, attachment uploads (R2/Supabase), asset linking, soft-delete, notifications, summary charts, and CSV/Excel/PDF export.

## Architecture & data flow

### Server-side (SSR)
- `src/app/kas-rt/page.tsx` — SSR entry point. Calls `data.ts` fetch functions, passes initial data to `KasRtPageClient`.
- `src/app/kas-rt/data.ts` — Server data layer. Exports: `requireAuth`, `fetchKasRtPermissions`, `fetchKasRtCategories`, `fetchKasRtHero`, `fetchKasRtTransactions`, `fetchKasRtHouseStatuses`, `fetchKasRtBlockNames`, `fetchKasRtSummary`. All use `createServerClient()` from `@/lib/supabase/server`.

### Client-side
- `src/app/kas-rt/KasRtPageClient.tsx` — Main client component. Orchestrates:
  - `useKasRtTransactions` hook (data + filtering + pagination)
  - `useKasRtNewTransaction` hook (form state + submission)
  - Renders: `KasRtHero`, `KasRtFilterBar`, `KasRtTransactionList`, `KasRtNewTransactionSheet`, plus filter/download/delete/duplicate dialogs
- `src/lib/hooks/use-kas-rt-transactions.ts` — Transaction data hook: infinite scroll (10/page), server-side filtering (type/category/block/date), pull-to-refresh, permissions check.
- `src/lib/hooks/use-kas-rt-new-transaction.ts` — Form hook: open/close, type/category selection, auto-calculate expenses, duplicate detection, submission via `apiFetch`.

### Components
- `src/components/kas-rt/KasRtNewTransactionSheet.tsx` — Bottom-sheet form. Steps: [type → category] → [amount, date, block/auto-calc] → [title, details, asset, attachments]. Expense requires attachment; auto-calculate uses category details.
- `src/components/kas-rt/KasRtHero.tsx` — Hero with balance, monthly stats, "Catat" button, refresh/download/house-status/summary buttons. Props: `communityName, now, totals, canSubmitTransaction, isRefreshing, onRefresh, onOpenDownload, onOpenForm, onOpenSummary, onOpenHouseStatus`.
- `src/components/kas-rt/KasRtTransactionCard.tsx` — Individual transaction card with attach​ment images/docs, expense breakdown details, edit/delete buttons.
- `src/components/kas-rt/KasRtTransactionList.tsx` — Virtualized list with pull-to-refresh, skeleton, infinite scroll.
- `src/components/kas-rt/KasRtFilterBar.tsx` — Top bar with income/expense/all tabs.
- `src/components/kas-rt/summary/` — Summary page components (chart, category breakdown, IPL progress, quick stats).

## Key hooks & utilities
- `src/lib/hooks/use-kas-rt-new-transaction.ts` — Returns: `isOpen, isEditMode, editingTxId, form, formError, isSubmitting, isIncomeForm, isExpenseForm, visibleCategories, isFormValid, placeholderTemplate, categoryDetails, defaultJumlahWarga, jumlahWarga, useAutoCalculate, expenseBreakdown, fileInputRef, attachmentLabel, hasAttachment, assetId, assetsList, duplicateWarning, openForm, openEditForm, closeForm, setType, setCategoryId, setAmount, setDate, setReference, setTitle, setDetails, handleSubmit, handleDeleteTx, reApplyTemplatesWithBlok, resetFormState`.
- `src/lib/kas-rt-utils.ts` — `formatRupiah, formatRupiahCompact, formatAmountDisplay, parseAmountInput, formatDateIndonesian, getMonthNameIndonesian, applyTemplate, getDefaultKasRtForm, calculateExpenseBreakdown, findDuplicateTransactions, toDateInputValue`.
- `src/lib/kas-rt-constants.ts` — `DEFAULT_INCOME_AMOUNT=120000`, `TRANSACTION_TYPE_OPTIONS = [{value:"income",label:"➕ Pemasukan"},{value:"expense",label:"➖ Pengeluaran"}]`, `FILTER_TYPE_OPTIONS`, `NO_FILE_SELECTED_LABEL`.
- `src/lib/api-client.ts` — `apiFetch` wrapper (dispatches `auth:unauthorized` on 401; returns original Response for error reading).
- `src/lib/supabase/server.ts` — `createServerClient()` using `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (service role JWT, bypasses RLS).
- `src/lib/r2.ts` — `serverUpload`, `getPublicUrl`, `getPublicUrlSafe`, `ALLOWED_ATTACHMENT_TYPES`.
- `src/lib/notifications.ts` — `notifyAllActiveUsers` for KAS_RT notifications.

## API endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/kas-rt/transactions` | Paginated list with filters (type, category, block, startDate, endDate) |
| POST | `/api/kas-rt/transactions` | Create transaction (multipart form) |
| PATCH | `/api/kas-rt/transactions/[id]` | Update transaction |
| DELETE | `/api/kas-rt/transactions/[id]` | Soft-delete |
| GET | `/api/kas-rt/categories` | List active categories |
| GET | `/api/kas-rt/category-details?category_id=xxx` | Category details with rates + default warga count |
| GET | `/api/kas-rt/permissions` | Check submit permission |
| GET | `/api/kas-rt/hero` | Summary/totals (RPC `get_kas_rt_summary`) |
| GET | `/api/kas-rt/houses` | Block names for filter |
| GET | `/api/kas-rt/house-statuses` | House payment status grid |
| GET | `/api/kas-rt/info` | Community info |
| GET/POST | `/api/kas-rt/summary` | Monthly summary data |
| POST | `/api/kas-rt/transactions/report` | Excel/PDF export |
| GET | `/api/asset-rt?limit=200` | Assets list (for expense asset linking) |

## POST body fields (`/api/kas-rt/transactions`)
Multipart form-data: `title, amount, type, date, reference, details, category, asset_id, transaction_details (JSON), attachments (File[])`.
- Expense: attachment required; `reference` not used; `transaction_details` enables auto-calculate (rate_per_warga × jumlah_warga).
- Income: `reference` = house block (e.g., "N2"); no `transaction_details`.
- Both: creates notification via `notifyAllActiveUsers` with `entity_table: "kas_rt_transactions"`.

## Types (`src/types/kas-rt.ts`)
- `TransactionType = "income" | "expense"`
- `TransactionItem` — { id, title, amount, type, date, reference, details, category, attachments, transaction_details, created_at, created_by, created_by_full_name, asset_id, asset_name, is_shadow }
- `KasRtFormState` — { type, categoryId, amount, date, reference, title, details }
- `KasRtCategory` — { id, name, applies_to, title_template, desc_template, sort_order }
- `CategoryDetail` — { id, category_id, name, rate_per_warga, sort_order, is_active }
- `TransactionDetail` — { id, name, rate_per_warga, jumlah_warga, subtotal, sort_order }
- `ExpenseBreakdown` — { items, total, jumlahWarga }
- `KasRtTotals` — { balance, balanceEndOfPrevMonth, thisMonthIncome, thisMonthExpense, thisMonthNet, deltaFromPrevious }

## DB tables
- `kas_rt_transactions` — (id, tenant_id, community_id, title, amount, type, date, reference, details, category, asset_id, created_by, created_at, updated_at, is_shadow, deleted_at)
- `kas_rt_attachments` — (id, transaction_id, file_name, storage_path, mime_type, size_bytes, created_at)
- `kas_rt_transaction_details` — (id, transaction_id, name, rate_per_warga, jumlah_warga, subtotal, sort_order)
- `kas_rt_transaction_categories` — (id, name, applies_to, title_template, desc_template, sort_order, is_active, tenant_id, community_id)
- `kas_rt_transaction_category_details` — (id, category_id, name, rate_per_warga, sort_order, is_active)
- `rt_assets` — (id, name, category_name, tenant_id, community_id, is_active)
- `rt_asset_logs` — (id, asset_id, transaction_id, log_type, notes, payment_amount, payment_date, logged_by, created_at)
- `houses` — (id, name, blok_rumah, status, tenant_id, community_id, is_active)
- `user_houses` — (id, user_id, house_id, tenant_id, status) — joined with `houses` for `community_id`

## Constants
- `DEFAULT_TENANT_ID` = `a0000000-0000-7000-8000-000000000001` (from `.env` / `seed-ids.ts`)
- `DEFAULT_COMMUNITY_ID` = `b0000000-0000-7000-8000-000000000002`
- `ROLE_IDS_CAN_SUBMIT_KAS_RT` = `[4, 8]` (RT_ADMIN=4, RT_BENDAHARA=8)
- `DEFAULT_INCOME_AMOUNT` = `"120000"`

## Styling conventions
- Uses CSS variables: `--color-primary` (teal/green), `--color-primary-hover`, `--color-primary-shadow`, `--color-primary-light`, `--color-input-border`, `--color-body-muted`, `--color-app-title`, `--color-app-body`, `--color-app-surface`, `--color-app-surface-alt`, `--app-max-width`.
- Expense color: red `#dc2626` / `rgba(220,38,38,...)`. Income color: teal `var(--color-primary)`.
- Dark mode: class-based (`darkMode: "class"`).
- Custom utility: `.scrollbar-hide`.
- `applyFocusRing(el)` / `clearFocusRing(el)` for focus styling on border inputs.

## Auth flow
- Custom JWT session via `jose` (7-day expiry). `getSessionFromCookie()` reads from cookie.
- `/api/kas-rt/transactions` POST/PATCH/DELETE: checks `getSessionFromCookie()` → `tenant_users` (status=ACTIVE) → `tenant_user_roles` (in ROLE_IDS_CAN_SUBMIT_KAS_RT, not revoked).
- `apiFetch` dispatches `auth:unauthorized` event on 401 (handled by `AuthInterceptor`).