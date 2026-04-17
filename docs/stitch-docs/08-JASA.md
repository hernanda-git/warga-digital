# Jasa Page (Community Services)

## Route
`/jasa`

## Purpose
Community services marketplace listing with search, filters, and CRUD operations for services.

---

## Layout Structure

### Container
```tsx
<main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
```

### Scrollable Content
```tsx
<div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
```

### Sections (top to bottom)

1. **Hero Section** - Header with stats and add button
2. **Filters Section** - Search and filter controls
3. **Content Area** - Service cards or empty state
4. **Pagination** (if needed)
5. **Modals** - Create, Edit, Detail overlays

---

## Hero Section

### Background
- Background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`
- Decorative blobs: same pattern
- Padding: `px-4 pb-5 pt-5`

### Header Row
```
┌─────────────────────────────────────────────────────────┐
│ [Back] Title                           [+ Tambah]     │
└─────────────────────────────────────────────────────────┘
```

### Back Button
```tsx
<button onClick={() => router.push("/landing")} 
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
  <ChevronLeftIcon className="h-4 w-4 text-white" />
</button>
```

### Title Area
```tsx
<p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
  Layanan Jasa Warga
</p>
<h1 className="truncate text-lg font-extrabold leading-tight text-white">
  {communityName}
</h1>
```

### Add Button
```tsx
<button onClick={() => setIsCreateModalOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-[11px] font-bold text-primary backdrop-blur-sm">
  <PlusIcon className="h-3.5 w-3.5" />
  Tambah
</button>
```

### Stats Strip (3 columns)
```tsx
<div className="mt-4 grid grid-cols-3 gap-2">
  {[
    { label: "Total", value: isLoading ? "—" : totalServices },
    { label: "Tersedia", value: isLoading ? "—" : availableCount },
    { label: "Kategori", value: isLoading ? "—" : categories.length },
  ].map(({ label, value }) => (
    <div className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-white/60">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-white">{value}</p>
    </div>
  ))}
</div>
```

---

## Filters Section

### Container
```tsx
<section className="px-4 pt-4">
  <JasaFilters {...props} />
</section>
```

### JasaFilters Component

#### Search Input
```tsx
<div className="relative mb-3">
  <input type="search" 
         value={searchQuery}
         onChange={(e) => onSearchChange(e.target.value)}
         placeholder="Cari layanan..."
         className="w-full rounded-2xl border bg-white px-4 py-3 pl-10 text-sm" />
  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-app-body-muted" />
</div>
```

#### Category Chips
```tsx
<div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
  <Chip label="Semua" selected={!selectedCategory} onClick={() => onCategoryChange(null)} />
  {categories.map((cat) => (
    <Chip key={cat.id} label={cat.name} selected={selectedCategory === cat.id} 
          onClick={() => onCategoryChange(cat.id)} />
  ))}
</div>
```

#### Chip Style
```tsx
<div className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold transition-all cursor-pointer
  ${selected ? "bg-app-primary text-white" : "bg-app-surface text-app-body-muted border border-[var(--color-input-border)]"}`}>
  {label}
</div>
```

#### Status Toggle
```tsx
<div className="mt-3 flex gap-2">
  <ToggleButton label="Tersedia" active={selectedStatus === true} onClick={() => onStatusChange(true)} />
  <ToggleButton label="Semua" active={selectedStatus === null} onClick={() => onStatusChange(null)} />
</div>
```

#### Days Filter
```tsx
<div className="mt-3">
  <p className="text-[11px] font-bold uppercase text-app-body-muted mb-2">Hari Operasional</p>
  <div className="flex flex-wrap gap-2">
    {["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu", "tanggal_merah"].map((day) => (
      <button key={day} onClick={() => onDaysChange({...selectedDays, [day]: !selectedDays[day]})}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${selectedDays[day] ? "bg-app-primary text-white" : "bg-app-surface text-app-body-muted"}`}>
        {dayLabel(day)}
      </button>
    ))}
  </div>
</div>
```

---

## Content Section

### Container
```tsx
<section className="px-4 pb-6 pt-4">
```

### Results Info
```tsx
<div className="mb-3 flex items-center justify-between">
  <p className="text-xs text-app-body-muted">
    {services.length} dari {totalServices} layanan
  </p>
  {hasActiveFilters && (
    <button onClick={handleResetFilters} className="text-xs font-semibold text-app-primary">
      Reset filter
    </button>
  )}
</div>
```

### Service Cards List
```tsx
<div className="flex flex-col gap-3">
  {services.map((service) => (
    <JasaCard key={service.id} service={service} onClick={() => handleViewService(service.id)}
              onContact={() => handleContact(service)} />
  ))}
</div>
```

---

## JasaCard Component

### Card Container
```tsx
<div className="rounded-2xl bg-app-surface p-4 shadow-sm transition-all">
```

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ [Image] Title + Provider                    [Status]    │
│        Category · Rating                    [Contact]   │
│        Price Range                           [Arrow]    │
└─────────────────────────────────────────────────────────┘
```

