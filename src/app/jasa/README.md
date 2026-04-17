# Jasa Feature - Warga Digital

## Overview

Jasa is a service listing feature that allows warga (residents) to publish and discover local services. It includes operational schedule management, pricing, image uploads, and contact via WhatsApp.

## Database Schema

### Tables

#### `jasa_services`
Core service listings table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| tenant_id | UUID | NOT NULL, REFERENCES tenants(id) ON DELETE CASCADE | Tenant/community |
| category_id | UUID | NOT NULL, REFERENCES marketplace_categories(id) ON DELETE RESTRICT | Service category |
| owner_user_id | UUID | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | Service owner |
| owner_display_name | VARCHAR(150) | NOT NULL | Cached owner name |
| name | VARCHAR(200) | NOT NULL | Service name |
| slug | VARCHAR(220) | NOT NULL, UNIQUE(tenant_id, slug) | URL-friendly slug |
| description | TEXT | NULL | Full description |
| summary | VARCHAR(300) | NULL | Short summary/preview |
| estimated_price | NUMERIC(12,2) | NOT NULL, CHECK (>= 0) | Estimated price in IDR |
| currency_code | VARCHAR(3) | NOT NULL DEFAULT 'IDR' | Currency |
| hari_operasional | JSONB | NOT NULL | Operating days (see below) |
| jam_operasional_mulai | TIME | NOT NULL DEFAULT '08:00:00' | Opening time |
| jam_operasional_selesai | TIME | NOT NULL DEFAULT '17:00:00' | Closing time |
| is_available | BOOLEAN | NOT NULL DEFAULT true | Current availability |
| status | marketplace_item_status | NOT NULL DEFAULT 'DRAFT' | Lifecycle status |
| wa_number | TEXT | NULL | WhatsApp contact |
| location_note | VARCHAR(200) | NULL | Location description |
| rating_avg | NUMERIC(2,1) | NOT NULL DEFAULT 0, CHECK (0-5) | Average rating |
| rating_count | INT | NOT NULL DEFAULT 0, CHECK (>=0) | Number of ratings |
| is_featured | BOOLEAN | NOT NULL DEFAULT false | Featured flag |
| published_at | TIMESTAMPTZ | NULL | Publication timestamp |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Creation time |
| created_by | UUID | NULL, REFERENCES users(id) | Creator |
| updated_at | TIMESTAMPTZ | NULL | Last update |
| updated_by | UUID | NULL, REFERENCES users(id) | Last updater |

**Indexes:**
- `idx_jasa_services_tenant_category` (tenant_id, category_id)
- `idx_jasa_services_owner` (owner_user_id)
- `idx_jasa_services_status` (status)
- `idx_jasa_services_available` (is_available) WHERE status = 'ACTIVE'
- `idx_jasa_services_price` (estimated_price) WHERE status = 'ACTIVE'
- `idx_jasa_services_published` (published_at DESC) WHERE status = 'ACTIVE'
- `idx_jasa_services_hari_operasional` USING GIN (hari_operasional)

**hari_operasional JSONB Structure:**
```json
{
  "senin": true,
  "selasa": true,
  "rabu": true,
  "kamis": true,
  "jumat": true,
  "sabtu": true,
  "minggu": false,
  "tanggal_merah": false
}
```

#### `jasa_service_media`
Images for services.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| service_id | UUID | NOT NULL, REFERENCES jasa_services(id) ON DELETE CASCADE | Parent service |
| url | TEXT | NOT NULL | Public image URL |
| alt_text | VARCHAR(200) | NULL | Alt text for accessibility |
| sort_order | SMALLINT | NOT NULL DEFAULT 0 | Display order |
| is_primary | BOOLEAN | NOT NULL DEFAULT false | Primary image flag |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Upload time |

**Indexes:**
- `idx_jasa_service_media_service` (service_id)
- `idx_jasa_service_media_sort` (service_id, sort_order)
- `jasa_service_media_one_primary` UNIQUE (service_id) WHERE is_primary = true

### Relationships

- `jasa_services.category_id` → `marketplace_categories.id` (must be JASA domain)
- `jasa_services.owner_user_id` → `users.id`
- `jasa_service_media.service_id` → `jasa_services.id` (cascade delete)

## API Endpoints

All endpoints require authentication via session cookie.

### 1. List Services
**GET** `/api/jasa`

Query parameters:
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 50)
- `category_id` (UUID) - filter by category
- `is_available` (boolean) - filter by availability
- `hari` (string) - filter by day (senin, selasa, rabu, kamis, jumat, sabtu, minggu, tanggal_merah)
- `min_price` (number) - minimum estimated price
- `max_price` (number) - maximum estimated price
- `q` (string) - search query (matches name, description, summary)

