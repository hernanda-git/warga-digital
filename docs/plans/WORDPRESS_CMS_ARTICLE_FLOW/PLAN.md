# WordPress-Style CMS Article Flow — Implementation Plan

**Date:** 2026-01-20  
**Status:** Proposed  
**Project:** warga-digital  
**Parent:** R2 + Supabase CMS Image Integration

---

## 1. Problem Statement

The current article creation UX requires a **two-step save**:

1. User fills in title/slug/excerpt/content/status → clicks "Buat Artikel" → article created with ID
2. User is dropped into **edit mode** → only then can they access the image uploader and gallery

This is unlike WordPress (and every other CMS) where you can set a featured image and upload gallery images **during the initial creation** — not after.

**Current UX problems:**
- Gallery images are gated behind a separate edit session
- `featured_image_url` is a bare text field — no media picker during creation
- No autosave / draft persistence during long write sessions
- No "save as draft" inline publish flow
- Creating a new article and immediately uploading images is a multi-step friction path

**WordPress reference UX (target):**
```
┌─ Article Title ──────────────────────────────────┐
│                                                         │
│  ┌─ Featured Image ───────────────────────────┐   │
│  │  [Click to set featured image]             │   │
│  │  thumbnail + Remove button                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ Gallery ────────────────────────────────────┐   │
│  │  [Drag & drop or click to upload]            │   │
│  │  grid of thumbnails with caption fields      │   │
│  └─────────────────────────────────────────────┘   │
│                                                         │
│  ── Excerpt (optional) ──────────────────────── │
│                                                         │
│  ── Full Content (rich editor) ────────────────  │
│                                                         │
│  ── Publish Settings ──────────────────────────  │
│  [Status: Draft ▾]  [Save Draft]  [Publish →]    │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Scope

### In Scope
- Single-page article creation (no page breaks, no multi-step wizard)
- Featured image with media picker / drag-and-drop during creation
- Gallery images uploadable during creation
- Autosave / draft persistence every 30 seconds
- Inline status changes (Draft ↔ Published) without leaving the page
-_slug auto-generation from title
- Confirmation before navigating away with unsaved changes

### Out of Scope (for this plan)
- Scheduled publishing
- Article revisions / version history
- Gutenberg block editor (stay with textarea/plain markdown)
- Bulk media library (media picker from existing uploads)
- Gutenberg / block editor migration

---

## 3. New API Endpoints

### 3.1 `POST /api/cms/articles` — Add `auto_slug` option
Enhance existing endpoint to accept a flag that auto-generates slug from title if not provided.

**Request body change:**
```typescript
{
  title: string;
  slug?: string;           // ← if omitted, auto-generate from title
  excerpt?: string;
  content?: string;
  status?: "draft" | "published";
  featured_image_url?: string;
  author_id?: string;
  save_mode?: "create" | "draft";  // ← new: indicates intent
}
```

**Behavior:**
- If `slug` is empty/omitted → slugify from `title`
- If `status === "draft"` or `save_mode === "draft"` → create as draft, do not set `published_at`
- If `status === "published"` → set `published_at = now()`

### 3.2 `PATCH /api/cms/articles/{articleId}` — Add draft autosave
**Request body:**
```typescript
{
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  status?: "draft" | "published" | "archived";
  featured_image_url?: string;
  autosave?: boolean;  // ← new flag: suppresses "updated_at" noise, no publish events
}
```

**Behavior:**
- If `autosave === true`: update the record but do NOT update `published_at` or trigger any notifications
- If `status` changes to `"published"` with `autosave === false`: set `published_at = now()`

### 3.3 `POST /api/cms/articles/{articleId}/images/batch` — Bulk image creation
Currently each gallery image requires a separate `POST /api/cms/articles/{id}/images`. For WordPress UX we need to associate images with a **new article before it has an ID**.

**Solution:** Accept `temp_id` (client-generated UUID) for articles that don't exist yet.

**Request body:**
```typescript
{
  images: Array<{
    temp_id?: string;        // client-side UUID, for new articles
    object_key: string;
    url: string;
    mime_type: string;
    alt_text?: string;
    sort_order: number;
  }>;
  article_id: string;          // UUID of article (must exist)
}
```

**Response:**
```typescript
{
  images: Array<{ id: string; url: string; object_key: string; sort_order: number }>;
}
```

### 3.4 `POST /api/cms/articles/draft` — Create article in draft state (no ID required for image upload)
**Problem:** Gallery images need `article_id` to create DB records, but for new articles the ID doesn't exist until the first save.

**Solution A (chosen):** Create a temporary/draft article silently when the user first interacts with the image uploader in create mode. This is transparent to the user — they still feel like they're composing a new article.

**Solution B:** Use a `temp_article_id` that maps to a draft article created on-demand.

**Chosen approach:** `POST /api/cms/articles/draft` creates a placeholder article with minimal data, returns the real `article_id` which the UI uses for all subsequent image operations. When the user clicks "Publish" the placeholder is upgraded.

**Request body:**
```typescript
{
  title: string;          // optional at draft stage, can be empty
  temp_title?: string;    // shown in UI but not committed as real title
}
```

**Response:**
```typescript
{
  article_id: string;     // real UUID, used in all subsequent calls
  is_draft: true;
}
```

---

## 4. Component Changes

### 4.1 `AdminArticlesPage` — Split into two views

**View A: Article List** (existing, minor changes)
- Remove "Create Article" button that opens full modal
- Replace with "Buat Artikel" that loads **View B** in-place (not a modal overlay)
- Keep list, search, filter, pagination as-is

**View B: Article Composer** (new, replaces `ArticleFormModal`)
This is the main WordPress-style composer — a full-page view, not a modal.

```
┌─────────────────────────────────────────────────────────┐
│ ← Kembali ke Daftar    [Judul Artikel.................] │
│                                                         │
│  ┌─ Featured Image ────────────────────────────────┐   │
│  │  [current image thumbnail]  [Ganti] [Hapus]     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Excerpt          [.................................]   │
│                                                         │
│  Content          [...................................] │
│                   [...................................] │
│                   [...................................] │
│                                                         │
│  Status: [Draft ▾]   [Simpan Draf]   [Publikasi →]      │
└─────────────────────────────────────────────────────────┘
```

### 4.2 New: `ArticleComposer` page component

**Route:** `src/app/admin/articles/compose/page.tsx` (or pass `?compose=true` on existing page)

**State:**
```typescript
interface ComposerState {
  articleId: string | null;          // null = new article (first save creates it)
  tempArticleId: string | null;       // placeholder ID for image uploads before first save
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: "draft" | "published" | "archived";
  featuredImageUrl: string;
  images: ArticleImage[];
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  autosaveTimer: ReturnType<typeof setInterval> | null;
}
```

**Lifecycle:**
1. `mount` → set `articleId = null`, `tempArticleId = null`
2. User types title → auto-generate slug (debounced 500ms)
3. User uploads gallery image → if `articleId === null`:
   - First call `POST /api/cms/articles/draft` to create placeholder
   - Use returned `article_id` for all image operations
   - Set `tempArticleId = article_id`
4. User changes title/content/excerpt → mark `isDirty = true`
5. `isDirty === true` after 30s → `PATCH /api/cms/articles/{id}` with `autosave: true`
6. User clicks "Simpan Draf" → `PATCH /api/cms/articles/{id}` with `status: "draft"`, `autosave: false`
7. User clicks "Publikasi" → `PATCH /api/cms/articles/{id}` with `status: "published"`, `autosave: false`
8. `onUnload` (beforeunload) → if `isDirty`, show browser confirmation dialog

### 4.3 New: `FeaturedImagePicker` component

**What it does:**
- Shows current thumbnail (if set) or a dashed upload area
- Click triggers file select → uploads via R2 signed URL → sets `featuredImageUrl`
- "Remove" button clears the image

**Flow:**
```
Click "Set Featured Image" → file select → POST /api/cms/articles/upload-url → 
PUT to R2 → POST /api/cms/articles/draft (if no articleId yet) → 
PATCH /api/cms/articles/{id} with featured_image_url
```

### 4.4 New: `GalleryUploader` component (replaces `ArticleImageUploader`)

Changes from current implementation:
- Fires on `articleId` change — if `articleId === null`, creates draft placeholder first
- Shows upload progress for each file
- Supports drag-and-drop
- Each uploaded image immediately gets a caption/alt_text field inline
- Sort order is maintained by drag-and-drop (future) or sequential upload order

### 4.5 Modify: `ArticleFormModal` → deprecate

`ArticleFormModal` becomes the create flow for non-image use cases. For image-capable create, use `ArticleComposer`. Alternatively, refactor `ArticleFormModal` to internally use the same `ComposerState` and render in place of the list view.

**Decision:** Refactor `ArticleFormModal` into `ArticleComposer` and have it take over the full page. Remove the modal entirely.

---

## 5. Autosave Implementation

```
onTitleChange()   → mark dirty, start 30s timer
onContentChange() → mark dirty, restart 30s timer
onEveryChange()   → update lastSavedAt null

