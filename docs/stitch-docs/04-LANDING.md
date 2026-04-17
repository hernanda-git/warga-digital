# Landing Page (Home)

## Route
`/landing`

## Purpose
Main dashboard for authenticated users. Shows profile header, feature grid, announcements, and marketplace sections.

---

## Layout Structure

### Container
```tsx
<div className="flex h-100 min-h-0 flex-col bg-app-surface-alt">
```

### Main Sections (top to bottom)

1. **LandingHeader** - Profile header with wallet
2. **FeatureGrid** - Quick access tiles
3. **LandingSection (Info Warga)** - Announcements
4. **LandingSection (Umkm RT 03)** - Marketplace/UMKM
5. **LandingSection (Jasa RT 03)** - Services
6. **Bottom safe area padding**

---

## LandingHeader Component

### Hero Section
- Background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`
- Decorative blobs: same pattern as other pages
- Padding: `px-4 pb-5 pt-5`

#### Content Row
```
┌─────────────────────────────────────────────────────────┐
│ [Avatar] Name                        [Saldo] [Bell Icon] │
└─────────────────────────────────────────────────────────┘
```

### Avatar
- Component: `Avatar` from `@/components/ui`
- Shows profile picture or initials
- Size: typically 48-56px

### User Info
- Name: `text-sm font-extrabold text-white`
- Blok rumah: `text-[11px] text-white/70`

### Saldo Display
- Container: `flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur`
- Icon: wallet icon
- Amount: `text-sm font-bold text-white`
- Format: Indonesian Rupiah (Rp XX.XXX)

### Notification Bell
- Button: `h-9 w-9 rounded-xl bg-white/20`
- Icon: `BellIcon` (outline)
- Badge: unread count if > 0

---

## FeatureGrid Component

### Grid Layout
- 3-column grid: `grid grid-cols-3`
- Gap: `gap-3` or `gap-4`
- Padding: `px-4 py-5`

### Feature Tiles (9 items)
Each tile is a `Link` or button with:

#### Container
- Background: `bg-app-surface`
- Border radius: `rounded-2xl` or `rounded-xl`
- Padding: `p-3` or `p-4`
- Shadow: subtle `shadow-[0_1px_4px_rgba(0,0,0,0.04)]`
- Icon container: `h-9 w-9 rounded-xl` with muted primary background
- Icon: primary color
- Label: `text-[11px] font-semibold text-app-title`

### Feature List
1. **Administrasi** - Document icon
2. **Kas RT** - Building icon
3. **IPL** - Receipt icon
4. **Jual Beli** - Shopping cart icon
5. **Jasa** - Wrench icon
6. **Event** - Calendar icon
7. **Organisasi** - Users icon
8. **Informasi** - Info icon
9. **Emergency** - Phone icon

### Tile States
- Default: normal appearance
- Hover: slight scale or shadow increase
- Active: `active:scale-[0.97]`

---

## LandingSection Component

### Container
```tsx
<LandingSection title="Info Warga">
  {/* Content */}
</LandingSection>
```

### Header
- Title: `text-base font-bold text-app-title`
- Optional right slot (view all link)
- Padding: `px-4`

### Content Area
- Conditional rendering based on data
- Either actual content or EmptyState

---

## Info Warga Section (Announcements)

### ResidentPostsSection Component
- Container: horizontal scrollable or vertical list
- Each post: `rounded-2xl bg-app-surface p-4`

#### Post Card
- Title: `text-sm font-bold text-app-title`
- Excerpt: `text-[13px] text-app-body-muted line-clamp-2`
- Date: `text-[11px] text-app-body-muted`
- Image (optional): rounded corners

---

## EmptyState Component

### Structure
```tsx
<div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-input-border)] bg-app-surface/60 py-8 text-center">
  <Icon className="h-7 w-7 text-app-body-muted/30" />
  <p className="text-[13px] font-medium text-app-body-muted">Title</p>
  <p className="max-w-[180px] text-[11px] text-app-body-muted/60">Description</p>
</div>
```

### Variants
- `ANNOUNCEMENTS`: megaphone icon, "Belum ada info warga"
- `UMKM`: shopping bag, "Belum ada usaha warga"
- `JASA`: wrench, "Belum ada layanan jasa"

---

## HorizontalCardStrip Component

### Container
- Horizontal scroll: `overflow-x-auto scrollbar-none`
- Gap: `gap-3`
- Padding: `px-4`

### Cards
- Min width: typically 280-300px
- Horizontal layout: image left, content right
- `rounded-2xl bg-app-surface`
- Shadow: subtle

---

## Jasa RT 03 Section

### Grid Layout
```tsx
<div className="grid grid-cols-1 gap-3 px-4">
  {jasaServices.map((service) => (
    <JasaCard key={service.id} service={service} />
  ))}
</div>
```

### JasaCard Component
- Layout: horizontal or vertical card
- Image: service photo
- Title: service name
- Provider: resident name
- Price: formatted currency
- Rating (optional): stars
- Status badge: "Tersedia" / "Tidak Tersedia"
- Contact button: WhatsApp link

---

## Data Hooks

### useProfileData
Returns:
- `headerProfile`: { name, profilePictureUrl, blokRumah }
- `walletBalance`: formatted string
- `isReady`: boolean

### useMarketplaceData
Returns:
- `umkmItems`: array for HorizontalCardStrip
- `jasaItems`: array for second section
- `isLoaded`: boolean
- `hasUmkmContent`, `hasJasaContent`: booleans

### useAnnouncementsData
Returns:
- `items`: announcement posts
- `isLoaded`: boolean
- `hasContent`: boolean

### useJasaServicesData
Returns:
- `jasaServices`: array of service cards
- `isLoaded`: boolean
- `hasJasaContent`: boolean

---

## Notification Count

Fetched from API:
```typescript
GET /api/notifications?count=true
Response: { unreadCount: number }
```

---

## Loading State

### PageLoader
- Full page overlay
- Centered spinner
- Message: "Memuat..."

### Skeleton
- Animated pulse effect
- Placeholder shapes matching content layout

---

## Authentication Guard

```typescript
useEffect(() => {
  if (!hasMounted) return;
  if (!isAuthenticated) {
    router.replace(ROUTES.LOGIN); // "/auth/login"
  }
}, [hasMounted, isAuthenticated, router]);
```

---

## Responsive

- Mobile-first design
- 3-column grid for features
- Single column for service cards
- Horizontal scroll for strips
- Touch-friendly targets
