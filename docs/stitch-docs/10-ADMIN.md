# Admin Page (Admin Dashboard)

## Route
`/admin`

## Purpose
Admin panel for RT management with stats overview and management sections.

---

## Layout Structure

### Container
```tsx
<main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
```

### Sections (top to bottom)

1. **Sticky Header** - Title bar
2. **Hero Section** - Admin profile and metrics
3. **Content Area** - Management grid and activity

---

## Sticky Header

### Container
```tsx
<header className="flex shrink-0 items-center justify-between border-b border-[var(--color-input-border)] bg-app-surface/90 px-4 py-3 backdrop-blur-sm">
```

### Left Side
```tsx
<div className="flex items-center gap-2">
  <ShieldCheckSolidIcon className="h-[18px] w-[18px] text-app-primary" />
  <span className="text-[13px] font-bold tracking-tight text-app-title">Admin Panel</span>
</div>
```

### Right Side
```tsx
<div className="flex items-center gap-1.5">
  <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-surface-alt hover:bg-app-primary-muted">
    <ArrowPathIcon className="h-4 w-4 text-app-body-muted" />
  </button>
  <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-app-surface-alt hover:bg-app-primary-muted">
    <BellOutlineIcon className="h-4 w-4 text-app-body-muted" />
  </button>
</div>
```

---

## Hero Section

### Background
- Background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`
- Padding: `px-4 pb-5 pt-5`
- Decorative blobs: same pattern

### Identity Row
```
┌─────────────────────────────────────────────────────────┐
│ [Avatar Initials] Name Badge                           │
│                 Admin Name                              │
│                 Panel subtitle                          │
└─────────────────────────────────────────────────────────┘
```

### Avatar Container
```tsx
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white/20 text-base font-extrabold text-white backdrop-blur-sm">
  {initials}
</div>
```

### Name Badge
```tsx
<div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-[3px]">
  <ShieldCheckSolidIcon className="h-3 w-3 text-white/80" />
  <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">RT Admin</span>
</div>
```

### Name & Subtitle
```tsx
<h1 className="truncate text-[19px] font-extrabold leading-tight text-white">{adminName}</h1>
<p className="text-[11px] text-white/60">Panel kendali warga & komunitas</p>
```

### Metric Pills (3 columns)
```tsx
<div className="mt-4 grid grid-cols-3 gap-2">
  <MetricPill label="Warga" value={isReady ? String(stats!.totalWarga) : "—"} skeleton={statsLoading} />
  <MetricPill label="Rumah" value={isReady ? String(stats!.totalRumah) : "—"} skeleton={statsLoading} />
  <MetricPill label="Pending" value={isReady ? String(stats!.pendingJoinRequests) : "—"} skeleton={statsLoading} tone="warning" />
</div>
```

#### MetricPill (in Admin context)
```tsx
<div className="flex min-w-[72px] flex-col items-center rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
  <span className="text-[9px] font-semibold uppercase tracking-widest text-white/60">{label}</span>
  {skeleton ? (
    <div className="mt-1 h-[18px] w-10 animate-pulse rounded-md bg-white/20" />
  ) : (
    <span className={`mt-0.5 text-[15px] font-extrabold ${tone === "warning" && value > 0 ? "text-amber-200" : "text-white"}`}>
      {value}
    </span>
  )}
</div>
```

---

## Content Area

### Container
```tsx
<div className="space-y-5 px-4 pb-10 pt-5">
```

---

## Management Grid Section

### Section Label
```tsx
<div className="mb-3 flex items-center justify-between">
  <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-app-body-muted">Kelola</h2>
</div>
```

### Grid (2 columns)
```tsx
<div className="grid grid-cols-2 gap-3">
  {navItems.map((item) => (
    <NavCard key={item.label} {...item} />
  ))}
</div>
```

---

## NavCard Component

### Card Style
```tsx
<Link href={href} className="group relative flex flex-col gap-3 rounded-2xl bg-app-surface p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_2px_12px_rgba(0,0,0,0.05)] transition-all active:scale-[0.97]">
```

### Disabled Style
```tsx
<div className="relative flex flex-col gap-3 rounded-2xl bg-app-surface p-4 opacity-40">
```

### Badge (for pending items)
```tsx
{badge !== undefined && badge > 0 && (
  <span className="absolute right-3 top-3 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold leading-none text-white">
    {badge > 99 ? "99+" : badge}
  </span>
)}
```

### Icon Container
```tsx
<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-primary-muted">
  <Icon className="h-[18px] w-[18px] text-app-primary" />