if (isDirty && !isSaving && lastSavedAt === null) {
  start 30s timer
}

if (30s timer fires) {
  PATCH /api/cms/articles/{id} { autosave: true }
  set lastSavedAt = now()
}
```

Visual indicator: "Saved X seconds ago" in header bar.

---

## 6. Action Items

### Phase 1 — Draft Placeholder API (Foundation)
- [ ] **1.1** `POST /api/cms/articles/draft` — creates minimal draft article, returns `article_id`
- [ ] **1.2** Update `POST /api/cms/articles/upload-url` to accept `draft_article_id` for pre-save image association
- [ ] **1.3** `POST /api/cms/articles/{id}/images/batch` — bulk insert images for existing article
- [ ] **1.4** Update `PATCH /api/cms/articles/{id}` to support `autosave: boolean` flag
- [ ] **1.5** Add `PATCH /api/cms/articles/{id}` to support auto-slug generation from title when slug is empty

### Phase 2 — Composer Page
- [ ] **2.1** Create `src/app/admin/articles/compose/page.tsx`
- [ ] **2.2** Implement `ComposerState` with all fields
- [ ] **2.3** Implement auto-slug from title (debounced 500ms)
- [ ] **2.4** Implement autosave timer (30s interval)
- [ ] **2.5** Implement `beforeunload` dirty check
- [ ] **2.6** Replace "Buat Artikel" button in list view to navigate to compose page
- [ ] **2.7** Back button from composer returns to list with page refresh

### Phase 3 — Featured Image
- [ ] **3.1** Create `FeaturedImagePicker` component
- [ ] **3.2** Implement file select → R2 upload → set URL flow
- [ ] **3.3** Show thumbnail preview when image is set
- [ ] **3.4** "Remove" clears featured_image_url via PATCH

### Phase 4 — Gallery Images
- [ ] **4.1** Create `GalleryUploader` component (enhanced from existing uploader)
- [ ] **4.2** Create draft placeholder on first image upload (new article only)
- [ ] **4.3** Inline alt_text field per image in gallery grid
- [ ] **4.4** Sort order from sequential upload (drag-drop deferred to Phase 5)
- [ ] **4.5** Connect to `POST /api/cms/articles/{id}/images/batch` after all uploads done

### Phase 5 — Polish & Cleanup
- [ ] **5.1** Drag-and-drop reorder for gallery images (using `@dnd-kit/sortable` or similar)
- [ ] **5.2** "Saved X seconds ago" indicator in composer header
- [ ] **5.3** Delete draft article if user navigates away without publishing
- [ ] **5.4** Update `ArticleFormModal` to redirect to composer or deprecate
- [ ] **5.5** Update `AdminArticlesPage` list: "Edit" button navigates to composer in edit mode
- [ ] **5.6** Remove `pub-e8fb49e00b3148128a9aa5967e921be2.r2.dev` from all configs
- [ ] **5.7** Run full security verification script

---

## 7. File Inventory

### New Files
```
src/app/admin/articles/compose/page.tsx          — new composer page
src/components/cms/FeaturedImagePicker.tsx       — new
src/components/cms/GalleryUploader.tsx           — new (derived from current uploader)
src/components/cms/ArticleComposerHeader.tsx     — new (title, back button, save status)
src/components/cms/ComposerSaveBar.tsx            — new (draft/publish buttons)
```

### Modified Files
```
src/app/admin/articles/page.tsx                   — replace modal with composer navigation
src/app/api/cms/articles/route.ts                 — add draft endpoint, auto-slug
src/app/api/cms/articles/[articleId]/route.ts     — add autosave flag, auto-slug on PATCH
src/app/api/cms/articles/[articleId]/images/route.ts — add batch endpoint
src/lib/r2.ts                                     — add draft article flow support
```

### Deleted / Deprecated
```
src/app/admin/articles/components/ArticleFormModal.tsx  — deprecate after migration
src/app/admin/articles/components/ArticleImageUploader.tsx — replace with GalleryUploader
```

---

## 8. Draft Article Lifecycle

```
[User opens composer]
         │
         ▼
