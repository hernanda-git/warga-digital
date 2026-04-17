# Organisasi Page (Organization Structure)

## Route
`/organisasi`

## Purpose
Displays RT organization structure with member cards, roles, and WhatsApp contact integration.

---

## Layout Structure

### Container
```tsx
<main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
```

### Sections (top to bottom)

1. **Hero Section** - Header with stats
2. **Content Area** - Scrollable role sections
3. **Bottom safe area**

---

## Hero Section

### Background
- Background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`
- Decorative blobs: same pattern
- Padding: `px-4 pb-5 pt-5`
- Text: white

### Header Row
```
┌─────────────────────────────────────────────────────────┐
│ Badge + Title                        [Refresh] [Edit]  │
└─────────────────────────────────────────────────────────┘
```

### Badge
```tsx
<div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-[3px]">
  <ShieldCheckSolidIcon className="h-3 w-3 text-white/80" />
  <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">
    RT 03
  </span>
</div>
```

### Title
```tsx
<p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
  Warga Digital · RT 03
</p>
<h1 className="text-lg font-extrabold leading-tight text-white">
  Struktur Organisasi
</h1>
```

### Action Buttons
- Refresh: `ArrowPathIcon` in `h-9 w-9 rounded-xl bg-white/20`
- Edit (if admin): `PencilSquareIcon` link to `/organisasi/manage`

### Metric Pills (3 columns)
```tsx
<div className="mt-4 grid grid-cols-3 gap-2">
  <MetricPill label="Peran" value={totalRoles} skeleton={loading} />
  <MetricPill label="Anggota Aktif" value={totalMembers} skeleton={loading} />
  <MetricPill label="Posisi Kosong" value={vacantCount} skeleton={loading} warning />
</div>
```

#### MetricPill with Warning
```tsx
<span className={`text-[15px] font-extrabold ${warning && value > 0 ? "text-amber-200" : "text-white"}`}>
  {value}
</span>
```

---

## Content Area

### Container
```tsx
<div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
```

### Intro Label (before roles)
```tsx
<div className="mb-4 flex items-center gap-3">
  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" 
       style={{ background: "var(--color-primary-muted)" }}>
    <UserGroupIcon className="h-[18px] w-[18px]" style={{ color: "var(--color-primary)" }} />
  </div>
  <div>
    <p className="text-[13px] font-semibold text-app-title">Pengurus RT 03</p>
    <p className="mt-0.5 text-[11px] text-app-body-muted">
      Ketuk kartu anggota aktif untuk menghubungi via WhatsApp
    </p>
  </div>
</div>
```

### Role Sections
Each role renders as a `RoleSection` component with staggered animation:

```tsx
<section style={{ animation: `fadeInUp 0.35s ease both`, animationDelay: `${index * 60}ms` }}>
```

---

## RoleSection Component

### Section Header
```tsx
<div className="mb-2.5 flex items-center justify-between px-0.5">
  <h2 className="text-[11px] font-bold uppercase tracking-[0.07em] text-app-body-muted">
    {role.title}
  </h2>
  <span className="rounded-full bg-app-primary-muted px-2.5 py-0.5 text-[10px] font-bold text-app-primary">
    {activeCount} aktif
  </span>
</div>
```

### Member Grid (2 columns)
```tsx
<div className="grid grid-cols-2 gap-3">
  {role.members.map((member) => (
    <MemberCard key={member.id} member={member} />
  ))}
</div>
```

---

## MemberCard Component

### Container Style
```tsx
<div className="flex flex-col overflow-hidden rounded-3xl bg-app-surface shadow-[0_4px_20px_rgba(0,40,5,0.08)] transition-all">
```

### Photo Area (Square)
```tsx
<div className="relative aspect-square w-full overflow-hidden">
```

#### With Image
```tsx
<Image src={profilePictureUrl} alt={displayName} fill className="object-cover object-center" />
```

#### Without Image (Avatar)
```tsx
<div className="flex h-full w-full items-center justify-center" 
     style={{ background: "var(--color-primary-muted)", color: "var(--color-primary)" }}>
  <span className="text-5xl font-extrabold">{getInitials(displayName)}</span>
