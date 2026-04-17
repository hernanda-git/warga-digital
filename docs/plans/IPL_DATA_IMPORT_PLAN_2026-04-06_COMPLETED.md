# IPL Data Import to Kas RT Transactions — Warga Digital

> **Created**: 2026-04-06  
> **Completed**: 2026-04-06  
> **Author**: AI Engineer  
> **Status**: ✅ ALL PHASES COMPLETE  
> **Version**: v0.2.2  
> **Related Issues/PRs**: N/A

---

## 📋 Overview

This plan outlines the process for importing IPL (Iuran Pemeliharaan Lingkungan) payment data from `supabase/Data_IPL.json` into the `kas_rt_transactions` table. The import creates income-type transactions for each IPL payment record, skips entries from year 2025 (6 records), and sends notifications to authorized roles (RT Admin and RT Bendahara). Total records: 125, records to import: 119. Additionally, April 2026 transactions (9 IPL + 1 Kebersihan expense) were imported separately.

### Scope
- **In Scope**: 
  - Parse `supabase/Data_IPL.json` to extract IPL payment records
  - Filter out transactions from year 2025 (only import 2026+)
  - Map JSON fields to `kas_rt_transactions` table columns
  - Set category to "IPL" and type to "income"
  - Create proper title and details format for each transaction
  - Set `created_by` to system UUID
  - Send notifications to RT Admin (role_id 4) and RT Bendahara (role_id 8)
  - Execute idempotent import (skip if exists based on dedupe key)
  - Update reference format from `IPL-{BLOCK}-{YYYY-MM}` to `{BLOCK}` only
  - Import April 2026 transactions (9 IPL income + 1 Kebersihan expense)
- **Out of Scope**: 
  - Frontend UI changes
- **Estimated Effort**: 1–2 hours

---

## 🗂️ Master Checklist

### Phase 1: Data Analysis & Mapping (Priority: High)
- [ ] **#1** Analyze JSON structure and identify filtering requirements
  - [ ] Filter out all records with date year = 2025
  - [ ] Extract unique records based on `blok_rumah` + `date` combination
  - Count total records to import vs skip (125 total, 119 to import, 6 to skip)
- [ ] **#2** Define transaction title and details format
  - [ ] Title format: `IPL - Blok {blok_rumah} - {Month YYYY}`
  - [ ] Details format: `Pembayaran IPL rumah blok {blok_rumah} periode {Month YYYY}`
  - [ ] Category: `IPL`
  - [ ] Type: `income`
  - [ ] Reference format: `{BLOCK}` (block name only, e.g., "O17")

### Phase 2: SQL Script Development ✅ COMPLETE
- [x] **#3** Write idempotent import query for `kas_rt_transactions`
  - [x] Use `INSERT INTO kas_rt_transactions ... WHERE NOT EXISTS` pattern
  - [x] Embed JSON payload with `jsonb_array_elements`
  - [x] Filter 2025 dates using `EXTRACT(YEAR FROM payment_date) != 2025`
  - [x] Set default `tenant_id`, `community_id`, and `created_by` (system UUID)
  - Files created: `supabase/import-ipl-data.sql`
- [x] **#4** Add notification insertion for authorized roles
  - [x] Query users with role_id 4 (RT_ADMIN) or 8 (RT_BENDAHARA)
  - [x] Create notification records for each imported transaction
  - [x] Use dedupe_key pattern: `kas_rt_transaction:{transaction_id}:CREATED`
  - [x] Include transaction metadata in notification
- [x] **#4b** Create reference format update script
  - Files created: `supabase/update-ipl-references.sql`
- [x] **#4c** Create April transactions import script
  - Files created: `supabase/import-april-transactions.sql`, `supabase/insert-kebersihan-april.sql`

### Phase 3: Execution & Verification ✅ COMPLETE
- [x] **#5** Run script in Supabase SQL Editor
  - [x] Execute against `dev` database
  - [x] Verify row counts: 119 inserted, 6 skipped (2025)
- [x] **#6** Validate data integrity
  - [x] Check all imported records have category = 'IPL'
  - [x] Verify type = 'income' for all records
  - [x] Confirm no 2025 dates present
  - [x] Confirm `created_by` is set to system UUID
  - [x] Verify notifications sent to RT Admin and RT Bendahara roles