[User types title / uploads first image]
         │
         ▼ POST /api/cms/articles/draft ──→ returns { article_id: "uuid-xxx" }
         │
         ▼ set articleId = "uuid-xxx", tempArticleId = articleId
         │
[All subsequent image uploads use articleId]
         │
[User clicks "Publikasi"]
         │
         ▼ PATCH /api/cms/articles/{articleId} { status: "published" }
         │
[Article goes live — draft placeholder upgraded to real article]
```

If the user never publishes and navigates away:
```
[beforeunload: isDirty === true]
         │
         ▼ DELETE /api/cms/articles/{articleId}  (cascade deletes any uploaded images)
```

---

## 9. Autosave Flow

```
User types in title field
         │
         ▼ set isDirty = true
         │
[Start 30-second timer if not already running]
         │
[Timer fires && isDirty]
         │
         ▼ PATCH /api/cms/articles/{articleId} {
              title: currentTitle,
              autosave: true
            }
         │
[Server updates without changing published_at]
         │
         ▼ set lastSavedAt = now()
         ▼ set isDirty = false
         │
[UI shows "Saved X sec ago"]
```

If user clicks "Simpan Draf" manually:
```
PATCH /api/cms/articles/{articleId} {
  title, slug, excerpt, content, status: "draft",
  autosave: false
}
→ server sets updated_at normally, no special behavior
```

---

## 10. Status Transition Matrix

| Current Status | Action | New Status | `published_at` |
|---------------|--------|------------|-----------------|
| draft (new) | Click "Publikasi" | published | Set to `now()` |
| published | Click "Arsipkan" | archived | Cleared |
| published | Click "Kembalikan ke Draf" | draft | Cleared |
| draft | Click "Simpan Draf" | draft | Unchanged |
| archived | Click "Publikasi ulang" | published | Set to `now()` |

---

## 11. Testing Checklist

- [ ] Create new article → publish immediately → article is live
- [ ] Create new article → upload gallery images before first save → images associated correctly
- [ ] Autosave triggers at 30s of inactivity → `updated_at` changes, `published_at` unchanged
- [ ] Navigating away with unsaved changes → browser confirm dialog appears
- [ ] Navigating away from draft (never published) → draft article is deleted
- [ ] Edit existing article → change featured image → image updates correctly
- [ ] Edit existing article → upload gallery → images append (not replace)
- [ ] Edit existing article → delete gallery image → image removed from DB + R2
- [ ] Change status draft → published → `published_at` is set
- [ ] Change status published → draft → `published_at` is cleared
- [ ] Autosave does NOT set `published_at` even if status was previously published
- [ ] Security verification: no R2 secrets exposed, all endpoints auth-gated

---

## 12. Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| `@heroicons/react` | ^2.2.0 | Icons (already installed) |
| `@aws-sdk/client-s3` | ^3.1026.0 | R2 uploads (already installed) |
| `@dnd-kit/sortable` | future (Phase 5) | Drag-drop reorder |
| `sonner` | ^2.0.7 | Toast notifications (already installed) |

---

## 13. Metrics of Success

| Metric | Target |
|--------|--------|
| New article creation → first image upload | Single page, no modal, no multi-step |
| Time from "Buat Artikel" click to published article | < 2 minutes for simple article |
| Autosave triggers correctly without false positives | 100% of 30s inactivity cases |
| Gallery images survive draft → publish transition | 0 image loss |
| Security check script | 13/13 green |

---

**Next:** Proceed to [01_DRAFT_PLACEHOLDER_API.md](./01_DRAFT_PLACEHOLDER_API.md) for Phase 1 implementation details.