</div>
```

#### Vacant State
```tsx
<div className="flex h-full w-full items-center justify-center bg-amber-50 text-amber-300">
  <span className="text-5xl font-bold">—</span>
</div>
```

#### Vacant Badge
```tsx
<span className="absolute right-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500">
  Kosong
</span>
```

#### WhatsApp Pill
```tsx
<div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full shadow-md" 
     style={{ background: "var(--color-primary)" }}>
  <ChatBubbleLeftRightIcon className="h-4 w-4 text-white" />
</div>
```

### Info Strip
```tsx
<div className="border-t px-3 py-2.5" style={{ borderColor: "var(--color-input-border)" }}>
  <p className={`truncate text-[13px] font-bold ${isVacant ? "text-app-body-muted" : "text-app-title"}`}>
    {displayName}
  </p>
  {isVacant ? (
    <p className="mt-0.5 text-[10px] font-medium text-amber-400">Belum terisi</p>
  ) : (
    <p className="mt-0.5 truncate text-[10px] text-app-body-muted">{blockName}</p>
  )}
</div>
```

### Click Behavior
- If vacant: returns plain card
- If active: renders as `Link` to WhatsApp URL
```tsx
<Link href={getWhatsAppLink(member.whatsappNumber)} target="_blank" rel="noopener noreferrer">
  {card}
</Link>
```

### Hover Effect
```tsx
className="block rounded-3xl transition-all active:scale-[0.97] hover:shadow-[0_8px_28px_rgba(0,40,5,0.14)]"
```

---

## SkeletonCard Component

### Structure
```tsx
<div className="animate-pulse overflow-hidden rounded-3xl bg-app-surface shadow-[0_4px_20px_rgba(0,40,5,0.06)]">
  <div className="aspect-square w-full bg-app-surface-alt" />
  <div className="border-t px-3 py-2.5">
    <div className="h-3.5 w-20 rounded-full bg-app-surface-alt" />
    <div className="mt-1.5 h-2.5 w-14 rounded-full bg-app-surface-alt" />
  </div>
</div>
```

---

## Empty State

```tsx
<div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--color-input-border)] bg-app-surface/60 py-10 text-center">
  <BuildingOffice2Icon className="h-8 w-8 text-app-body-muted/30" />
  <p className="text-[13px] font-medium text-app-body-muted">Belum ada data organisasi</p>
  <p className="max-w-[180px] text-[11px] text-app-body-muted/60">
    Pengurus RT belum menambahkan struktur organisasi.
  </p>
  {canManageOrganisation && (
    <Link href="/organisasi/manage" className="mt-1 text-xs font-bold text-app-primary">
      Tambah sekarang
    </Link>
  )}
</div>
```

---

## Data Types

### Organization Tree
```typescript
interface OrganisationTreeApi {
  roles: OrganisationRoleApi[];
}
```

### Role
```typescript
interface OrganisationRoleApi {
  id: string;
  title: string;
  members: OrganisationMemberApi[];
}
```

### Member
```typescript
interface OrganisationMemberApi {
  id: string;
  userId: string | null;
  fullName: string;
  profilePictureUrl: string | null;
  whatsappNumber: string | null;
  blockName: string | null;
}
```

---

## API Endpoints

### Get Organization Tree
```typescript
GET /api/organisation
Response: OrganisationTreeApi
```

### Get Permissions
```typescript
GET /api/organisation/permissions
Response: { canManageOrganisation: boolean }
```

---

## Utility Functions

### getInitials
```typescript
function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}
```

### getWhatsAppLink
```typescript
function getWhatsAppLink(phoneNumber: string): string {
  const clean = phoneNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${clean}`;
}
```

---

## Calculations

### Stats
```typescript
const totalRoles = tree?.roles.length ?? 0;
const totalMembers = tree?.roles.reduce(
  (acc, role) => acc + role.members.filter((m) => m.userId != null).length, 0
);
const vacantCount = tree?.roles.reduce(
  (acc, role) => acc + role.members.filter((m) => m.userId == null).length, 0
);
```

---

## Responsive

- Mobile-first (max-width: 430px)
- 2-column grid for member cards
- Square aspect ratio for photos
- Touch-friendly tap targets
- Staggered fade-in animation
