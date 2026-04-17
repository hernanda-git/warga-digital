# Dompet Page (Personal Wallet)

## Route
`/dompet`

## Purpose
Personal wallet for tracking individual income and expenses.

---

## Layout Structure

### Container
```tsx
<main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
```

### Content Area
```tsx
<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
```

### Sections (top to bottom)

1. **Pull-to-refresh indicator**
2. **Balance Card** (gradient hero)
3. **Filter Section**
4. **Transaction List**
5. **Bottom safe area**

---

## Balance Card (Hero)

### Container
```tsx
<section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-[0_20px_40px_-24px_rgba(79,70,229,0.65)]">
```

### Header
```tsx
<p className="text-xs font-medium uppercase tracking-[0.08em] text-indigo-100/90">
  Dompet Saya
</p>
```

### Balance Amount
```tsx
<h1 className="mt-2 text-[1.85rem] font-bold leading-tight">
  {formatRupiah(totals.balance)}
</h1>
```

### Subtitle
```tsx
<p className="mt-1 text-sm text-indigo-100/90">
  Saldo tersedia · {bulan Tahun}
</p>
```

### Income/Expense Grid
```tsx
<div className="mt-4 grid grid-cols-2 gap-3">
  <div className="rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur">
    <p className="text-xs font-medium text-indigo-100/80">Pemasukan</p>
    <p className="mt-1 text-base font-bold text-emerald-300">
      +{formatRupiah(totals.monthIncome)}
    </p>
  </div>
  <div className="rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur">
    <p className="text-xs font-medium text-indigo-100/80">Pengeluaran</p>
    <p className="mt-1 text-base font-bold text-red-300">
      -{formatRupiah(totals.monthExpense)}
    </p>
  </div>
</div>
```

### Savings Rate Indicator
```tsx
<div className="mt-3 rounded-2xl bg-white/95 px-4 py-3 text-indigo-950 backdrop-blur">
  <div className="flex items-center justify-between">
    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-app-body-muted">
      Tingkat tabungan bulan ini
    </p>
    <p className={`text-sm font-bold ${savingsRate >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
      {savingsRate}%
    </p>
  </div>
  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
    <div className={`h-full rounded-full ${savingsRate >= 20 ? 'bg-emerald-500' : 'bg-amber-400'}`}
         style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }} />
  </div>
  <p className="mt-1 text-xs text-app-body-muted">
    Sisa setelah pengeluaran: {formatRupiah(totals.monthIncome - totals.monthExpense)}
  </p>
</div>
```

---

## Filter Section

### Container
```tsx
<section className="mt-4 rounded-3xl border border-indigo-200/60 bg-indigo-50/70 p-4 shadow-[0_16px_34px_-26px_rgba(79,70,229,0.25)]">
```

### Toggle Button
```tsx
<button className="flex flex-1 items-center justify-between rounded-2xl border border-transparent bg-white/70 px-3 py-2 text-left shadow-sm">
  <span className="text-base font-bold text-app-title">Filter Transaksi</span>
  <span className="text-sm font-semibold text-indigo-600">
    {isFilterOpen ? "Tutup" : "Buka"}
  </span>
</button>
```

### Expanded Filter Panel
```tsx
<div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-indigo-100/80 bg-white/90 p-3">
```

#### Transaction Type Select
```tsx
<label className="text-sm font-medium text-app-body">
  Jenis transaksi
  <select value={typeFilter} className="mt-1 w-full rounded-xl border border-indigo-200 bg-indigo-50/40 px-3 py-2 text-sm">
    <option value="all">Semua transaksi</option>
    <option value="income">Pemasukan</option>
    <option value="expense">Pengeluaran</option>
  </select>
</label>
```

#### Date Range (2 columns)
```tsx
<div className="grid grid-cols-2 gap-3">
  <label>
    <span className="text-sm font-medium">Tanggal mulai</span>
    <input type="date" className="mt-1 w-full rounded-xl border border-indigo-200 ..." />
  </label>
  <label>
    <span className="text-sm font-medium">Tanggal akhir</span>
    <input type="date" className="mt-1 w-full rounded-xl border border-indigo-200 ..." />
  </label>