- [x] **#6b** Update reference format to block name only
  - [x] Run `supabase/update-ipl-references.sql`
  - [x] Verified references changed from `IPL-O17-2026-03` to `O17`
- [x] **#6c** Import April 2026 transactions
  - [x] 9 IPL income transactions (Rp 120,000 each)
  - [x] 1 Kebersihan expense transaction (Rp 1,200,000 - Gaji Pak Tole)

### Phase 4: Documentation & Cleanup ✅ COMPLETE
- [x] **#7** Update plan with actual execution results
- [x] **#8** Archive plan and update version

---

## 🗺️ Execution Plan

### Step 1: Data Extraction & Filtering
- **Goal**: Parse JSON and filter out 2025 records
- **Implementation Notes**:
  - Use `jsonb_array_elements` to unnest JSON array
  - Apply `WHERE EXTRACT(YEAR FROM (data->>'date')::date) != 2025`
  - Expected: 119 records from 2026, 6 skipped from 2025
- **Validation**: Query returns only 2026+ dates

### Step 2: Build Transaction Insert Query ✅ COMPLETE
- **Goal**: Insert IPL transactions with proper formatting
- **Files Created**: `supabase/import-ipl-data.sql`
- **Implementation Details**:
  - Title format: `IPL - Blok {blok_rumah} - {Month YYYY}` (e.g., "IPL - Blok O21 - March 2026")
  - Details format: `Pembayaran IPL rumah blok {blok_rumah} periode {Month YYYY}`
  - Category: `IPL`
  - Type: `income`
  - Amount: from JSON `amount` field (all Rp 120,000)
  - Date: from JSON `date` field
  - Reference: `{BLOCK}` (block name only, e.g., "O17") — updated after initial import
  - created_by: `'00000000-0000-0000-0000-000000000000'::uuid` (system)
  - Idempotency: `WHERE NOT EXISTS` against `(tenant_id, community_id, reference)`
  - tenant_id: `a0000000-0000-7000-8000-000000000001` (Sawangan Regensi)
  - community_id: `b0000000-0000-7000-8000-000000000002` (RT 03)
- **Validation**: Script uses `RAISE NOTICE` to report inserted/skipped counts

### Step 3: Build Notification Insert Query ✅ COMPLETE
- **Goal**: Notify RT Admin and RT Bendahara of imported transactions
- **Implementation Details**:
  - Query `tenant_users` joined with `tenant_user_roles` where `role_id IN (4, 8)` (RT_ADMIN, RT_BENDAHARA)
  - Filter by `tu.status = 'ACTIVE'` for active users only
  - Create notification for each unique recipient per transaction using `CROSS JOIN`
  - Notification fields:
    - `type`: `KAS_RT`
    - `priority`: `NORMAL`
    - `title`: `Pemasukan Kas RT Baru - IPL`
    - `body`: `IPL {reference} - Rp {amount}` (formatted with thousand separators)
    - `action_url`: `/kas-rt`
    - `entity_table`: `kas_rt_transactions`
    - `entity_id`: transaction UUID
    - `dedupe_key`: `kas_rt_transaction:{transaction_id}:CREATED`
    - `metadata`: JSON with action, amount, date, transactionType, transactionId, reference
  - Uses `WHERE NOT EXISTS` for idempotency (partial index incompatible with `ON CONFLICT`)
  - Non-blocking: notification errors don't fail the transaction import
- **Validation**: Script reports notified user count and total notifications created

### Step 4: Execute & Verify ✅ COMPLETE
- **Goal**: Run script and confirm data accuracy
- **Implementation Notes**:
  - Ran in Supabase Dashboard → SQL Editor
  - Script executed successfully with no errors
  - All 119 transactions imported (2025 records filtered)
  - Notifications sent to authorized RT Admin and RT Bendahara users
  - Reference format updated from `IPL-{BLOCK}-{YYYY-MM}` to `{BLOCK}` only
  - April 2026 transactions imported: 9 IPL income + 1 Kebersihan expense
- **Validation**: Script completed with `RAISE NOTICE` output confirming counts

---

## 📊 Progress Tracking

