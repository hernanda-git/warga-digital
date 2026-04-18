# Phase 5: Polish & Cleanup

**Date:** 2026-01-20  
**Phase:** 5 of 5  
**Status:** Pending  
**Dependencies:** Phases 1–4 complete

---

## Overview

Phase 5 addresses UX polish, the autosave status indicator, draft cleanup, and removal of deprecated code paths. All functional requirements are implemented by this phase — Phase 5 only adds quality-of-life improvements and cleanup.

---

## 5.1 Drag-and-Drop Gallery Reorder

### Goal
Allow users to reorder gallery images by dragging. Sort order is persisted to `article_images.sort_order`.

### Implementation

**Install `@dnd-kit/sortable`:**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Create `src/components/cms/SortableImageGrid.tsx`:**

```typescript
// Wraps ImageGallery with @dnd-kit sortable context
// On drag end: extract new order of image IDs → PATCH /api/cms/articles/{id}/images/reorder
// Body: { imageIds: string[] }
```

**Route change in `compose/page.tsx`:**

```typescript
// Replace <ImageGallery> with <SortableImageGrid>
import { SortableImageGrid } from "@/components/cms/SortableImageGrid";

<SortableImageGrid
  images={images}
  articleId={articleId!}
  onDelete={handleImageDelete}
  onReorder={handleImageReorder}
/>
```

**`handleImageReorder` implementation:**

```typescript
const handleImageReorder = async (imageIds: string[]) => {
  await apiFetch(`/api/cms/articles/${articleId}/images/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ imageIds }),
  });
  setImages((prev) => {
    const sorted = imageIds
      .map((id) => prev.find((img) => img.id === id))
      .filter(Boolean) as ArticleImage[];
    return sorted;
  });
};
```

### Action Items
- [ ] Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- [ ] Create `SortableImageGrid` component wrapping `ImageGallery` with drag handles
- [ ] Connect `PATCH /api/cms/articles/{id}/images/reorder` on drag end
- [ ] Verify sort order persists after page reload

---

## 5.2 Autosave Status Indicator

### Goal
Show "Saved X seconds ago" in the composer header so users know autosave is working.

### Implementation

**`src/components/cms/ComposerSaveStatus.tsx`:**

```typescript
interface Props {
  lastSavedAt: Date | null;
  isSaving: boolean;
  isDirty: boolean;
}

export function ComposerSaveStatus({ lastSavedAt, isSaving, isDirty }: Props) {
  const [, setTick] = useState(0);

  // Re-render every 10s to update "X seconds ago"
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  if (isSaving) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-gray-500">
        <ArrowPathIcon className="h-4 w-4 animate-spin" />
        Menyimpan...
      </span>
    );
  }

  if (isDirty) {
    return (
      <span className="text-sm text-amber-600">
        ● Belum disimpan
      </span>
    );
  }

  if (lastSavedAt) {
    const secs = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
    const label = secs < 60 ? `${secs}d` : secs < 3600 ? `${Math.floor(secs / 60)}m` : `${Math.floor(secs / 3600)}j`;
    return (
      <span className="flex items-center gap-1.5 text-sm text-gray-400">
        <CheckCircleIcon className="h-4 w-4 text-green-500" />
        Tersimpan {label} lalu
      </span>
    );
  }

  return null;
}
```

**Usage in `compose/page.tsx` header:**

```typescript
<div className="flex items-center gap-4">
  <span className="text-sm text-gray-500">{title || "Artikel baru"}</span>
  <ComposerSaveStatus
    lastSavedAt={lastSavedAt}
    isSaving={isSaving}
    isDirty={isDirty}
  />
