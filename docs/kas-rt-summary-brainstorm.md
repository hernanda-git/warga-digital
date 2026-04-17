# Kas-RT Summary Page Brainstorm

**Goal:** Create a comprehensive, mobile-first summary page for Kas-RT transactions that provides actionable insights for RT administrators.

---

## 🎯 User Stories

### Primary User: Ketua RT / Bendahara RT
1. "I want to see the total income vs expense at a glance"
2. "I want to know which months have the highest/lowest transactions"
3. "I want to see IPL collection progress (who paid, who hasn't)"
4. "I want to track expense trends to plan budget"
5. "I want to export reports for meetings"

---

## 📱 Mobile-First Layout Priority

### Screen Flow (Top to Bottom)

```
┌─────────────────────────────┐
│ 1. HERO - Quick Stats       │  ← Most important, always visible
│   (Income | Expense | Net)  │
├─────────────────────────────┤
│ 2. YEAR SUMMARY CARD        │  ← Annual overview
│   - Total by category       │
│   - Income vs Expense       │
├─────────────────────────────┤
│ 3. MONTHLY CHART            │  ← Visual trend
│   - Bar/Line chart          │
│   - Scrollable horizontally │
├─────────────────────────────┤
│ 4. CATEGORY BREAKDOWN       │  ← Where money goes
│   - Pie chart or list       │
├─────────────────────────────┤
│ 5. MONTHLY DETAIL CARDS     │  ← Expandable per month
│   - Collapsible sections    │
├─────────────────────────────┤
│ 6. QUICK ACTIONS            │  ← Export, Filter
└─────────────────────────────┘
```

---

## 📊 Data Sections

### 1. Hero Quick Stats (Always Visible)
**Purpose:** Immediate financial overview

| Metric | Format | Color |
|--------|--------|-------|
| Total Pemasukan | `Rp X.X jt` | Green |
| Total Pengeluaran | `Rp X.X jt` | Red |
| Saldo Bersih | `Rp X.X jt` | Green/Red based on value |
| Total Transaksi | `XX transaksi` | Neutral |

**Mobile consideration:**
- Use compact numbers (jt = juta, rb = ribu)
- Large, bold numbers for readability
- Color-coded for quick scanning

---

### 2. Year Summary Card
**Purpose:** Annual financial health check

**Data to show:**
- Year selector (dropdown: 2024, 2025, 2026...)
- Total income for selected year
- Total expense for selected year
- Net balance
- Month with highest income
- Month with highest expense
- Average monthly income/expense

**Mobile consideration:**
- Collapsible card (expand on tap)
- Summary numbers first, details on expand

---

### 3. Monthly Trend Chart
**Purpose:** Visualize income/expense patterns

**Chart type options:**
- [ ] **Bar Chart** - Side by side (Income | Expense) per month
- [ ] **Line Chart** - Trend over time
- [ ] **Area Chart** - Filled area for visual impact

**Mobile consideration:**
- Horizontal scroll for 12 months
- Touch to see exact values (tooltip)
- Minimum 3 months visible at once
- Y-axis auto-scale or fixed?

**Questions:**
1. Show all 12 months or just months with data?
2. Group by quarter option?
3. Compare with previous year?

---

### 4. Category Breakdown
**Purpose:** Understand where money comes from and goes

**For Income (Pemasukan):**
- IPL (biggest portion)
- Other income sources

**For Expense (Pengeluaran):**
- Iuran & Kontribusi
- Kebersihan & Lingkungan
- Operasional & Administrasi
- Sosial & Kegiatan Warga
- Pengeluaran Lain

**Visualization options:**
- [ ] **Pie Chart** - Classic, easy to understand
- [ ] **Donut Chart** - Modern, center can show total
- [ ] **Horizontal Bar** - Better for mobile, labels visible
- [ ] **Tree Map** - Proportional rectangles

**Mobile consideration:**
- Horizontal bars work best on narrow screens
- Pie/donut needs minimum width
- Tap category to see details

---

### 5. Monthly Detail Cards
**Purpose:** Drill-down into specific months