**Response:**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "uuid",
        "name": "Service AC",
        "summary": "Service dan perawatan AC",
        "description": "Lengkap dengan...",
        "estimated_price": 150000,
        "currency_code": "IDR",
        "hari_operasional": { "senin": true, ... },
        "jam_operasional_mulai": "08:00:00",
        "jam_operasional_selesai": "17:00:00",
        "is_available": true,
        "wa_number": "081234567890",
        "location_note": "Blok A",
        "rating_avg": 4.5,
        "rating_count": 12,
        "is_featured": false,
        "published_at": "2025-04-04T10:00:00Z",
        "owner_display_name": "Budi Santoso",
        "category_name": "Kelistrikan",
        "category_icon": "⚡",
        "primary_image_url": "https://...",
        "created_at": "2025-04-04T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    },
    "filters": {
      "categories": [
        { "id": "uuid", "name": "Kelistrikan", "icon": "⚡" }
      ]
    }
  }
}
```

### 2. Get Single Service
**GET** `/api/jasa/[id]`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Service AC",
    "description": "...",
    "estimated_price": 150000,
    "hari_operasional": { ... },
    "jam_operasional_mulai": "08:00:00",
    "jam_operasional_selesai": "17:00:00",
    "is_available": true,
    "wa_number": "081234567890",
    "location_note": "Blok A",
    "owner_display_name": "Budi Santoso",
    "owner_user_id": "user-uuid",
    "category_name": "Kelistrikan",
    "category_icon": "⚡",
    "media": [
      {
        "id": "media-uuid",
        "url": "https://...",
        "alt_text": "Service AC",
        "sort_order": 0,
        "is_primary": true
      }
    ],
    "created_at": "2025-04-04T10:00:00Z",
    "updated_at": "2025-04-04T10:00:00Z"
  }
}
```

**Authorization:** Users can view any ACTIVE service, or their own services regardless of status.

### 3. Create Service
**POST** `/api/jasa`

Content-Type: `multipart/form-data`

Fields:
- `name` (string, required, max 200)
- `description` (string, optional)
- `summary` (string, optional, max 300)
- `estimated_price` (number, required, >= 0)
- `category_id` (string UUID, required, must be JASA domain)
- `hari_operasional` (JSON string, required, see structure above)
- `jam_operasional_mulai` (string TIME, required, format "HH:MM")
- `jam_operasional_selesai` (string TIME, required, format "HH:MM")
- `is_available` (boolean string "true"/"false", required)
- `wa_number` (string, optional)
- `location_note` (string, optional, max 200)
- `primary_image` (File, optional but recommended) - first image becomes primary

**Response (201 Created):**
```json
{
  "success": true,
  "data": { /* jasa_service record */ },
  "message": "Layanan jasa berhasil dibuat"
}
```


**Notes:**

- `owner_user_id` is set from session automatically

- `tenant_id` from user's tenant

- Slug is auto-generated from name


### 4. Update Service
**PUT** `/api/jasa/[id]`

Content-Type: `application/json`

Body (all fields optional):
```json
{
  "name": "New Service Name",
  "description": "Updated description",
  "summary": "Updated summary",
  "estimated_price": 200000,
  "category_id": "new-category-uuid",
  "hari_operasional": { "senin": false, ... },
  "jam_operasional_mulai": "09:00:00",
  "jam_operasional_selesai": "18:00:00",
  
    "is_available": false,

    "wa_number": "081234567890",

    "location_note": "New location"
  }

```

**Response:**
```json
{
  "success": true,
  "data": { /* updated jasa_service record */ },
  "message": "Layanan jasa berhasil diperbarui"
}
```

**Authorization:** Only owner can update.

### 5. Delete Service
**DELETE** `/api/jasa/[id]`

**Response:**
```json
{
  "success": true,
  "message": "Layanan jasa berhasil dihapus"
}
```

**Behavior:**
- Deletes all associated media from storage bucket
- Deletes service record (cascade to media table)
- Only owner can delete

### 6. Upload Images
**POST** `/api/jasa/[id]/upload`

Content-Type: `multipart/form-data`

