# `kas_rt_transactions` Table Documentation

## 1. Overview
The `kas_rt_transactions` table serves as the core financial ledger for RT (Rukun Tetangga) community cash flow management. It records all income (`income`) and expenses (`expense`) related to community operations, environmental maintenance fees (IPL), cleaning services, and other local financial activities.

This table supports:
- Multi-tenant architecture (`tenant_id`)
- Community-level segregation (`community_id`)
- Soft deletes (`deleted_at`)
- Audit trails (`created_by`, `updated_by`, timestamps)
- Role-based notifications upon transaction creation

---

## 2. Schema Definition

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unique transaction identifier |
| `tenant_id` | `UUID` | `NOT NULL`, `FK → tenants(id)` | Parent tenant/organization |
| `community_id` | `UUID` | `NOT NULL`, `FK → communities(id)` | Specific RT/RW community |
| `title` | `VARCHAR(200)` | `NOT NULL` | Short descriptive title (localized) |
| `amount` | `NUMERIC(14,2)` | `NOT NULL`, `CHECK (amount > 0)` | Transaction value (always positive) |
| `type` | `kas_rt_tx_type` | `NOT NULL` | `'income'` or `'expense'` |
| `date` | `DATE` | `NOT NULL` | Transaction effective date |
| `reference` | `VARCHAR(50)` | Nullable | Block/unit identifier or reference code |
| `details` | `TEXT` | Nullable | Detailed description (Indonesian localization) |
| `category` | `VARCHAR(255)` | Nullable | Free-text tag (e.g., `IPL`, `Kebersihan`) |
| `created_at` | `TIMESTAMPTZ` | Nullable | Record creation timestamp |
| `created_by` | `UUID` | Nullable | Actor ID (`000...000` for system) |
| `updated_at` | `TIMESTAMPTZ` | Nullable | Last modification timestamp |
| `updated_by` | `UUID` | Nullable | Last modifier ID |
| `deleted_at` | `TIMESTAMPTZ` | Nullable | Soft delete timestamp |

---

## 3. Enums & Types

### `kas_rt_tx_type`
```sql
-- Active values in production (may differ from initial migration definition)
'income'   -- Pemasukan (Income)
'expense'  -- Pengeluaran (Expense)
```
> ⚠️ **Note**: Initial schema migrations may define `PEMASUKAN`/`PENGELUARAN`, but the live database and application logic use `'income'` and `'expense'`. Always use the English lowercase values for inserts/updates.

---

## 4. Indexes & Performance

| Index Name | Columns | Condition | Purpose |
|------------|---------|-----------|---------|
| `idx_kas_rt_tx_category` | `(category)` | None | Fast filtering by category |
| `idx_kas_rt_transactions_not_deleted` | `(tenant_id, community_id, date)` | `WHERE deleted_at IS NULL` | Optimized active ledger queries |
| `idx_kas_rt_transactions_deleted` | `(deleted_at)` | `WHERE deleted_at IS NOT NULL` | Efficient soft-delete audits |

---

## 5. Row Level Security (RLS)

```sql
ALTER TABLE kas_rt_transactions ENABLE ROW LEVEL SECURITY;

-- Block anonymous/public access
CREATE POLICY "Kas RT transactions: no anon access" 
  ON kas_rt_transactions FOR ALL TO anon 
  USING (false) WITH CHECK (false);
```
> 🔒 **Access Control**: Only authenticated users with appropriate tenant/community roles can query or modify records. Application-level policies (not shown here) typically restrict access based on `tenant_id` and `community_id` ownership.

---

## 6. Data Format Standards

### Title Format
| Source | Format | Example |
|--------|--------|---------|
| **System-Generated** | `IPL Bulan {Month_ID}` | `IPL Bulan April` |
| **User-Generated** | `IPL - Blok {Block} - {Month_ID} {Year}` | `IPL - Blok O10 - April 2026` |
| **Expenses** | Custom descriptive | `Biaya Kebersihan April` |

### Details Field
- **Language**: Indonesian (Bahasa Indonesia)
- **Pattern**: `Pembayaran IPL rumah blok {Block} periode {Month_ID} {Year}`
- **Localization**: English month names are automatically converted to Indonesian during system imports.

### Reference Field
- Contains block/unit identifiers (e.g., `O10`, `N10`, `K25`, `L9`)
- Used for quick visual grouping and reporting by location

### Category Field
- Free-text tags for grouping transactions
- Common values: `IPL`, `Kebersihan`, `Keamanan`, `Listrik`, `Air`

---

## 7. Import Workflow & Best Practices

### System User ID
All automated/bulk imports must use:
```sql
created_by = '00000000-0000-0000-0000-000000000000'
```