**Structure:**
```
┌─────────────────────────────┐
│ ▼ Januari 2026              │  ← Tap to expand
│   Pemasukan: Rp 7.8 jt      │
│   Pengeluaran: Rp 11 jt     │
│   Saldo: -Rp 3.2 jt         │
├─────────────────────────────┤
│   [Expanded View]           │
│   - IPL: 31 tx, Rp 7.8 jt   │
│   - Iuran RW: Rp 6.8 jt     │
│   - Kebersihan: Rp 1.2 jt   │
│   ...                       │
└─────────────────────────────┘
```

**Mobile consideration:**
- Accordion-style (one open at a time?)
- Lazy load details on expand
- Show summary in collapsed state

---

### 6. Statistics & Insights
**Purpose:** Actionable insights

**Potential insights:**
- "IPL collection rate: 85% (17 of 20 houses paid)"
- "Expense increased 15% from last month"
- "Highest expense category: Iuran & Kontribusi"
- "Best performing month: April (Rp X income)"

**Mobile consideration:**
- Card-based layout
- Icon + short text
- Swipeable carousel?

---

## 🎨 UI/UX Considerations

### Color Scheme
| Type | Color | Usage |
|------|-------|-------|
| Income | `green-500` | Positive values, income bars |
| Expense | `red-500` | Negative values, expense bars |
| Neutral | `gray-500` | Labels, secondary info |
| Accent | `blue-500` | Interactive elements |

### Typography
- **Numbers:** Bold, large (for quick scanning)
- **Labels:** Regular, smaller (secondary)
- **Titles:** Semi-bold, medium

### Touch Targets
- Minimum 44px height for buttons
- Charts need touch feedback
- Swipe gestures for navigation

### Loading States
- Skeleton loaders for each section
- Progressive loading (hero first, then details)
- Pull-to-refresh

---

## 🛠️ Technical Considerations