Fields:
- `files` (FileList, required) - multiple image files
- `is_primary` (string "true"/"false", optional) - set first image as primary if service has no primary yet

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "media-uuid",
      "url": "https://...",
      "is_primary": true
    }
  ],
  "message": "3 gambar berhasil diupload"
}
```

**Limits:**
- Max 5 images per service total
- File types: JPEG, PNG, WebP only
- Max file size: 10MB per file

### 7. Delete Media
**DELETE** `/api/jasa/[id]/media/[mediaId]`

**Response:**
```json
{
  "success": true,
  "message": "Media berhasil dihapus"
}
```

**Behavior:**
- Deletes file from storage bucket
- Deletes media record from database
- If deleted media was primary, promotes next image (by sort_order) to primary
- Only owner can delete

## Storage Setup

### Bucket: `jasa-images`

**Folder Structure:**
```
jasa-images/
  {user_id}/
    {service_id}/
      {timestamp}-{random}.jpg
      {timestamp}-{random}.png
      ...
```

**RLS Policies:**

```sql
-- Public read access
CREATE POLICY "Public read access for jasa images" ON storage.objects
  FOR SELECT USING (bucket_id = 'jasa-images');

-- Owners can upload/delete their own service images
CREATE POLICY "Users can upload own service images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'jasa-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own service images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'jasa-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Components

### `JasaCard`
Displays a service in the listing grid.

**Props:**
- `service: JasaServiceWithMedia` - service data
- `onClick?: () => void` - card click handler (opens detail modal)
- `onContact?: () => void` - WhatsApp contact button handler

**Features:**
- Primary image with fallback to category icon
- Operating days badges (abbreviated)
- Operating hours
- Availability badge (green/red)
- Rating display (if available)
- Price in Rupiah
- Contact button (if wa_number exists)

### `JasaFilters`
Filter sidebar with accordion on mobile.

**Props:** (all controlled)
- `categories`, `selectedCategory`, `onCategoryChange`
- `selectedDays`, `onDaysChange`
- `selectedAvailability`, `onAvailabilityChange`
- `searchQuery`, `onSearchChange`
- `minPrice`, `onMinPriceChange`, `maxPrice`, `onMaxPriceChange`

**Features:**
- Debounced search (300ms)
- Day selector with quick actions (Semua Hari, Kosongkan)
- Availability toggle (Semua/Tersedia/Tidak)
- Price range inputs
- Reset filters button when active

### `DaySelector`
Checkbox group for operating days.

**Props:**
- `value: Record<string, boolean>` - day keys with boolean values
- `onChange: (value) => void`
- `disabled?: boolean`

**Days:** senin, selasa, rabu, kamis, jumat, sabtu, minggu, tanggal_merah

**Default:** All weekdays true, weekends false, tanggal_merah false

### `TimeRangePicker`
Time input pair for operating hours.

**Props:**
- `startTime: string` (format "HH:MM")
- `endTime: string`
- `onStartChange: (time) => void`
- `onEndChange: (time) => void`
- `disabled?: boolean`

**Features:**
- Native HTML time inputs (mobile-friendly)
- Validation: start < end
- Quick preset buttons: Pagi (08:00-12:00), Siang (13:00-17:00), Full Day (08:00-17:00)

### `ImageGallery`
Carousel with fullscreen mode.

**Props:**
- `images: Array<{id, url, alt_text, sort_order, is_primary}>`
- `className?: string`

**Features:**
- Swipeable (touch support)
- Thumbnail strip navigation
- Fullscreen modal with zoom
- Keyboard navigation (arrows, escape)
- Primary image badge
- Image counter

### `JasaCreateModal`
Modal form for creating new services.

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `onSubmit: (FormData) => Promise<void>`
- `categories: Array<{id, name, icon}>`
- `isLoading?: boolean`

**Form Fields:**
1. Nama Layanan (required)
2. Kategori (required dropdown)
3. Deskripsi (optional textarea)
4. Ringkasan (optional single line)
5. Estimasi Harga (required, number)
6. Hari Operasional (DaySelector)
7. Jam Operasional (TimeRangePicker)
8. Tersedia untuk dipesan (checkbox)
9. Nomor WhatsApp (optional)
10. Lokasi (optional)
11. Foto Layanan (file input, at least 1 required)

**Validation:**
- All required fields must be filled
- Price >= 0
- Start time < end time
- At least 1 image uploaded
- Category must be from JASA domain

### `JasaEditModal`
Similar to create but pre-fills existing data.

**Additional Features:**
- Shows existing images in gallery
- Can delete existing images (with confirmation)
- New images can be added
- Primary image deletion promotes next image

**Props:**
- `service: JasaServiceDetailWithMedia | null` - pre-filled data

### `JasaDetailModal`
Full detail view with all information.

**Props:**
- `service: JasaServiceDetailWithMedia | null`
- `onClose: () => void`
- `onEdit: () => void` - only shown if user is owner
- `isLoading?: boolean`