### Image
```tsx
<div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
  <Image src={service.imageUrl} alt={service.name} fill className="object-cover" />
</div>
```

### Title
```tsx
<h3 className="text-sm font-bold text-app-title">{service.name}</h3>
```

### Provider
```tsx
<p className="text-[12px] text-app-body-muted">oleh {service.providerName}</p>
```

### Category Badge
```tsx
<span className="inline-block rounded-full bg-app-primary-muted px-2 py-0.5 text-[10px] font-semibold text-app-primary">
  {service.categoryName}
</span>
```

### Rating (if available)
```tsx
<div className="flex items-center gap-1 mt-1">
  <StarIcon className="h-3 w-3 text-amber-400" />
  <span className="text-[11px] text-app-body-muted">{service.rating || "Baru"}</span>
</div>
```

### Price
```tsx
<p className="mt-1 text-[13px] font-bold text-app-primary">
  {formatRupiah(service.minPrice)} - {formatRupiah(service.maxPrice)}
</p>
```

### Status Badge
```tsx
<span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${service.is_available ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
  {service.is_available ? "Tersedia" : "Tidak"}
</span>
```

### Contact Button
```tsx
<button onClick={(e) => { e.stopPropagation(); onContact(); }}
        className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-white">
  <ChatBubbleLeftRightIcon className="h-4 w-4" />
  <span className="text-[11px] font-bold">Hubungi</span>
</button>
```

### Click Arrow
```tsx
<ChevronRightIcon className="h-5 w-5 text-app-body-muted" />
```

---

## Empty States

### No Services
```tsx
<div className="rounded-3xl px-6 py-10 text-center" style={{ background: "color-mix(in srgb, var(--color-primary) 5%, var(--color-surface))", border: "2px dashed color-mix(in srgb, var(--color-primary) 28%, transparent)" }}>
  <div className="mb-3 flex items-center justify-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl" 
         style={{ background: "color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))" }}>
      <WrenchScrewdriverIcon className="h-8 w-8 text-app-primary" />
    </div>
  </div>
  <p className="text-base font-bold text-app-title">Belum ada layanan</p>
  <p className="mt-1.5 text-sm text-app-body-muted">Jadilah yang pertama menambahkan layanan di lingkunganmu!</p>
  <button className="mx-auto mt-5 flex items-center gap-2 rounded-2xl bg-app-primary px-6 py-3 text-white">
    <PlusIcon className="h-4 w-4" />
    Tambah Layanan Pertama
  </button>
</div>
```

### No Results (Filtered)
```tsx
<p className="text-base font-bold text-app-title">Tidak ada layanan ditemukan</p>
<p className="mt-1.5 text-sm text-app-body-muted">Coba ubah atau hapus filter untuk melihat lebih banyak layanan.</p>
<button className="mx-auto mt-5 rounded-2xl border border-app-primary px-6 py-3 text-app-primary">Hapus semua filter</button>
```

---

## Pagination

### Container
```tsx
<div className="mt-6 flex items-center justify-center gap-3">
```

### Previous Button
```tsx
<button onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page === 1}
        className="rounded-xl px-5 py-2.5 text-sm font-semibold border border-[var(--color-input-border)] text-app-body bg-app-surface disabled:opacity-40">
  ← Sebelumnya
</button>
```

### Page Info
```tsx
<span className="text-xs font-medium text-app-body-muted">{page} / {totalPages}</span>
```

### Next Button
```tsx
<button onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        disabled={page === totalPages}
        className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white bg-app-primary disabled:opacity-40">
  Selanjutnya →
</button>
```

---

## Modals

### JasaCreateModal
- Category dropdown
- Name input
- Description textarea
- Price range inputs
- Operating days checkboxes
- WhatsApp number input
- Image upload
- Submit button

### JasaEditModal
- Same as create, pre-filled
- Additional delete option

### JasaDetailModal
- Full service info
- Large image
- Contact button
- Edit/Delete options

---

## Data Types

### Service
```typescript
interface JasaServiceWithMedia {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  category_name: string;
  provider_name: string;
  wa_number: string | null;
  price_min: number;
  price_max: number;
  is_available: boolean;
  operating_days: string[];
  image_url: string | null;
  created_at: string;
}
```

### Pagination
```typescript
interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
```

---

## API Endpoints

### List Services
```typescript
GET /api/jasa?page=1&limit=20&category_id=X&is_available=true&q=search
```

### Get Service Detail
```typescript
GET /api/jasa/:id
```

### Create Service
```typescript
POST /api/jasa
Body: FormData with service details
```

### Update Service
```typescript
PUT /api/jasa/:id
Body: JSON with service details
```

### Delete Service
```typescript
DELETE /api/jasa/:id
```

---

## Responsive

- Mobile-first (max-width: 430px)
- Full-width cards
- Stacked layout
- Touch-friendly filters
- Modal bottom sheets
