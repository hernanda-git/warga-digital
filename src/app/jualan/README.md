# Jualan Feature Implementation

## Overview
A complete community goods marketplace page where residents can buy and sell physical goods. This is a fresh design independent from the existing Jasa and Marketplace features.

## Key Features
- **2-column product grid** layout (different from Jasa's single-column list)
- **Multi-image support** with Cloudflare R2 storage
- **Discount system** with percentage-based discounts
- **Stock & sold tracking** (manual seller input)
- **Simple transaction flow** via WhatsApp contact
- **Category-based browsing** with fresh `jualan_categories` table
- **Boolean status** (`is_active`) for showing/hiding listings

## Database Schema

### Tables Created
1. **`jualan_categories`** - Independent category system
2. **`jualan_goods`** - Main goods table with price, stock, discount fields
3. **`jualan_item_media`** - Multi-image support

### Migration Files
- `20260423121334_add_jualan_goods.sql` - Schema creation
- `20260423121335_seed_jualan_categories.sql` - Default categories seed

### Key Fields
- `is_active`: boolean (true = showing, false = hidden)
- `discount_percent`: 0-100, auto-calculates `discount_amount` and `final_price`
- `stock_qty`: current available stock
- `sold_count`: manually updated by seller
- `unit_label`: UOM (kg, pcs, pack, etc.)

## API Routes

### `/api/jualan`
- **GET**: List goods with pagination, filters (category, price range, search, sort)
- **POST**: Create new goods listing

### `/api/jualan/[id]`
- **GET**: Get goods detail with media
- **PUT**: Update goods (including manual `sold_count` edit)
- **DELETE**: Archive goods (sets `is_active = false`)

### `/api/jualan/[id]/upload`
- **POST**: Generate R2 signed upload URLs
- **PATCH**: Confirm upload and save media records

### `/api/jualan/[id]/media/[mediaId]`
- **DELETE**: Remove media from R2 + database

## Frontend Components

### Location: `src/components/jualan/`
- **`JualanCard`** - 2-column grid card with image, price, discount badge, stock/sold stats
- **`JualanCardSkeleton`** - Loading skeleton
- **`JualanFilters`** - Search, category pills, price range, sort dropdown
- **`JualanCreateModal`** - Full form with R2 direct upload
- **`JualanEditModal`** - Edit form with editable sold count
- **`JualanDetailModal`** - Image carousel, seller info, WhatsApp contact

### Page: `src/app/jualan/page.tsx`
- Hero section with stats (Total Barang, Tersedia, Terjual)
- 2-column responsive grid
- Pagination support
- Empty states with CTAs

## Storage: Cloudflare R2

### Configuration
Uses existing R2 setup from `.env`:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL`

### Upload Flow
1. Client calls `/api/jualan/[id]/upload` POST with file metadata
2. API returns signed R2 PUT URLs
3. Client uploads directly to R2 via PUT request
4. Client calls `/api/jualan/[id]/upload` PATCH to save media records

### Storage Path Format
`jualan/{itemId}/{yyyy}/{mm}/{dd}/{uuid}-{sanitized-filename}`

## Default Categories Seeded
1. 🛍️ Sembako
2. 🍱 Makanan & Minuman
3. 🎨 Kerajinan Tangan
4. 🥬 Sayur & Buah
5. 🏠 Kebutuhan Rumah Tangga
6. 👕 Fashion & Pakaian
7. 📱 Elektronik & Aksesoris
8. 📦 Lainnya

## Design Differences from Jasa

| Aspect | Jasa | Jualan |
|--------|------|--------|
| Layout | Single-column horizontal cards | 2-column product grid |
| Card Focus | Service name + schedule | Image + price + stock |
| Price Display | Simple price | Price per UOM + discount strikethrough |
| Photos | Single thumbnail | Multi-image gallery with dots |
| Stats | Total / Available / Categories | Total Items / Available / Sold |
| Status Enum | `is_available` boolean | `is_active` boolean |
| Special Field | `hari_operasional` | `discount_percent`, `stock_qty`, `sold_count` |

## Usage

### Access
- Route: `/jualan`
- Feature Grid: Updated "Jual Beli" button now links to `/jualan`

### Create Flow
1. Click "Jual" button in hero
2. Fill form: category, name, price, discount, UOM, stock, WA number
3. Upload up to 5 images (first is primary)
4. Click "Jual Barang"

### Edit Flow
1. Open goods detail
2. Click edit (pencil icon) - owner only
3. Edit any field including **Terjual** (sold count)
4. Toggle "Tampilkan di listing" to show/hide

### Contact Flow
1. Buyer views goods detail
2. Clicks "Hubungi Penjual"
3. Opens WhatsApp with pre-filled message

## Next Steps (Optional Enhancements)
- [ ] Add review/rating system
- [ ] Implement shopping cart + checkout (use `marketplace_transactions` table)
- [ ] Add seller storefront pages
- [ ] Implement search with fuzzy matching
- [ ] Add analytics dashboard for sellers
- [ ] Support bulk upload via CSV
- [ ] Add promotional banners for featured items

## Testing Checklist
- [ ] Run migrations in Supabase SQL Editor
- [ ] Verify R2 bucket is accessible
- [ ] Test create/edit/delete flows
- [ ] Test image upload (multiple images)
- [ ] Test discount calculation display
- [ ] Test stock = 0 "Stok Habis" overlay
- [ ] Test filter and sort functionality
- [ ] Test pagination
- [ ] Test WhatsApp contact link
- [ ] Test on mobile viewport (2-column grid)

## Files Created/Modified

### New Files
- `supabase/migrations/20260423121334_add_jualan_goods.sql`
- `supabase/migrations/20260423121335_seed_jualan_categories.sql`
- `src/app/jualan/page.tsx`
- `src/app/api/jualan/route.ts`
- `src/app/api/jualan/[id]/route.ts`
- `src/app/api/jualan/[id]/upload/route.ts`
- `src/app/api/jualan/[id]/media/[mediaId]/route.ts`
- `src/components/jualan/JualanCard.tsx`
- `src/components/jualan/JualanCardSkeleton.tsx`
- `src/components/jualan/JualanFilters.tsx`
- `src/components/jualan/JualanCreateModal.tsx`
- `src/components/jualan/JualanEditModal.tsx`
- `src/components/jualan/JualanDetailModal.tsx`
- `src/types/jualan.ts`

### Modified Files
- `src/config/landing.ts` - Added `JUALAN` route
- `src/components/landing/FeatureGrid.tsx` - Updated "Jual Beli" href to `/jualan`