**Features:**
- Full image gallery with zoom
- All service properties displayed
- "Hubungi via WhatsApp" button (if wa_number exists)
- "Edit Layanan" button (owner only)
- Owner information section

## Page Structure

**Route:** `/jasa`

**Component:** `src/app/jasa/page.tsx`

**Features:**
- Responsive grid layout (2 cols mobile, 3 tablet, 4 desktop)
- Sticky header with "Tambah" button
- Filter sidebar (desktop) / accordion (mobile)
- Pagination controls
- Empty state with CTA
- Loading states
- Error handling with retry
- Floating Action Button (mobile only)

**State Management:**
- Filters: search, category, availability, days, price range
- Pagination: page, totalPages
- Modals: create, edit, detail

## Integration Points

### Landing Page Updates
1. **FeatureGrid** - "Jasa" card now links to `/jasa` instead of `#jasa`
2. **HorizontalCardStrip** - "Jasa RT 03" section has `viewAllHref="/jasa"` to navigate to full listing

### Existing Marketplace
- `marketplace_categories` table is shared - JASA domain categories must exist
- `marketplace_domains` should have JASA domain seeded
- No changes to `marketplace_items` (UMKM remains separate)

## Setup Checklist

- [x] Database migration executed
- [x] RLS policies created for `jasa_services` and `jasa_service_media`
- [x] Storage bucket `jasa-images` created with RLS
- [x] TypeScript types updated in `src/types/database.ts`
- [x] API routes implemented:
  - [x] GET `/api/jasa`
  - [x] GET `/api/jasa/[id]`
  - [x] POST `/api/jasa`
  - [x] PUT `/api/jasa/[id]`
  - [x] DELETE `/api/jasa/[id]`
  - [x] POST `/api/jasa/[id]/upload`
  - [x] DELETE `/api/jasa/[id]/media/[mediaId]`
- [x] Components created:
  - [x] JasaCard
  - [x] JasaFilters
  - [x] DaySelector
  - [x] TimeRangePicker
  - [x] ImageGallery
  - [x] AvailabilityBadge
  - [x] JasaCreateModal
  - [x] JasaEditModal
  - [x] JasaDetailModal
- [x] Page component `/jasa/page.tsx`
- [x] Landing page links updated
- [ ] Test end-to-end flow
- [ ] Add error boundaries
- [ ] Performance optimization (image lazy loading, query optimization)
- [ ] Accessibility audit
- [ ] Mobile UX testing

## Usage Example

### Creating a Service (Client-side)

```typescript
const formData = new FormData();
formData.set("name", "Service AC");
formData.set("description", "Service dan perawatan AC rumah tangga");
formData.set("estimated_price", "150000");
formData.set("category_id", "category-uuid");
formData.set("hari_operasional", JSON.stringify({
  senin: true, selasa: true, rabu: true, kamis: true, jumat: true, sabtu: true, minggu: false, tanggal_merah: false
}));
formData.set("jam_operasional_mulai", "08:00");
formData.set("jam_operasional_selesai", "17:00");
formData.set("is_available", "true");
formData.set("wa_number", "081234567890");
formData.append("primary_image", fileInput.files[0]);

const response = await fetch("/api/jasa", {
  method: "POST",
  body: formData,
  credentials: "include"
});

const result = await response.json();
```

### Querying with Filters

```
GET /api/jasa?category_id=cat-uuid&is_available=true&hari=senin&min_price=50000&max_price=500000&q=ac&page=1&limit=20
```

## Design System

All components use the app's design tokens:
- Colors: `app-primary`, `app-surface`, `app-title`, `app-body`, `app-body-muted`
- Border radius: `rounded-2xl`, `rounded-xl`, `rounded-full`
- Shadows: Custom shadow tokens
- Typography: System fonts with appropriate weights

## Notes

- Images are uploaded to Supabase Storage and served via public URLs
- Primary image is required for display in cards
- Service status workflow: DRAFT → ACTIVE → ARCHIVED
- `is_available` is separate from status - allows toggling availability without changing lifecycle
- Tanggal Merah is a simple boolean flag; for dynamic holiday calendar, a separate table would be needed
- Ratings are currently not implemented (placeholder fields)
- No limit on number of services per user (consider adding quota if needed)

## Future Enhancements

- [ ] Reviews and ratings system
- [ ] Booking/transaction system
- [ ] Service packages (basic, premium, etc.)
- [ ] Dynamic Tanggal Merah calendar integration
- [ ] Service verification badges
- [ ] Search within description (full-text)
- [ ] Sorting options (price, rating, newest)
- [ ] Infinite scroll instead of pagination
- [ ] Push notifications for new inquiries
- [ ] Owner dashboard with analytics