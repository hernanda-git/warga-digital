# Kas RT Page

## Route
`/kas-rt`

## Purpose
RT fund management page with transaction list, filters, and forms for income/expenses.

---

## Layout Structure

### Container
```tsx
<main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
```

### Scrollable Container
```tsx
<div className="flex-1 overflow-y-auto overscroll-contain">
```

### Sections (top to bottom)

1. **KasRtHero** - Header with stats and actions
2. **KasRtFilterBar** - Quick filter pills
3. **KasRtTransactionList** - Transaction items
4. **Bottom sheets** (overlays)
5. **Bottom safe area**

---

## KasRtHero Component

### Hero Section
- Background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`
- Decorative blobs: same pattern
- Padding: `px-4 pb-5 pt-5`

#### Header Row
```
┌─────────────────────────────────────────────────────────┐
│ [Back] Judul Halaman                    [Refresh] [More] │
└─────────────────────────────────────────────────────────┘
```

- Back button: `ChevronLeftIcon` → `/landing`
- Refresh: `ArrowPathIcon`

#### Title Area
- Community name: `text-[10px] uppercase tracking-widest text-white/70`
- Title: "Kas RT 03" or community name
- Subtitle: formatted date

#### Metric Pills (3 columns)
```tsx
<div className="grid grid-cols-3 gap-2 mt-4">
  <MetricPill label="Saldo" value={formatRupiah(totals.balance)} />
  <MetricPill label="Pemasukan" value={formatRupiah(totals.income)} />
  <MetricPill label="Pengeluaran" value={formatRupiah(totals.expense)} />
</div>
```

#### MetricPill Component
```tsx
<div className="flex flex-col items-center rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur">
  <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">Label</span>
  <span className="text-[15px] font-extrabold text-white">Value</span>
</div>
```

#### Action Buttons
- "Ringkasan" - navigates to `/kas-rt/summary`
- "Status Rumah" - navigates to `/kas-rt/house-status`
- "Unduh" - opens download sheet
- "+ Tambah" - opens transaction form

---

## KasRtFilterBar Component

### Container
- Sticky below hero or at top
- Background: `bg-app-surface`
- Padding: `px-4 py-3`
- Border: `border-b border-[var(--color-input-border)]`

### Filter Pills
```tsx
<div className="flex items-center gap-2">
  <FilterPill 
    label="Semua" 
    active={typeFilter === "all"}
    onClick={() => setTypeFilter("all")}
  />
  <FilterPill 
    label="Pemasukan"
    active={typeFilter === "income"}
    onClick={() => setTypeFilter("income")}
  />
  <FilterPill 
    label="Pengeluaran"
    active={typeFilter === "expense"}
    onClick={() => setTypeFilter("expense")}
  />
</div>
```

### FilterPill Style
- Default: `rounded-full px-4 py-2 bg-app-surface-alt text-app-body-muted`
- Active: `bg-app-primary text-white`
- Font: `text-[13px] font-semibold`

### Advanced Filter Button
- Icon: `FunnelIcon` or `AdjustmentsHorizontalIcon`
- Badge: number of active filters
- Opens: `KasRtFilterSheet`

---

## KasRtTransactionList Component

### Container
- Scrollable list
- Pull-to-refresh supported
- `min-h-0 flex-1`

### Pull-to-Refresh
- Trigger distance: 64px
- Visual indicator with arrow/spinner
- Text: "Tarik untuk refresh" / "Lepaskan untuk refresh" / "Menyegarkan..."

### Transaction Item Card
```tsx
<article className="rounded-2xl bg-app-surface p-4 shadow-sm mb-3">
  {/* Content */}
</article>
```

#### Transaction Layout
```
┌─────────────────────────────────────────────────────────┐
│ [Icon] Title                          [Amount] [Arrow]  │
│        Category · Date                  +/-Rp XX.XXX   │
│        Note (truncated)                                │
└─────────────────────────────────────────────────────────┘
```

#### Icon Container
- Size: `h-10 w-10`
- Border radius: `rounded-xl`
- Income: green tint
- Expense: red tint
- Icon: based on category

#### Title
- Text: transaction title/reference
- Font: `text-sm font-bold text-app-title`

#### Meta Info
- Category badge: small pill
- Date: formatted Indonesian date
- Note: truncated if long

#### Amount
- Income: `text-emerald-600 font-bold`
- Expense: `text-red-600 font-bold`
- Format: `+Rp XX.XXX` or `-Rp XX.XXX`

#### Action Arrow
- `ChevronRightIcon` or swipe to reveal
- Opens edit/delete options

### Empty State
- Icon: `WalletIcon` or `ReceiptIcon`
- Message: "Belum ada transaksi"
- CTA: "Tambah Transaksi"

### Grouped by Date
- Date header: "Hari Ini", "Kemarin", or full date
- Sticky date headers optional

---

## KasRtFilterSheet (Bottom Sheet)

### Container
```tsx
<>
  <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
  <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full rounded-t-[2rem] bg-app-surface">