</div>
```

### Action Items
- [ ] Create `ComposerSaveStatus` component
- [ ] Add `lastSavedAt: Date | null` to `ComposerState`
- [ ] Update `handleSave` to set `lastSavedAt = new Date()` after successful save
- [ ] Update autosave callback to set `lastSavedAt = new Date()`
- [ ] Verify "Tersimpan X lalu" text updates every 10 seconds

---

## 5.3 Draft Cleanup on Navigation Away

### Goal
If a user creates a draft article (via `POST /api/cms/articles/draft`), uploads images, but never publishes and navigates away — delete the draft article and its uploaded R2 objects to avoid orphan accumulation.

### Implementation

**Update `beforeunload` handler in `compose/page.tsx`:**

```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (!isDirty) return;

    // If article was never published (tempArticleId exists and articleId === tempArticleId
    // and status is still draft), delete the draft silently
    if (tempArticleId && status === "draft") {
      // Use sendBeacon for reliable delivery during page unload
      navigator.sendBeacon(
        `/api/cms/articles/${tempArticleId}?cleanup=true`,
        JSON.stringify({ _action: "delete_draft" }),
      );
    }

    e.preventDefault();
    e.returnValue = "Anda memiliki perubahan yang belum disimpan.";
  };

  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => window.removeEventListener("beforeunload", handleBeforeUnload);
}, [isDirty, tempArticleId, status]);
```

**Update `DELETE /api/cms/articles/[articleId]` to handle cleanup flag:**

```typescript
// In DELETE handler:
const url = new URL(request.url);
// If ?cleanup=true, suppress "not found" error and soft-delete even if already deleted
const isCleanup = url.searchParams.get("cleanup") === "true";

// If article was draft and has no content, do hard delete instead of soft delete
// to prevent orphaned draft records
if (isCleanup || (existing.deleted_at === null && !existing.title && !existing.content)) {
  await supabase.from("articles").delete().eq("id", articleId);
} else {
  // Normal soft delete
  await supabase.from("articles").update({ deleted_at: new Date().toISOString() })
    .eq("id", articleId);
}
```

**Alternative (simpler):** Add a `DELETE /api/cms/articles/{id}/cleanup` endpoint that only deletes if the article has no title and no published_at (i.e., it was a true draft placeholder). This is cleaner than adding query params to the main delete.

**New endpoint: `DELETE /api/cms/articles/{articleId}/draft`:**

```typescript
// Only succeeds if article is draft and has never been published
// Hard deletes article + all article_images + R2 objects
export async function DELETE(request: NextRequest, context: RouteContext) {
  // Verify draft status: status === "draft" AND published_at === null
  // If not a draft → return 400 { error: "Only draft articles can be deleted this way" }
  // Hard delete from DB (not soft delete)
  // Delete all R2 objects via deleteObjects()
}
```

### Action Items
- [ ] Add `DELETE /api/cms/articles/{id}/draft` endpoint (hard delete, draft-only guard)
- [ ] Update `beforeunload` in `compose/page.tsx` to call cleanup endpoint
- [ ] Test: navigate away from new draft → article and R2 objects are gone
- [ ] Test: navigate away from published article → no deletion

---

## 5.4 Deprecate ArticleFormModal

### Goal
Replace `ArticleFormModal` with `ArticleComposer`. Remove the modal pattern entirely.

### Implementation

**In `AdminArticlesPage`:**

```typescript
// OLD: open modal on "Buat Artikel"
const [showForm, setShowForm] = useState(false);
<button onClick={() => setShowForm(true)}>Buat Artikel</button>
{showForm && <ArticleFormModal ... />}

// NEW: navigate to composer page
<button onClick={() => router.push("/admin/articles/compose")}>
  Buat Artikel
</button>

// Also change Edit to go to composer
<button onClick={() => router.push(`/admin/articles/compose?id=${article.id}`)}>
  Edit
</button>
```

**In `compose/page.tsx`: read `id` query param for edit mode:**

```typescript
const searchParams = useSearchParams();
const editId = searchParams.get("id");