### Data Source & Filtering
- **Source**: JSON files (e.g., `Data_IPL.json`)
- **Filtering Rule**: Skip historical records (e.g., 2025), import current/future periods (2026+)
- **Idempotency**: Use `WHERE NOT EXISTS` or `ON CONFLICT` checks before insertion to prevent duplicates

### Month Localization Script
System imports initially contain English month names. Run post-import localization:
```sql
UPDATE public.kas_rt_transactions
SET
  title = regexp_replace(..., 'January', 'Januari', 'g'),
  details = regexp_replace(..., 'January', 'Januari', 'g')
WHERE created_by = '00000000-0000-0000-0000-000000000000'
  AND (title ~* 'January|February|...' OR details ~* '...');
```
*(Full script: `supabase/migrations/update-ipl-indonesian-months.sql`)*

### Title Standardization
After localization, simplify system-generated titles:
```sql
UPDATE public.kas_rt_transactions
SET title = 'IPL Bulan ' || 
  CASE EXTRACT(MONTH FROM date)
    WHEN 1 THEN 'Januari' WHEN 2 THEN 'Februari' ...
  END
WHERE created_by = '00000000-0000-0000-0000-000000000000'
  AND category = 'IPL';
```
*(Full script: `supabase/migrations/update-ipl-title-format.sql`)*

### Notifications
After successful import, trigger notifications to authorized roles:
- `RT_ADMIN` (role_id 4)
- `RT_BENDAHARA` (role_id 8)
- Use `dedupe_key` in `notifications` table to prevent duplicates
- Target `recipient_user_id` via `tenant_user_roles.user_id`

---

## 8. Example Records

### Income (IPL)
```sql
(
  id: '01a39e86-ad1c-4769-bbf7-6e8b053ebce5',
  tenant_id: 'a0000000-0000-7000-8000-000000000001',
  community_id: 'b0000000-0000-7000-8000-000000000002',
  title: 'IPL Bulan April',
  amount: 120000.00,
  type: 'income',
  date: '2026-04-01',
  reference: 'O10',
  details: 'Pembayaran IPL rumah blok O10 periode April 2026',
  category: 'IPL',
  created_by: '00000000-0000-0000-0000-000000000000'
)
```

### Expense (Cleaning)
```sql
(
  id: '0de242ba-cbf7-4721-93e9-eee40d500ee2',
  title: 'Biaya Kebersihan April',
  amount: 1200000.00,
  type: 'expense',
  date: '2026-04-02',
  reference: 'Gaji pak tole',
  details: 'Gaji kebersihan bulan April - Pak Tole',
  category: 'Kebersihan',
  created_by: '019d3e6e-40b9-7b05-9542-645061a738ed' -- User ID
)
```

---

## 9. Related Tables & Dependencies

| Table | Relationship | Purpose |
|-------|--------------|---------|
| `tenants` | `tenant_id → id` | Multi-tenant isolation |
| `communities` | `community_id → id` | RT/RW community grouping |
| `tenant_user_roles` | Indirect via `created_by` | Role-based access & notifications |
| `notifications` | Triggered on insert | Alert admins/treasurers |
| `kas_rt_transaction_categories` | Optional lookup | Standardized category management |

---

## 10. Migration & Maintenance Scripts

| Script | Purpose |
|--------|---------|
| `supabase/migrations/update-ipl-indonesian-months.sql` | Convert English months to Indonesian in system records |
| `supabase/migrations/update-ipl-title-format.sql` | Standardize titles to `IPL Bulan {Month}` format |
| `supabase/import-ipl-data.sql` | Main idempotent IPL import from JSON |
| `supabase/import-april-transactions.sql` | Handle specific monthly income records |
| `supabase/insert-kebersihan-april.sql` | Handle cleaning expense records |

### Quick Verification Query
```sql
SELECT 
  COUNT(*) FILTER (WHERE type = 'income') AS total_income,
  COUNT(*) FILTER (WHERE type = 'expense') AS total_expense,
  COUNT(*) FILTER (WHERE created_by = '00000000-0000-0000-0000-000000000000') AS system_generated,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS soft_deleted
FROM kas_rt_transactions
WHERE tenant_id = 'a0000000-0000-7000-8000-000000000001';
```

---

## 11. Troubleshooting & Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `function replace(text) does not exist` | Missing second argument in `REPLACE()` | Use `REPLACE(col, 'old', 'new')` or `regexp_replace()` |
| Duplicate records on re-import | Missing idempotency check | Add `WHERE NOT EXISTS (SELECT 1 FROM kas_rt_transactions WHERE reference = ... AND date = ...)` |
| Notification delivery failure | Wrong `recipient_user_id` mapping | Join `tenant_user_roles` to get `user_id`, not `tenant_users.id` |
| Month names remain in English | Localization script not run | Execute `update-ipl-indonesian-months.sql` post-import |

---

*Last Updated: 2026-04-06*  
*Maintained by: Warga Digital Engineering Team*