```

### Header
- Drag handle: `h-1 w-10 rounded-full bg-[var(--color-input-border)]`
- Title: "Filter Transaksi"
- Close button: `XMarkIcon`

### Filter Fields

#### Date Range
- Start date input
- End date input
- "Bulan ini" quick select button

#### Category
- Dropdown or multi-select
- List of available categories

#### Blok Rumah
- Dropdown with house blocks
- "Semua Blok" option

### Actions
- Reset: secondary button
- Apply: primary button

---

## KasRtDownloadSheet (Bottom Sheet)

### Header
- Title: "Unduh Laporan"

### Fields

#### Date Range
- Start date
- End date

#### Category (optional)
- Dropdown

#### Blok (optional)
- Dropdown

#### Format
- Radio or toggle: "Excel (.xlsx)" / "PDF"

### Download Button
- Text: "Unduh Laporan"
- Loading state: spinner + "Mengunduh..."

### Error Display
- Below button if download fails

---

## KasRtTransactionForm (Bottom Sheet)

### Multi-Step Form (3 steps)

#### Step 1: Basic Info

**Type Toggle**
```tsx
<div className="flex rounded-2xl bg-app-surface-alt p-1">
  <button className={`flex-1 rounded-xl py-2.5 ${isIncome ? 'bg-app-primary text-white' : ''}`}>
    Pemasukan
  </button>
  <button className={`flex-1 rounded-xl py-2.5 ${isExpense ? 'bg-red-500 text-white' : ''}`}>
    Pengeluaran
  </button>
</div>
```

**Reference/Description**
- Input field
- Placeholder based on type

**Date**
- Date picker
- Default: today

**Category (for expense)**
- Dropdown with categories
- Auto-fills amount if known

#### Step 2: Amount & Details

**Amount Input**
- Large number input
- Currency format
- Auto-calculate toggle for collective expenses

**Auto-Calculate Mode**
- Shows "Jumlah Warga" field
- Calculates: amount = categoryPrice × jumlahWarga
- Shows breakdown

**Note (optional)**
- Textarea
- Optional attachment upload

#### Step 3: Review & Submit

**Summary Card**
- Type (with color)
- Reference
- Date
- Category
- Amount
- Note

**Submit Button**
- Text: "Simpan Transaksi"
- Loading: "Menyimpan..."

---

## KasRtDuplicateWarningDialog

### Dialog Style
```tsx
<div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
<div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2.5rem)] rounded-3xl bg-app-surface p-6">
```

### Content
- Icon: `ExclamationTriangleIcon` in amber
- Title: "Transaksi Duplikat?"
- List of similar transactions found
- Options:
  - "Tetap Simpan" - proceed
  - "Batal" - cancel

---

## KasRtDeleteConfirmDialog

### Dialog Style
- Danger variant
- Red accent

### Content
- Title: "Hapus Transaksi?"
- Transaction summary
- Warning about irreversibility
- Buttons: "Batal" / "Hapus"

---

## KasRtTransactionListSkeleton

### Skeleton Items
```tsx
<div className="animate-pulse">
  <div className="rounded-2xl bg-app-surface p-4 mb-3">
    <div className="flex gap-3">
      <div className="h-10 w-10 rounded-xl bg-app-surface-alt" />
      <div className="flex-1">
        <div className="h-4 w-32 rounded bg-app-surface-alt" />
        <div className="h-3 w-20 mt-2 rounded bg-app-surface-alt" />
      </div>
      <div className="h-5 w-24 rounded bg-app-surface-alt" />
    </div>
  </div>
</div>
```

---

## State Management

### useKasRtTransactions Hook
```typescript
interface KasRtTransactionsState {
  transactions: TransactionItem[];
  categories: Category[];
  communityName: string;
  canSubmitTransaction: boolean;
  isPageLoading: boolean;
  isTransactionsLoading: boolean;
  isRefreshing: boolean;
  filterState: FilterState;
  totals: { balance: number; income: number; expense: number };
  // Methods
  setFilterState: (state) => void;
  refreshData: () => Promise<void>;
  // etc.
}
```

### useKasRtForm Hook
Manages transaction form state including:
- Form type (income/expense)
- Step navigation
- Field values
- Validation
- Submission
- Duplicate checking

---

## API Endpoints

### Get Transactions
```typescript
GET /api/kas-rt/transactions
Query: ?start=DATE&end=DATE&category=X&block=Y
```

### Create Transaction
```typescript
POST /api/kas-rt/transactions
Body: { type, reference, date, category_id, amount, note?, attachment_url? }
```

### Update Transaction
```typescript
PUT /api/kas-rt/transactions/:id
```

### Delete Transaction
```typescript
DELETE /api/kas-rt/transactions/:id
```

### Get Categories
```typescript
GET /api/kas-rt/categories
```

### Download Report
```typescript
GET /api/kas-rt/transactions/report?start=X&end=Y&format=excel
Response: Binary file (xlsx or pdf)
```

---

## Responsive

- Mobile-first (max-width: 430px)
- Bottom sheets for forms and filters
- Touch-friendly filter pills
- Swipe gestures for transaction actions
- Pull-to-refresh