### Data Fetching
- Server-side aggregation (don't fetch all transactions)
- Use existing `/api/kas-rt/summary` endpoint
- Consider caching strategy

### Chart Library
- **Recharts** (already in project)
- Responsive containers
- Touch-friendly tooltips

### Performance
- Lazy load charts
- Virtual scrolling for long lists
- Memoized calculations

---

## ✅ Decisions Made

| Question | Decision |
|----------|----------|
| Chart type for monthly trend | **Bar Chart** (side by side income/expense) |
| Category breakdown | **Horizontal Bars** (better for mobile) |
| IPL tracking | **Percentage collection rate** |
| Monthly cards | **Default to current month**, switch next/previous |
| Comparison | **Compare with previous month** |
| Export formats | **All: PDF, Excel, Image** |

---

## 📐 Final Layout Design

### Mobile Screen Flow

```
┌─────────────────────────────┐
│ HEADER                      │
│ Kas RT Summary               │
│ [← Back]         [Export ▼] │
├─────────────────────────────┤
│ MONTH NAVIGATOR             │
│ [<]  April 2026  [>]        │  ← Switch months
│ vs March 2026 ▲5%           │  ← Comparison with prev month
├─────────────────────────────┤
│ HERO STATS                  │
│ ┌─────────┬─────────┬──────┐│
│ │Income   │Expense  │Net   ││
│ │4.68 jt  │1.52 jt  │3.16 jt││
│ │▲+12%    │▼-8%     │▲+25% ││  ← vs previous month
│ └─────────┴─────────┴──────┘│
├─────────────────────────────┤
│ IPL COLLECTION RATE         │
│ ████████████░░░░  75%       │  ← Progress bar
│ 15 of 20 houses paid        │
├─────────────────────────────┤
│ MONTHLY TREND (Bar Chart)   │
│ ┌─────────────────────────┐ │
│ │    ▓▓  ░░               │ │
│ │ ▓▓ ░░    ▓▓ ░░          │ │  ← Scrollable
│ │Jan Feb Mar Apr May Jun  │ │
│ └─────────────────────────┘ │
│ [Income ▓] [Expense ░]      │
├─────────────────────────────┤
│ CATEGORY BREAKDOWN          │
│ (Horizontal Bars)           │
│ IPL          ████████ 4.68M │
│ Kebersihan   ███ 1.2M       │
│ Operasional  ██ 0.32M       │
├─────────────────────────────┤
│ QUICK STATS                 │
│ • Total: 32 transactions    │
│ • Avg/day: Rp 105K          │
│ • Best day: Apr 3 (Rp 1.08M)│
├─────────────────────────────┤
│ EXPORT ACTIONS              │
│ [PDF] [Excel] [Image]       │
└─────────────────────────────┘
```

---

## 🧩 Component Structure

```
src/
├── app/
│   └── kas-rt/
│       └── summary/
│           └── page.tsx              # Summary page
├── components/
│   └── kas-rt/
│       └── summary/
│           ├── KasRtSummaryHero.tsx      # Hero stats with comparison
│           ├── KasRtMonthNavigator.tsx   # Month switcher
│           ├── KasRtIplProgress.tsx      # IPL collection rate
│           ├── KasRtMonthlyChart.tsx     # Bar chart
│           ├── KasRtCategoryBreakdown.tsx # Horizontal bars
│           ├── KasRtQuickStats.tsx       # Quick statistics
│           ├── KasRtExportButton.tsx     # Export dropdown
│           └── index.ts
├── lib/
│   └── hooks/
│       └── use-kas-rt-summary.ts        # Data fetching hook
```

---

## 📊 Data Requirements

### API Endpoint: `/api/kas-rt/summary`

**Query params:**
- `month` - selected month (e.g., "2026-04")
- `communityId` - RT community ID

**Response:**
```typescript
interface SummaryResponse {
  // Current month
  currentMonth: {
    income: number;
    expense: number;
    net: number;
    transactionCount: number;
    byCategory: {
      category: string;
      amount: number;
      count: number;
    }[];
    dailyBreakdown: {
      date: string;
      income: number;
      expense: number;
    }[];
  };
  
  // Previous month (for comparison)
  previousMonth: {
    income: number;
    expense: number;
    net: number;
  };
  
  // Yearly trend (12 months)
  yearlyTrend: {
    month: string;
    income: number;
    expense: number;
  }[];
  
  // IPL collection
  iplCollection: {
    totalHouses: number;
    paidHouses: number;
    percentage: number;
    unpaidHouses: string[];  // Block numbers
  };
  
  // Quick stats
  stats: {
    avgPerDay: number;
    bestDay: { date: string; amount: number };
    worstDay: { date: string; amount: number };
  };
}
```

---

## 🎨 UI Specifications

### Colors
| Element | Color | Tailwind |
|---------|-------|----------|
| Income | Green | `text-green-600`, `bg-green-500` |
| Expense | Red | `text-red-600`, `bg-red-500` |
| Net Positive | Green | `text-green-600` |
| Net Negative | Red | `text-red-600` |
| Comparison Up | Green | `text-green-500` |
| Comparison Down | Red | `text-red-500` |
| Progress Bar | Blue | `bg-blue-500` |
| Background | Gray | `bg-gray-50` |

### Typography
| Element | Size | Weight |
|---------|------|--------|
| Hero Numbers | `text-2xl` | `font-bold` |
| Hero Labels | `text-sm` | `font-medium` |
| Section Titles | `text-lg` | `font-semibold` |
| Category Labels | `text-sm` | `font-medium` |
| Comparison | `text-xs` | `font-medium` |

### Spacing
| Element | Value |
|---------|-------|
| Section gap | `gap-4` (16px) |
| Card padding | `p-4` (16px) |
| Card radius | `rounded-xl` (12px) |

---

## 📝 Implementation Checklist

### Phase 1: Data Layer
- [ ] Create `/api/kas-rt/summary` endpoint
- [ ] Add comparison logic (current vs previous month)
- [ ] Calculate IPL collection rate
- [ ] Generate yearly trend data

### Phase 2: UI Components
- [ ] KasRtSummaryHero with comparison badges
- [ ] KasRtMonthNavigator with prev/next buttons
- [ ] KasRtIplProgress with progress bar
- [ ] KasRtMonthlyChart (Recharts BarChart)
- [ ] KasRtCategoryBreakdown (horizontal bars)
- [ ] KasRtQuickStats
- [ ] KasRtExportButton dropdown

### Phase 3: Export Features
- [ ] PDF export (using react-pdf or similar)
- [ ] Excel export (using xlsx library)
- [ ] Image export (html2canvas)

### Phase 4: Polish
- [ ] Loading skeletons
- [ ] Error states
- [ ] Pull-to-refresh
- [ ] Mobile touch optimizations

---

## 💡 Additional Ideas

- Add notification when IPL collection drops below 70%
- Show trend indicator (improving/declining)
- Add "Share Report" feature for WhatsApp
- Dark mode support 
