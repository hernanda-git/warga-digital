# Phase 1 — Quick Reference Card

## 4 Endpoints, 1 Vision: WordPress-Style CMS

### 1️⃣ POST /api/cms/articles/draft
**Creates invisible draft placeholder**
```bash
curl -X POST http://localhost:3000/api/cms/articles/draft \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{}'
```
**Response:** `{ article_id: "uuid", is_draft: true, created_at: "2026-01-20T..." }`

**Use Case:** User uploads first image before article has an ID

---

### 2️⃣ POST /api/cms/articles/{articleId}/images/batch
**Bulk insert multiple images**
```bash
curl -X POST http://localhost:3000/api/cms/articles/{articleId}/images/batch \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "images": [
      {
        "object_key": "articles/uuid/2026/01/img1.jpg",
        "url": "https://oo.warga-digital.com/articles/uuid/2026/01/img1.jpg",
        "mime_type": "image/jpeg",
        "alt_text": "Optional caption",
        "sort_order": 0
      }
    ]
  }'
```
**Response:** `{ images: [{ id: "img-uuid", url: "...", object_key: "...", sort_order: 0 }] }`

**Use Case:** After R2 uploads complete, associate all images with article

---

### 3️⃣ PATCH /api/cms/articles/{articleId}
**Update article + autosave support**

#### Normal Save (Explicit)
```bash
curl -X PATCH http://localhost:3000/api/cms/articles/{articleId} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "My Article",
    "status": "published"
  }'
```
**Result:** Sets `published_at = now()`

#### Autosave (30-second idle)
```bash
curl -X PATCH http://localhost:3000/api/cms/articles/{articleId} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "content": "Updated content",
    "autosave": true
  }'
```
**Result:** Updates content WITHOUT changing `published_at`

#### Auto-Slug Generation
```bash
curl -X PATCH http://localhost:3000/api/cms/articles/{articleId} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title": "Hello World"}'
```
**Result:** `slug: "hello-world"` (auto-generated)

---

### 4️⃣ POST /api/cms/articles
**Create new article (auto-slug enabled)**
```bash
curl -X POST http://localhost:3000/api/cms/articles \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "title": "Breaking News",
    "excerpt": "Optional summary",
    "content": "Optional content",
    "status": "draft"
  }'
```
**Response:** `{ article: { slug: "breaking-news", ... } }`

**Note:** Slug auto-generated if not provided

---

## Error Codes Reference

| Code | Meaning | Example |
|------|---------|---------|
| 201 | Created (draft, batch images) | POST /draft returns 201 |
| 200 | OK (normal updates) | PATCH returns 200 |
| 400 | Bad Request (validation fail) | Empty images array |
| 401 | Unauthorized (no session) | Missing wd_session cookie |
| 404 | Not Found | Invalid article ID |
| 409 | Conflict (slug exists) | Duplicate slug |
| 500 | Server Error | Unexpected error |

---

## Auto-Slug Examples

| Input | Output |
|-------|--------|
| "Hello World" | "hello-world" |
| "BREAKING: News!!!" | "breaking-news" |
| "Test   Multiple   Spaces" | "test-multiple-spaces" |
| "café-résumé" | "caf-rsum" (special chars removed) |

---

## Complete Flow: Create → Images → Publish

```bash
# Step 1: Create draft placeholder
DRAFT=$(curl -s -X POST http://localhost:3000/api/cms/articles/draft \
  -H "Content-Type: application/json" -b cookies.txt -d '{}')
ARTICLE_ID=$(echo $DRAFT | jq -r '.article_id')

# Step 2: Upload images to R2 (not shown - uses existing endpoint)
# ... PUT to signed URL ...
# Get: object_key, publicUrl for each image

# Step 3: Batch insert images
curl -X POST http://localhost:3000/api/cms/articles/$ARTICLE_ID/images/batch \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"images":[{"object_key":"...","url":"...","mime_type":"image/jpeg","sort_order":0}]}'

# Step 4: Autosave (fires every 30 sec of inactivity)
curl -X PATCH http://localhost:3000/api/cms/articles/$ARTICLE_ID \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"content":"Article body...","autosave":true}'

# Step 5: Publish
curl -X PATCH http://localhost:3000/api/cms/articles/$ARTICLE_ID \
  -H "Content-Type: application/json" -b cookies.txt \
  -d '{"status":"published"}'
  # ✓ Sets published_at = now()
  # ✓ Article live
  # ✓ All images already associated
```

---

## Key Behaviors

✅ **Auto-Slug**
- Generated from title automatically
- Only if slug not provided
- Lowercase, spaces→hyphens, special chars removed
- Collision detection: returns 409 if slug exists

✅ **Autosave Flag**
- When `autosave: true`, suppresses `published_at` changes
- Useful for 30-second idle saves in Phase 2
- Preserves publication timestamp on re-saves

✅ **Draft Placeholder**
- Created with `title: "Untitled"`, `status: "draft"`, no `published_at`
- Has real UUID for image operations
- Upgraded on first real save (title changes to actual title)

✅ **Batch Images**
- Insert 1+ images in single API call
- Validates all required fields
- Returns image records with database IDs
- Atomic operation (all-or-nothing)

---

## Testing

### Quick Test All 4 Endpoints
```bash
chmod +x test-phase1.sh
./test-phase1.sh
```

### Full Test Guide
```
docs/PHASE1_API_TESTING.md  (710 lines, all scenarios covered)
```

### Security Verification
```bash
npx tsx scripts/verify-r2-security.ts
# Expected: 13/13 ✅
```

---

## Files Affected

### New (3)
- `src/app/api/cms/articles/draft/route.ts`
- `src/app/api/cms/articles/[articleId]/images/batch/route.ts`
- `docs/PHASE1_API_TESTING.md`

### Modified (2)
- `src/app/api/cms/articles/[articleId]/route.ts` (added PATCH + auto-slug)
- `src/app/api/cms/articles/route.ts` (added auto-slug to POST)

---

## Status

✅ Code complete  
✅ All 4 endpoints tested  
✅ 0 TypeScript errors  
✅ 13/13 security checks pass  
✅ Ready for Phase 2  

**Phase 1 is production-ready from API perspective.**

---

**Need details?** → See `docs/PHASE1_API_TESTING.md` (710 lines)  
**Phase 2 spec?** → See `docs/plans/WORDPRESS_CMS_ARTICLE_FLOW/02_COMPOSER_PAGE.md`  
**Full plan?** → See `docs/plans/WORDPRESS_CMS_ARTICLE_FLOW/PLAN.md`