useEffect(() => {
  if (editId) {
    setArticleId(editId);
    loadArticle(editId); // fetch full article and populate state
  }
}, [editId]);
```

**Deprecate the modal file:**

Move `src/app/admin/articles/page.tsx` → extract `ArticleFormModal` to `src/components/cms/ArticleFormModal_DEPRECATED.tsx` and mark as deprecated in filename. Do NOT delete immediately — keep for 1 sprint in case rollback is needed.

### Action Items
- [ ] Add `?id=xxx` query param handling in `compose/page.tsx` for edit mode
- [ ] Update "Edit" button in `AdminArticlesPage` to navigate to composer
- [ ] Update "Buat Artikel" to navigate to `/admin/articles/compose`
- [ ] Move `ArticleFormModal` to deprecated components folder (do not delete yet)
- [ ] Update `AdminArticlesPage` import list to remove modal

---

## 5.5 Update Admin Articles List

### Goal
After migration to composer, the list page should work as before — list, search, filter, pagination all stay. Only the create/edit flow changes.

### Implementation

**In `AdminArticlesPage`:**

- Keep all existing state (`articles`, `loading`, `query`, `activeStatus`, `page`, etc.)
- `handleNew()` → `router.push("/admin/articles/compose")`
- `handleEdit(article)` → `router.push(\`/admin/articles/compose?id=${article.id}\`)`
- After returning from composer, refresh the list: add `useEffect` on `router.events`:

```typescript
useEffect(() => {
  const handleRouteChange = (url: string) => {
    if (url.includes("/admin/articles/compose")) {
      loadArticles();
    }
  };
  router.events?.on("routeChangeComplete", handleRouteChange);
  return () => router.events?.off("routeChangeComplete", handleRouteChange);
}, []);
```

### Action Items
- [ ] Update `handleNew` to navigate to composer
- [ ] Update `handleEdit` to navigate to composer with `?id=`
- [ ] Add `routeChangeComplete` listener to refresh list on return
- [ ] Verify list still shows correct articles after publishing from composer

---

## 5.6 Remove Deprecated R2 URL Reference

### Goal
Clean up any remaining references to the old dev bucket URL (`pub-e8fb49e00b3148128a9aa5967e921be2.r2.dev`).

### Implementation

```bash
grep -rn "pub-e8fb49e00b3148128a9aa5967e921be2.r2.dev" . --include="*.ts" --include="*.tsx" --include="*.md"
```

Expected: 0 results.

If any results remain, update to `oo.warga-digital.com`.

### Action Items
- [ ] Run grep for old dev URL — expect 0 results
- [ ] If found, replace with `oo.warga-digital.com`
- [ ] Verify `next.config.ts` and `src/middleware.ts` only contain `oo.warga-digital.com` and `*.r2.cloudflarestorage.com`

---

## 5.7 Run Full Security Verification

### Goal
Ensure all Phase 1–5 changes pass the security script.

```bash
npx tsx scripts/verify-r2-security.ts
```

Expected: 13/13 ✅

### Action Items
- [ ] Run security verification script
- [ ] Address any failures before deployment

---

## 5.8 Final Integration Test

### Goal
Verify the full create-to-publish flow works end-to-end with all Phase 1–5 changes in place.

### Action Items
- [ ] Create new article (no ID yet)
- [ ] Type title → slug auto-generates
- [ ] Upload 3 gallery images (draft placeholder created transparently)
- [ ] Set featured image
- [ ] Wait 30s → autosave fires → "Tersimpan X lalu" appears
- [ ] Drag to reorder gallery images
- [ ] Click "Publikasi"
- [ ] Navigate back to list → article appears as "Dipublikasi"
- [ ] Open same article in edit mode → all images present, order preserved
- [ ] Navigate away from draft (without publishing) → draft deleted + R2 cleaned
- [ ] Security check: 13/13 ✅

---

## Phase 5 Summary

| # | Action Item | Complexity |
|---|-------------|------------|
| 5.1 | Drag-and-drop gallery reorder | Medium |
| 5.2 | Autosave status indicator ("Tersimpan X lalu") | Low |
| 5.3 | Draft cleanup on navigation away | Medium |
| 5.4 | Deprecate `ArticleFormModal`, route through composer | Medium |
| 5.5 | Update AdminArticlesPage list navigation | Low |
| 5.6 | Remove old dev R2 URL | Low |
| 5.7 | Run security verification script | Low |
| 5.8 | Full integration E2E test | Medium |

**Total: 8 action items. Estimated: 2–3 days.**