# Phase 1: Draft Placeholder API

**Parent Plan:** [PLAN.md](../PLAN.md)  
**Status:** In Progress  
**Phase:** 1 of 5

---

## Overview

Phase 1 creates the API foundation that allows the WordPress-style compose experience. The core problem solved here:

> Gallery images require `article_id` to create DB records, but new articles don't have an ID until after the first save. Users must be able to upload images before the first explicit save — without a placeholder, the gallery uploader is blocked.

**Solution:** `POST /api/cms/articles/draft` creates a minimal, invisible draft article the moment the user first interacts with the image uploader. All image operations use this draft article's real UUID. When the user finally publishes, the draft is upgraded — not replaced.

---

## 1. New Endpoint: `POST /api/cms/articles/draft`

**File:** `src/app/api/cms/articles/draft/route.ts` (new file)

**Purpose:** Create a minimal draft article placeholder and return its real UUID for use in subsequent image operations.

### Behavior

- Creates an article in `"draft"` status
- `author_id` = authenticated user from session
- `title` = `"Untitled"` (or passed `temp_title` for UI display purposes — not persisted as real title)
- No `published_at` set
- No slug generated at this stage
- Returns the real `article_id` (UUID) immediately

### Request

```typescript
// POST /api/cms/articles/draft
// Body (all optional):
{
  temp_title?: string;   // UI label only, not saved to DB
}
```

### Response

```typescript
// 201 Created
{
  article_id: string;    // real UUID, e.g. "a1b2c3d4-..."
  is_draft: true;
  created_at: string;     // ISO timestamp
}

// 401 Unauthorized
{ error: "Unauthorized" }

// 500 Server Error
{ error: "Internal server error" }
```

### Implementation

```typescript
// src/app/api/cms/articles/draft/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/cms/articles/draft
 *
 * Creates a minimal draft article placeholder and returns its real UUID.
 * Use this when you need an article_id for image operations before the user
 * has explicitly saved a real article.
 *
 * The placeholder is upgraded to a real article on first publish/save.
 * If the user abandons the compose page without publishing, the draft
 * article remains orphaned — cleanup is handled by the orphan cleanup job.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { temp_title } = body;

    const supabase = createServerClient();

    const insertData: Record<string, unknown> = {
      title: "Untitled",          // Placeholder title — will be overwritten on real save
      author_id: session.userId,
      status: "draft",
    };

    // temp_title is UI-only metadata, NOT stored in DB.
    // It is passed so the UI can display "Drafting: {temp_title}" while composing.
    // The real title is set when the user saves/publishes.

    const { data: article, error } = await supabase
      .from("articles")
      .insert(insertData)
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Error creating draft article:", error);
      return NextResponse.json(
        { error: "Failed to create draft article" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        article_id: article.id,
        is_draft: true,
        created_at: article.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/cms/articles/draft:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

---

## 2. New Endpoint: `POST /api/cms/articles/{articleId}/images/batch`

**File:** `src/app/api/cms/articles/[articleId]/images/batch/route.ts` (new file)

**Purpose:** Insert multiple image records in a single call. Used after all R2 uploads complete, to associate all gallery images with an article in one round-trip.

### Request

```typescript
// POST /api/cms/articles/{articleId}/images/batch
{
  images: Array<{
    object_key: string;    // R2 S3 key, e.g. "articles/uuid/2026/01/img-xxx.jpg"
    url: string;           // Full public URL, e.g. "https://oo.warga-digital.com/articles/uuid/..."
    mime_type: string;     // e.g. "image/jpeg"
    alt_text?: string;     // Optional alt text
    sort_order: number;    // Sequence index (0-based)
  }>;
}
```

### Response

```typescript
// 201 Created
{
  images: Array<{
    id: string;
    url: string;
    object_key: string;
    sort_order: number;
  }>;
}

// 400 Bad Request
{ error: "Invalid images array or missing fields" }

// 401 Unauthorized
{ error: "Unauthorized" }

// 404 Not Found
{ error: "Article not found" }
```

### Implementation

```typescript
// src/app/api/cms/articles/[articleId]/images/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ articleId: string }> };