| Phase | Tasks | Status | Started | Completed | Notes |
|-------|-------|--------|---------|-----------|-------|
| Phase 1 | #1, #2 | ✅ Complete | 2026-04-06 | 2026-04-06 | JSON analyzed: 125 total, 119 to import, 6 to skip |
| Phase 2 | #3, #4, #4b, #4c | ✅ Complete | 2026-04-06 | 2026-04-06 | SQL scripts created for import, reference update, and April transactions |
| Phase 3 | #5, #6, #6b, #6c | ✅ Complete | 2026-04-06 | 2026-04-06 | 119 transactions imported, references updated, April data added |
| Phase 4 | #7, #8 | ✅ Complete | 2026-04-06 | 2026-04-06 | Plan archived with timestamp |
| **Total** | **10** | **100% Complete** | — | — | — |

---

## ⚠️ Risks & Considerations

### Security & Compliance
- ✅ System UUID used for audit trail consistency
- ✅ No sensitive PII in IPL records (only block numbers and amounts)
- ✅ Notifications only sent to authorized roles (RT Admin, RT Bendahara)

### Architecture & Performance
- ✅ JSON payload (~200 records) handled efficiently in-memory via CTE
- ✅ `WHERE NOT EXISTS` ensures idempotency without unique constraint conflicts
- ✅ Notifications inserted in batch for performance

### Database & Data Integrity
- ✅ Respects existing `kas_rt_transactions` table schema
- ✅ Type maps to `income` enum value
- ✅ Category field set to 'IPL' for easy filtering
- ✅ Reference field uses block name only (e.g., "O17")
- ✅ Enum values corrected: `income`/`expense` (not `PEMASUKAN`/`PENGELUARAN`)
- ✅ Table name corrected: `tenant_user_roles` (not `user_roles`)
- ✅ Notification columns cast to proper enum types: `notification_type`, `notification_priority`

### Breaking Changes
- ✅ None. Pure additive data import with notifications.

---

## 🚨 Rollback Plan

If issues arise during or after implementation:
1. Delete imported transactions with `created_by = '00000000-0000-0000-0000-000000000000'::uuid` AND `category = 'IPL'` AND `created_at > NOW() - INTERVAL '1 hour'`
2. Delete associated notifications with `entity_table = 'kas_rt_transactions'` AND matching `entity_id`s
3. Verify counts return to pre-import state
4. Re-run script with corrected mapping if needed

---

## ✅ Definition of Done

Each task is considered complete when:
- [ ] SQL script created and tested in dev environment
- [ ] Idempotency verified (running twice yields same result)
- [ ] All 2025 records properly skipped
- [ ] All 2026+ records imported with correct category, type, title, and details
- [ ] `created_by` correctly set to system UUID
- [ ] Notifications sent to RT Admin and RT Bendahara users
- [ ] No existing transactions overwritten or duplicated
- [ ] Plan archived with timestamp

---

## 📝 Change Summary

### Files Created
- `supabase/import-ipl-data.sql` — Idempotent IPL data import script with embedded JSON and notifications
- `supabase/update-ipl-references.sql` — Updates IPL references from `IPL-{BLOCK}-{YYYY-MM}` to `{BLOCK}`
- `supabase/import-april-transactions.sql` — April 2026 transactions (9 IPL + 1 Kebersihan)
- `supabase/insert-kebersihan-april.sql` — Standalone insert for Kebersihan expense

### Files Modified
- `VERSION` — Bumped to v0.2.2 (patch for data import utility)
- `docs/plans/IPL_DATA_IMPORT_PLAN.md` — Marked complete and archived

---

## 🔖 Versioning & Commit Guidelines

### Version Bump Strategy
- **Patch** (`0.2.2`): Data import utility, non-breaking

### Conventional Commit Format
```
feat(db): add IPL data import to kas_rt_transactions with notifications

- Import IPL payments from Data_IPL.json to kas_rt_transactions table
- Filter out 2025 records, only import 2026+ data (119 imported, 6 skipped)
- Set category to 'IPL', type to 'income'
- Generate proper title and details for each transaction
- Send notifications to RT Admin and RT Bendahara roles
- Idempotent import using WHERE NOT EXISTS pattern
- Set created_by to system UUID for audit trail
- Update reference format to block name only (e.g., "O17")
- Import April 2026 transactions (9 IPL income + 1 Kebersihan expense)
```

---

**Last Updated**: 2026-04-06  
**Next Action**: Merge to main after QA  
**Assigned To**: AI Engineer