</div>
```

### Last Updated Text
```tsx
<p className="mt-3 text-xs text-app-body-muted">
  Terakhir diperbarui: {refreshedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
</p>
```

---

## Transaction List

### Container
```tsx
<section className="mt-4 space-y-3" aria-label="Daftar transaksi pribadi">
```

### Transaction Card
```tsx
<article className="rounded-2xl border border-indigo-100/60 bg-app-surface p-4 shadow-sm">
```

#### Layout
```
┌─────────────────────────────────────────────────────────┐
│ [Icon] Title                              [Amount +/-]  │
│        [Category Badge]                   Rp XX.XXX     │
│        Date · Note truncated...                          │
└─────────────────────────────────────────────────────────┘
```

#### Icon Container
```tsx
<div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${CATEGORY_COLORS[category]}`}>
  <CategoryIcon className="h-5 w-5" />
</div>
```

#### Category Colors Map
```typescript
const CATEGORY_COLORS = {
  gaji: "bg-emerald-100 text-emerald-700",
  belanja: "bg-orange-100 text-orange-700",
  tagihan: "bg-red-100 text-red-600",
  tabungan: "bg-blue-100 text-blue-700",
  transfer: "bg-purple-100 text-purple-700",
  lainnya: "bg-slate-100 text-slate-600",
};
```

#### Category Icons Map
```typescript
const CATEGORY_ICONS = {
  gaji: BriefcaseIcon,
  belanja: ShoppingCartIcon,
  tagihan: DocumentTextIcon,
  tabungan: BuildingLibraryIcon,
  transfer: ArrowsRightLeftIcon,
  lainnya: CubeIcon,
};
```

#### Title
```tsx
<h3 className="truncate text-sm font-bold text-app-title">{tx.title}</h3>
```

#### Category Badge
```tsx
<span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[category]}`}>
  {CATEGORY_LABELS[category]}
</span>
```

#### Amount
```tsx
<p className={`shrink-0 text-sm font-bold ${isIncome ? "text-emerald-600" : "text-red-600"}`}>
  {isIncome ? "+" : "-"}
  {formatRupiah(tx.amount)}
</p>
```

#### Meta Info
```tsx
<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-body-muted">
  <span>{formattedDate}</span>
  {tx.note && (
    <>
      <span className="inline-block h-1 w-1 rounded-full bg-indigo-200" />
      <span className="truncate">{tx.note}</span>
    </>
  )}
</div>
```

### Empty State
```tsx
<div className="rounded-2xl bg-app-surface p-5 text-center text-sm text-app-body-muted shadow-sm">
  Tidak ada transaksi untuk filter ini.
</div>
```

---

## Pull-to-Refresh

### State
```typescript
const [pullDistance, setPullDistance] = useState(0);
const [isRefreshing, setIsRefreshing] = useState(false);
```

### Touch Handlers
```typescript
const onTouchStart = (event) => {
  if (target.scrollTop === 0) {
    setTouchStartY(event.touches[0]?.clientY ?? null);
  }
};

const onTouchMove = (event) => {
  if (touchStartY == null) return;
  const distance = Math.max(0, currentY - touchStartY);
  setPullDistance(Math.min(88, distance * 0.45));
};

const onTouchEnd = () => {
  if (pullDistance >= 64 && !isRefreshing) {
    refreshData();
  }
};
```

### Visual Indicator
```tsx
<div style={{ height: `${Math.max(32, pullDistance)}px` }}>
  {isRefreshing
    ? "Menyegarkan data dompet..."
    : pullDistance > 48
      ? "Lepaskan untuk refresh"
      : "Tarik untuk refresh"}
</div>
```

---

## Data Types

### Transaction Interface
```typescript
interface WalletTransaction {
  id: string;
  title: string;
  category: CategoryType;
  amount: number;
  type: TransactionType;
  date: string;
  note: string;
}

type TransactionType = "income" | "expense";
type CategoryType = "gaji" | "belanja" | "tagihan" | "tabungan" | "transfer" | "lainnya";
```

### Category Labels
```typescript
const CATEGORY_LABELS: Record<CategoryType, string> = {
  gaji: "Gaji & Pendapatan",
  belanja: "Belanja",
  tagihan: "Tagihan & Utilitas",
  tabungan: "Tabungan",
  transfer: "Transfer",
  lainnya: "Lainnya",
};
```

---

## Utility Functions

### formatRupiah
```typescript
function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
```

### toDateInputValue
```typescript
function toDateInputValue(date: Date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
}
```

---

## Calculations

### Totals
```typescript
const totals = {
  balance: totalIncome - totalExpense,
  totalIncome,
  totalExpense,
  monthIncome, // Current month only
  monthExpense, // Current month only
};
```

### Savings Rate
```typescript
const savingsRate = totals.monthIncome > 0
  ? Math.round(((totals.monthIncome - totals.monthExpense) / totals.monthIncome) * 100)
  : 0;
```

---

## Responsive

- Mobile-first (max-width: 430px)
- Single column layout
- Bottom safe area padding
- Touch-friendly targets
- Pull-to-refresh gesture