</div>
```

### Text
```tsx
<div className="min-w-0">
  <p className="text-[13px] font-semibold leading-snug text-app-title">{label}</p>
  <p className="mt-0.5 text-[11px] leading-snug text-app-body-muted">{sublabel}</p>
</div>
```

### Navigation Items
```typescript
const navItems = [
  { label: "Warga", sublabel: "Kelola data penghuni", icon: UsersIcon, href: "/admin/warga" },
  { label: "Blok Rumah", sublabel: "Kelola unit hunian", icon: BuildingOffice2Icon, href: "/admin/blok-rumah" },
  { label: "Kategori Kas RT", sublabel: "Kelola kategori transaksi", icon: Squares2X2Icon, href: "/admin/kas-rt-categories" },
  { label: "Join Request", sublabel: "X menunggu persetujuan", icon: UserPlusIcon, badge: pendingCount, href: "/admin/join-request" },
  { label: "Marketplace", sublabel: "Usaha & layanan warga", icon: ChartBarIcon },
  { label: "Peran & Akses", sublabel: "Hak akses & role warga", icon: ShieldCheckIcon, href: "/admin/roles" },
  { label: "Artikel", sublabel: "Kelola konten & berita", icon: DocumentTextIcon, href: "/admin/articles" },
];
```

---

## Activity Section

### Section Label
```tsx
<div className="mb-3 flex items-center justify-between">
  <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-app-body-muted">Aktivitas Terkini</h2>
  <button className="flex items-center gap-0.5 text-[11px] font-semibold text-app-primary">
    Lihat Semua <ChevronRightIcon className="h-3 w-3" />
  </button>
</div>
```

### Empty Activity State
```tsx
<div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-input-border)] bg-app-surface/60 py-8 text-center">
  <InboxIcon className="h-7 w-7 text-app-body-muted/30" />
  <p className="text-[13px] font-medium text-app-body-muted">Belum ada aktivitas</p>
  <p className="max-w-[180px] text-[11px] text-app-body-muted/60">
    Transaksi dan pendaftaran baru akan muncul di sini.
  </p>
</div>
```

---

## Admin Sub-pages

### /admin/warga
- List all residents
- Search and filter
- View/edit resident details
- Export data

### /admin/blok-rumah
- Manage house blocks
- Add/edit blocks
- View houses per block

### /admin/kas-rt-categories
- Manage transaction categories
- Add/edit categories
- Set default amounts

### /admin/join-request
- List pending requests
- Approve/reject buttons
- Request details

### /admin/roles
- Manage roles
- Assign permissions
- View role members

### /admin/articles
- Manage articles/news
- Create/edit posts
- Schedule publishing

---

## Data Types

### AdminStats
```typescript
interface AdminStats {
  totalWarga: number;
  totalRumah: number;
  kasBalance: number;
  kasBalanceFormatted: string;
  pendingJoinRequests: number;
  activeMarketplaceItems: number;
  totalItemsSold: number;
  wargaDeltaThisMonth: number;
}
```

### ProfileData (admin check)
```typescript
interface ProfileData {
  fullName?: string;
  roles?: Array<{ id: number; name: string; description: string | null }>;
  residences?: Array<{
    roles?: Array<{ id: number; name: string; description: string | null }>;
  }>;
}
```

---

## Access Control

### Admin Check
```typescript
function hasAdminRoleInProfile(profile: ProfileData): boolean {
  if (profile.roles?.some(r => r.name === "admin" || r.name === "RT_ADMIN")) return true;
  if (profile.residences?.some(r => r.roles?.some(role => role.name === "admin"))) return true;
  return false;
}
```

### Redirects
- Not authenticated → `/auth/login?redirect=/admin`
- Not admin → `/landing`

---

## API Endpoints

### Get Admin Stats
```typescript
GET /api/admin/stats
Response: AdminStats
```

### Get Profile (for admin check)
```typescript
GET /api/profile
```

---

## Loading States

### Initial Load
```tsx
if (!hasMounted || !isAuthenticated || checkingAccess) {
  return <PageLoader message="Memuat dashboard admin..." />;
}
```

### Stats Loading
- Skeleton pills during loading
- Refresh spinner when refreshing

### Error State
```tsx
{statsError && (
  <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
    <p className="text-[13px] text-red-600">{statsError}</p>
    <button onClick={() => loadStats(true)} className="shrink-0 text-xs font-semibold text-red-500 underline">
      Coba lagi
    </button>
  </div>
)}
```

---

## Responsive

- Mobile-first (max-width: 430px)
- 2-column grid for nav cards
- Sticky header
- Bottom safe area
