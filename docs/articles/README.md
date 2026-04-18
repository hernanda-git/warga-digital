# Articles CMS - Warga Digital

**Status:** ✅ Production Ready  
**Last Updated:** 2026-04-18

---

## 📖 Overview

The Articles CMS is a full-featured content management system for Warga Digital, allowing admins to create, edit, and publish articles that are publicly accessible on the website.

---

## 🎯 Features

### For Readers (Public)
- ✅ Browse all published articles (`/artikel`)
- ✅ Read individual articles by slug (`/artikel/[slug]`)
- ✅ Beautiful responsive design
- ✅ Featured images and photo galleries
- ✅ Author attribution with avatars
- ✅ Reading time estimates
- ✅ Social sharing (WhatsApp, Twitter, Facebook, LinkedIn)
- ✅ Copy link functionality
- ✅ Mobile-optimized reading experience

### For Admins
- ✅ Create and edit articles (`/admin/articles/compose`)
- ✅ Auto-save functionality (30-second timer)
- ✅ Auto-slug generation from title
- ✅ Featured image upload (Cloudflare R2)
- ✅ Gallery image management
- ✅ Draft/Published/Archived statuses
- ✅ Soft-delete with image cleanup
- ✅ Admin role verification
- ✅ Secure access control

---

## 📁 Architecture

### Public Pages
```
/artikel              - Article listing page
/artikel/[slug]       - Individual article page
```

### Admin Pages
```
/admin/articles       - Article management dashboard
/admin/articles/compose - Create/edit article page
```

### API Endpoints
```
GET  /api/artikel           - Public: List published articles
GET  /api/artikel/[slug]    - Public: Get article by slug
GET  /api/cms/articles      - Admin: List all articles
POST /api/cms/articles      - Admin: Create article
GET  /api/cms/articles/[id] - Admin: Get article by ID
PUT  /api/cms/articles/[id] - Admin: Update article
PATCH /api/cms/articles/[id]- Admin: Partial update (autosave)
DELETE /api/cms/articles/[id] - Admin: Soft-delete article
```

### Storage
- **Database:** Supabase PostgreSQL
  - `articles` table - Article metadata
  - `article_images` table - Gallery images
  - `users` table - Author information

- **Image Storage:** Cloudflare R2
  - Featured images
  - Gallery images
  - Direct browser-to-R2 upload via signed URLs

---

## 🚀 Quick Start

### Reading Articles (Public)
1. Visit `/artikel` to browse all published articles
2. Click on any article to read the full content
3. Share articles using the social share buttons

### Creating Articles (Admin)
1. Navigate to `/admin/articles`
2. Click "Buat Artikel" to create new article
3. Enter title (slug auto-generates)
4. Add excerpt and content
5. Upload featured image
6. Add gallery images (optional)
7. Choose status (Draft/Published/Archived)
8. Click "Publikasi" or "Simpan Draf"

---

## 🔒 Security

### Access Control
- **Public endpoints:** No authentication required, only returns published articles
- **Admin endpoints:** Requires authentication + admin role
- **Database RLS:** Row-level security enforces access policies

### Image Security
- Signed upload URLs (5-minute expiry)
- File type validation (JPEG, PNG, WebP, GIF)
- File size limits (10MB max)
- Automatic cleanup on article deletion

---

## 📊 Technical Details

### Database Schema
```sql
articles (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  status TEXT (draft|published|archived),
  featured_image_url TEXT,
  author_id UUID REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,  -- Soft delete
  deleted_by UUID REFERENCES users(id)
)

article_images (
  id UUID PRIMARY KEY,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  object_key TEXT,          -- R2 storage key
  url TEXT,                 -- Public URL
  mime_type TEXT,
  size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Image Upload Flow
1. Admin selects file in browser
2. Request signed upload URL from API
3. Upload directly to R2 (browser → R2)
4. Store metadata in database
5. Display in article

### Cleanup Flow (On Delete)
1. Soft-delete article (set `deleted_at`)
2. Fetch all image object keys
3. Delete from R2 storage
4. Database cascade deletes `article_images`

---

## 📝 Documentation

- `COMPLETION_SUMMARY.md` - Phase 1 & 2 completion report
- `IMPLEMENTATION_PLAN.md` - Implementation roadmap
- `LOW_PRIORITY_BACKLOG.md` - Future enhancements backlog

---

## 🛠️ Development

### TypeScript Types
```typescript
interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  status: "draft" | "published" | "archived";
  featured_image_url: string | null;
  author_id: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  article_images?: ArticleImage[];
}

interface ArticleImage {
  id: string;
  article_id: string;
  object_key: string;
  url: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

### Utilities
- `src/lib/articles.ts` - Article helper functions
  - `calculateReadingTime()` - Estimate reading time
  - `formatDateIndonesian()` - Format dates in Indonesian
  - `truncateText()` - Truncate with ellipsis
  - `generateExcerpt()` - Generate excerpt from content

---

## ✅ Testing Checklist

### Public Features
- [x] Article list pagination works
- [x] Article detail loads by slug
- [x] Featured images display correctly
- [x] Gallery images display correctly
- [x] Author attribution shows
- [x] Reading time calculates
- [x] Social sharing works
- [x] Copy link works
- [x] Mobile responsive

### Admin Features
- [x] Admin can access compose page
- [x] Non-admin users redirected
- [x] Article CRUD operations work
- [x] Autosave functions correctly
- [x] Featured image uploads
- [x] Gallery images upload
- [x] Image cleanup on delete

### Security
- [x] Public API only returns published
- [x] Admin API requires auth + role
- [x] RLS policies enforce access
- [x] Image upload validates types/sizes
- [x] Orphan images cleaned up

---

## 📈 Future Enhancements

See `docs/articles/LOW_PRIORITY_BACKLOG.md` for:
- Bookmark/save feature
- Newsletter integration
- Search functionality
- Category/tag system
- RSS feed
- Analytics dashboard
- Multi-language support

---

## 🎉 Status

**Production Ready:** Yes ✅  
**TypeScript Errors:** 0  
**Test Coverage:** Manual testing complete  
**Documentation:** Complete  

---

**Contact:** For questions or issues, refer to the main project documentation.