/**
 * POST /api/cms/articles/{articleId}/images/batch
 *
 * Insert multiple image records for an article in a single call.
 * Used after R2 uploads complete to associate all gallery images at once.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { articleId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { images } = body;

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "images must be a non-empty array" },
        { status: 400 },
      );
    }

    // Validate each image entry
    for (const img of images) {
      if (!img.object_key || !img.url || !img.mime_type || img.sort_order === undefined) {
        return NextResponse.json(
          { error: "Each image requires object_key, url, mime_type, and sort_order" },
          { status: 400 },
        );
      }
    }

    const supabase = createServerClient();

    // Verify article exists
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id")
      .eq("id", articleId)
      .is("deleted_at", null)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Build insert rows
    const insertRows = images.map((img, index) => ({
      article_id: articleId,
      object_key: img.object_key,
      url: img.url,
      mime_type: img.mime_type,
      alt_text: img.alt_text || null,
      sort_order: img.sort_order ?? index,
    }));

    const { data: insertedImages, error: insertError } = await supabase
      .from("article_images")
      .insert(insertRows)
      .select("id, url, object_key, sort_order");

    if (insertError) {
      console.error("Error batch inserting images:", insertError);
      return NextResponse.json(
        { error: "Failed to create image records" },
        { status: 500 },
      );
    }

    return NextResponse.json({ images: insertedImages }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/cms/articles/{id}/images/batch:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

---

## 3. Modify: `PATCH /api/cms/articles/{articleId}` — Add Autosave & Auto-slug

**File:** `src/app/api/cms/articles/[articleId]/route.ts`

### Changes

#### 3.1 Add `autosave` flag behavior
When `autosave: true` is in the request body:
- Update the record fields normally
- **Do NOT** update `published_at` when status is published (autosave should not trigger publication events)
- **Do NOT** update `updated_at` if all fields are the same (no-op for idle saves)
- The `updated_at` column will be updated by the database trigger as normal — the key behavior is that `published_at` is NOT set on autosave

#### 3.2 Add auto-slug from title
When `slug` is empty/missing in the PATCH body and `title` is provided:
- Auto-generate slug from `title` using the same `sanitizeSlug` logic used elsewhere
- Slug format: lowercase, spaces replaced with dashes, special chars stripped

### Updated PATCH handler

```typescript
// Add to top of PATCH handler
const { autosave } = body;

// Auto-slug: if title provided but slug empty, generate from title
if (title !== undefined && !slug && title.trim()) {
  slug = generateSlug(title.trim());
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")   // remove non-word chars except space/hyphen
    .replace(/\s+/g, "-")        // spaces to hyphens
    .replace(/-+/g, "-")          // collapse multiple hyphens
    .replace(/^-+|-+$/g, "");    // trim leading/trailing hyphens
}
```

For `autosave` behavior, add a conditional before updating:

```typescript
// In the update block, wrap published_at logic:
if (status !== undefined) {
  updateData.status = status;
  
  // Only touch published_at if this is NOT an autosave
  if (!autosave) {
    if (status === "published" && existing.status !== "published") {
      updateData.published_at = new Date().toISOString();
    }
    if (status !== "published" && existing.status === "published") {
      updateData.published_at = null;
    }
  }
  // When autosave === true, published_at is left alone regardless of status
}
```

### Complete updated `PATCH` signature and body parsing

```typescript
/**
 * PUT /api/cms/articles/[articleId]
 * PATCH /api/cms/articles/[articleId]   ← ADD THIS
 *
 * Update an article
 * Body: {
 *   title?, slug?, excerpt?, content?, status?,
 *   featured_image_url?: string;
 *   autosave?: boolean;   ← NEW
 * }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { articleId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, excerpt, content, status, featured_image_url, autosave } = body;

    const supabase = createServerClient();

    const { data: existing, error: fetchError } = await supabase
      .from("articles")
      .select("id, author_id, status, deleted_at")
      .eq("id", articleId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (existing.deleted_at !== null) {
      return NextResponse.json({ error: "Article has been deleted" }, { status: 404 });
    }

    // Auto-slug: generate from title if slug not provided
    let finalSlug = slug;
    if (title !== undefined && !slug && title.trim()) {
      finalSlug = generateSlug(title.trim());
    }

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title.trim();
    if (finalSlug !== undefined) updateData.slug = finalSlug;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (content !== undefined) updateData.content = content;
    if (featured_image_url !== undefined) updateData.featured_image_url = featured_image_url;

    if (status !== undefined) {
      updateData.status = status;
      // Only update published_at on explicit saves, not autosaves
      if (!autosave) {
        if (status === "published" && existing.status !== "published") {
          updateData.published_at = new Date().toISOString();
        }
        if (status !== "published" && existing.status === "published") {
          updateData.published_at = null;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data: article, error } = await supabase
      .from("articles")
      .update(updateData)
      .eq("id", articleId)
      .select()
      .single();

    if (error) {
      console.error("Error updating article:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An article with this slug already exists" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Failed to update article" },
        { status: 500 },
      );
    }

    return NextResponse.json({ article, autosaved: !!autosave });
  } catch (error) {
    console.error("Error in PATCH /api/cms/articles/[articleId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

---

## 4. Modify: `POST /api/cms/articles` — Add Auto-slug

**File:** `src/app/api/cms/articles/route.ts`

### Change

In the `POST` handler, if `slug` is not provided in the request body, auto-generate it from `title`:

```typescript
// Inside POST handler, before building insertData:
let finalSlug = slug;
if (!slug && title.trim()) {
  finalSlug = generateSlug(title.trim());
}

// Then in insertData:
if (finalSlug) insertData.slug = finalSlug;

// Also add generateSlug function (same as above)
```

Also add `autosave`-like logic for `save_mode: "draft"`:
```typescript
// If save_mode === "draft" or no status provided, default to draft
const effectiveStatus = status || "draft";
if (effectiveStatus === "draft") {
  // Do NOT set published_at
}
// If status === "published", set published_at = now()
```

---

## 5. Modify: `POST /api/cms/articles/upload-url` — Accept Draft Article ID

**File:** `src/app/api/cms/articles/upload-url/route.ts`

### Change

Allow `articleId` to be created via draft endpoint first if it doesn't exist yet. Currently the endpoint checks if the article exists and belongs to the user. Add support for a `draft_article_id` fallback:

**New request body field:**
```typescript
{
  articleId: string;          // Required — must be existing article UUID
  // OR
  create_draft?: boolean;     // If true and articleId doesn't exist, create draft first
  filename: string;
  contentType: string;
  fileSize?: number;
}
```

**Implementation:** If `create_draft === true` and the article lookup fails with 404, call the draft endpoint internally and use the returned `article_id`:

```typescript
// In POST handler, after article lookup fails:
if (articleError?.code === "PGRST116" || articleError?.message?.includes("No rows")) {
  // Article not found — if create_draft flag is set, create placeholder
  if (body.create_draft) {
    const draftRes = await fetch(new URL("/api/cms/articles/draft", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") || "" },
      body: JSON.stringify({}),
    });
    if (!draftRes.ok) {
      return NextResponse.json({ error: "Failed to create draft article" }, { status: 500 });
    }
    const { article_id: newArticleId } = await draftRes.json();
    // Proceed with newArticleId
  }
}
```

**Note:** This keeps the UX flow seamless — the client doesn't need to call draft endpoint separately before uploading images. However, for clarity and debuggability, prefer the explicit two-step approach (call draft endpoint → use returned ID for upload).

---

## 6. File Changes Summary

| Action | File | Change Type |
|--------|------|-------------|
| Create | `src/app/api/cms/articles/draft/route.ts` | **New** |
| Create | `src/app/api/cms/articles/[articleId]/images/batch/route.ts` | **New** |
| Modify | `src/app/api/cms/articles/[articleId]/route.ts` | Add PATCH, autosave flag, auto-slug |
| Modify | `src/app/api/cms/articles/route.ts` | Add auto-slug to POST |
| Modify | `src/app/api/cms/articles/upload-url/route.ts` | Add draft fallback (optional) |

---

## 7. Testing Checklist

- [ ] `POST /api/cms/articles/draft` returns a valid article UUID
- [ ] Draft article is created with status `"draft"` and no `published_at`
- [ ] `POST /api/cms/articles/{id}/images/batch` inserts multiple rows and returns IDs
- [ ] `PATCH /api/cms/articles/{id}` with `autosave: true` and `status: "published"` does NOT set `published_at`
- [ ] `PATCH /api/cms/articles/{id}` with empty slug and provided title auto-generates slug
- [ ] `POST /api/cms/articles/draft` with no auth returns 401
- [ ] Batch insert with invalid image entries returns 400 with specific error
- [ ] All existing endpoints remain backward-compatible (no breaking changes)

---

## 8. Next Phase

Proceed to [02_COMPOSER_PAGE.md](../WORDPRESS_CMS_ARTICLE_FLOW/02_COMPOSER_PAGE.md) for Phase 2: Composer Page implementation.

---

**Status:** Phase 1 Implementation  
**Owner:** Backend  
**Last Updated:** 2026-01-20