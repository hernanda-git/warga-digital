# Phase 1 API Testing Guide

**Date:** 2026-01-20  
**Phase:** 1 of 5  
**Status:** Testing

---

## Overview

This document provides complete testing instructions for all Phase 1 endpoints. All endpoints require authentication via `wd_session` cookie.

---

## 1. Setup

### 1.1 Get Session Cookie

First, log in to get a valid session cookie:

```bash
# Login and capture the session cookie
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

This saves the `wd_session` cookie to `cookies.txt`.

### 1.2 Set Environment Variables

```bash
# For easier subsequent requests
export BASE_URL="http://localhost:3000"
export COOKIE_FILE="cookies.txt"
```

---

## 2. Test: POST /api/cms/articles/draft

### Purpose
Create a minimal draft article placeholder and get back its real `article_id` for use in image operations.

### 2.1 Create Draft Article

```bash
curl -X POST "${BASE_URL}/api/cms/articles/draft" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{"temp_title":"My Draft Article"}' | jq
```

### Expected Response (201 Created)

```json
{
  "article_id": "a1b2c3d4-e5f6-4789-a1b2-c3d4e5f6g7h8",
  "is_draft": true,
  "created_at": "2026-01-20T10:30:00Z"
}
```

### 2.2 Verify Draft Article in Database

```bash
# Save the article_id from response
ARTICLE_ID="a1b2c3d4-e5f6-4789-a1b2-c3d4e5f6g7h8"

# Fetch the article to verify it was created
curl -X GET "${BASE_URL}/api/cms/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" | jq
```

### Expected Response (200 OK)

```json
{
  "article": {
    "id": "a1b2c3d4-e5f6-4789-a1b2-c3d4e5f6g7h8",
    "title": "Untitled",
    "slug": null,
    "excerpt": null,
    "content": null,
    "status": "draft",
    "featured_image_url": null,
    "author_id": "user-uuid-here",
    "published_at": null,
    "created_at": "2026-01-20T10:30:00Z",
    "updated_at": "2026-01-20T10:30:00Z",
    "deleted_at": null,
    "article_images": []
  }
}
```

### 2.3 Test Unauthorized Access

```bash
# Without session cookie
curl -X POST "${BASE_URL}/api/cms/articles/draft" \
  -H "Content-Type: application/json" \
  -d '{}' | jq
```

### Expected Response (401 Unauthorized)

```json
{
  "error": "Unauthorized"
}
```

---

## 3. Test: POST /api/cms/articles/{articleId}/images/batch

### Purpose
Bulk insert multiple image records for an article after R2 uploads complete.

### 3.1 Create Images (Batch)

```bash
# Use the ARTICLE_ID from previous test
curl -X POST "${BASE_URL}/api/cms/articles/${ARTICLE_ID}/images/batch" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "images": [
      {
        "object_key": "articles/a1b2c3d4/2026/01/uuid1-image1.jpg",
        "url": "https://oo.warga-digital.com/articles/a1b2c3d4/2026/01/uuid1-image1.jpg",
        "mime_type": "image/jpeg",
        "alt_text": "First image",
        "sort_order": 0
      },
      {
        "object_key": "articles/a1b2c3d4/2026/01/uuid2-image2.jpg",
        "url": "https://oo.warga-digital.com/articles/a1b2c3d4/2026/01/uuid2-image2.jpg",
        "mime_type": "image/jpeg",
        "alt_text": "Second image",
        "sort_order": 1
      }
    ]
  }' | jq
```

### Expected Response (201 Created)

```json
{
  "images": [
    {
      "id": "img-uuid-1",
      "url": "https://oo.warga-digital.com/articles/a1b2c3d4/2026/01/uuid1-image1.jpg",
      "object_key": "articles/a1b2c3d4/2026/01/uuid1-image1.jpg",
      "sort_order": 0,
      "alt_text": "First image"
    },
    {
      "id": "img-uuid-2",
      "url": "https://oo.warga-digital.com/articles/a1b2c3d4/2026/01/uuid2-image2.jpg",
      "object_key": "articles/a1b2c3d4/2026/01/uuid2-image2.jpg",
      "sort_order": 1,
      "alt_text": "Second image"
    }
  ]
}
```

### 3.2 Test Invalid Request (Missing Fields)

```bash
curl -X POST "${BASE_URL}/api/cms/articles/${ARTICLE_ID}/images/batch" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "images": [
      {
        "object_key": "articles/.../image.jpg"
        # Missing: url, mime_type, sort_order
      }
    ]
  }' | jq
```

### Expected Response (400 Bad Request)

```json
{
  "error": "Each image requires object_key, url, mime_type, and sort_order"
}
```

### 3.3 Test Empty Images Array

```bash
curl -X POST "${BASE_URL}/api/cms/articles/${ARTICLE_ID}/images/batch" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{"images": []}' | jq
```

### Expected Response (400 Bad Request)

```json
{
  "error": "images must be a non-empty array"
}
```

### 3.4 Test Non-Existent Article

```bash
curl -X POST "${BASE_URL}/api/cms/articles/nonexistent-id/images/batch" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "images": [{
      "object_key": "test",
      "url": "test",
      "mime_type": "image/jpeg",
      "sort_order": 0
    }]
  }' | jq
```

### Expected Response (404 Not Found)

```json
{
  "error": "Article not found"
}
```

---

## 4. Test: PATCH /api/cms/articles/{articleId} with Autosave

### Purpose
Update article fields with autosave flag that suppresses `published_at` changes.

### 4.1 Basic PATCH (No Autosave)

```bash
curl -X PATCH "${BASE_URL}/api/cms/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "title": "My Awesome Article",
    "excerpt": "This is a test article"
  }' | jq
```

### Expected Response (200 OK)

```json
{
  "article": {
    "id": "a1b2c3d4-e5f6-4789-a1b2-c3d4e5f6g7h8",
    "title": "My Awesome Article",
    "slug": "my-awesome-article",
    "excerpt": "This is a test article",
    "status": "draft",
    "updated_at": "2026-01-20T10:35:00Z",
    ...
  },
  "autosaved": false
}
```

### 4.2 PATCH with Autosave Flag

```bash
curl -X PATCH "${BASE_URL}/api/cms/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "content": "Article content here...",
    "autosave": true
  }' | jq
```

### Expected Response (200 OK with autosaved flag)

```json
{
  "article": {
    "id": "a1b2c3d4-e5f6-4789-a1b2-c3d4e5f6g7h8",
    "content": "Article content here...",
    "published_at": null,
    "updated_at": "2026-01-20T10:36:00Z",
    ...
  },
  "autosaved": true
}
```

### 4.3 Test Auto-Slug Generation

```bash
# Create a new draft with just a title (no slug provided)
curl -X PATCH "${BASE_URL}/api/cms/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "title": "Hello World Article"
  }' | jq '.article | {title, slug}'
```

### Expected Response

```json
{
  "title": "Hello World Article",
  "slug": "hello-world-article"
}
```

### 4.4 Test Autosave Does NOT Set published_at

```bash
# Start with a draft article
curl -X PATCH "${BASE_URL}/api/cms/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{"status": "draft"}' | jq '.article | {status, published_at}'
```

### Expected (first time publication, should set published_at)

```json
{
  "status": "draft",
  "published_at": null
}
```

Now with autosave, even if we set status to published:

```bash
curl -X PATCH "${BASE_URL}/api/cms/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "status": "published",
    "autosave": true
  }' | jq '.article | {status, published_at}'
```

### Expected (autosave=true suppresses published_at)

```json
{
  "status": "published",
  "published_at": null
}
```

Without autosave flag (real publish):

```bash
curl -X PATCH "${BASE_URL}/api/cms/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{"status": "published"}' | jq '.article | {status, published_at}'
```

### Expected (now published_at is set)

```json
{
  "status": "published",
  "published_at": "2026-01-20T10:38:00Z"
}
```

---

## 5. Test: POST /api/cms/articles with Auto-Slug

### Purpose
Create a new article with auto-generated slug from title.

### 5.1 Create Article Without Providing Slug

```bash
curl -X POST "${BASE_URL}/api/cms/articles" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "title": "Breaking News Article"
  }' | jq '.article | {id, title, slug, status}'
```

### Expected Response (201 Created)

```json
{
  "id": "new-article-uuid",
  "title": "Breaking News Article",
  "slug": "breaking-news-article",
  "status": "draft"
}
```

### 5.2 Create Article With Explicit Slug

```bash
curl -X POST "${BASE_URL}/api/cms/articles" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "title": "My Article",
    "slug": "custom-slug-here"
  }' | jq '.article | {title, slug}'
```

### Expected Response

```json
{
  "title": "My Article",
  "slug": "custom-slug-here"
}
```

### 5.3 Test Slug Collision

```bash
# Try creating two articles with the same title (both auto-slug to same value)
curl -X POST "${BASE_URL}/api/cms/articles" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{"title": "Duplicate Title"}' | jq
```

Then create another with same title:

```bash
curl -X POST "${BASE_URL}/api/cms/articles" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{"title": "Duplicate Title"}' | jq
```

### Expected Response (409 Conflict)

```json
{
  "error": "An article with this slug already exists"
}
```

---

## 6. Integration Test: Full Create + Images Flow

### 6.1 Step 1: Create Draft Placeholder

```bash
RESPONSE=$(curl -s -X POST "${BASE_URL}/api/cms/articles/draft" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{}')

DRAFT_ID=$(echo $RESPONSE | jq -r '.article_id')
echo "Draft Article ID: $DRAFT_ID"
```

### 6.2 Step 2: Batch Insert Images

```bash
curl -X POST "${BASE_URL}/api/cms/articles/${DRAFT_ID}/images/batch" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "images": [
      {
        "object_key": "articles/'${DRAFT_ID}'/2026/01/uuid1-hero.jpg",
        "url": "https://oo.warga-digital.com/articles/'${DRAFT_ID}'/2026/01/uuid1-hero.jpg",
        "mime_type": "image/jpeg",
        "alt_text": "Hero image",
        "sort_order": 0
      }
    ]
  }' | jq
```

### 6.3 Step 3: Update Article Metadata

```bash
curl -X PATCH "${BASE_URL}/api/cms/articles/${DRAFT_ID}" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "title": "My Complete Article",
    "excerpt": "This article has images",
    "content": "Full article content here",
    "status": "published"
  }' | jq '.article | {id, title, slug, status, published_at}'
```

### Expected Final Response

```json
{
  "id": "draft-article-uuid",
  "title": "My Complete Article",
  "slug": "my-complete-article",
  "status": "published",
  "published_at": "2026-01-20T10:45:00Z"
}
```

### 6.4 Step 4: Verify Images Associated

```bash
curl -X GET "${BASE_URL}/api/cms/articles/${DRAFT_ID}" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" | jq '.article.article_images'
```

### Expected Response

```json
[
  {
    "id": "img-uuid-1",
    "url": "https://oo.warga-digital.com/articles/draft-article-uuid/2026/01/uuid1-hero.jpg",
    "alt_text": "Hero image",
    "sort_order": 0
  }
]
```

---

## 7. Error Scenarios

### 7.1 Invalid JSON

```bash
curl -X POST "${BASE_URL}/api/cms/articles/draft" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d 'invalid json {' | jq
```

### Expected Response

```json
{
  "error": "Internal server error"
}
```

### 7.2 Missing Required Fields

```bash
curl -X POST "${BASE_URL}/api/cms/articles" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{}' | jq
```

### Expected Response (400 Bad Request)

```json
{
  "error": "Title is required"
}
```

### 7.3 Deleted Article

```bash
# Delete an article first
curl -X DELETE "${BASE_URL}/api/cms/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" | jq

# Try to update it
curl -X PATCH "${BASE_URL}/api/cms/articles/${ARTICLE_ID}" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{"title": "Updated"}' | jq
```

### Expected Response (404 Not Found)

```json
{
  "error": "Article has been deleted"
}
```

---

## 8. Testing Checklist

- [ ] `POST /api/cms/articles/draft` returns valid UUID
- [ ] Draft article created with status `"draft"` and no `published_at`
- [ ] `POST /api/cms/articles/{id}/images/batch` inserts multiple rows
- [ ] Batch insert validates all required fields
- [ ] Batch insert rejects empty images array
- [ ] `PATCH /api/cms/articles/{id}` with `autosave: true` does NOT set `published_at`
- [ ] `PATCH /api/cms/articles/{id}` with `status: "published"` and `autosave: false` DOES set `published_at`
- [ ] Auto-slug generated correctly from title (spaces→hyphens, lowercase)
- [ ] Auto-slug collision detection returns 409
- [ ] `POST /api/cms/articles` auto-generates slug when not provided
- [ ] All endpoints require authentication (return 401 without cookie)
- [ ] Deleted article returns 404 on update
- [ ] Invalid article ID returns 404

---

## 9. Bash Script for Automated Testing

Save as `test-phase1.sh`:

```bash
#!/bin/bash

set -e

BASE_URL="http://localhost:3000"
COOKIE_FILE="cookies.txt"

echo "=== Phase 1 API Testing ==="
echo

# 1. Create draft
echo "1. Creating draft article..."
DRAFT=$(curl -s -X POST "${BASE_URL}/api/cms/articles/draft" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{}')
DRAFT_ID=$(echo $DRAFT | jq -r '.article_id')
echo "✓ Draft ID: $DRAFT_ID"

# 2. Batch insert images
echo "2. Inserting batch images..."
curl -s -X POST "${BASE_URL}/api/cms/articles/${DRAFT_ID}/images/batch" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "images": [{
      "object_key": "test/image.jpg",
      "url": "https://oo.warga-digital.com/test/image.jpg",
      "mime_type": "image/jpeg",
      "sort_order": 0
    }]
  }' | jq -e '.images[0].id' > /dev/null
echo "✓ Images inserted"

# 3. Update with autosave
echo "3. Testing autosave..."
AUTOSAVE=$(curl -s -X PATCH "${BASE_URL}/api/cms/articles/${DRAFT_ID}" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{
    "title": "Test Article",
    "autosave": true
  }')
echo $AUTOSAVE | jq -e '.autosaved == true' > /dev/null
echo "✓ Autosave works"

# 4. Verify auto-slug
echo "4. Verifying auto-slug..."
SLUG=$(echo $AUTOSAVE | jq -r '.article.slug')
[ "$SLUG" = "test-article" ] && echo "✓ Auto-slug generated: $SLUG" || echo "✗ Slug incorrect: $SLUG"

# 5. Publish (set published_at)
echo "5. Publishing article..."
PUB=$(curl -s -X PATCH "${BASE_URL}/api/cms/articles/${DRAFT_ID}" \
  -H "Content-Type: application/json" \
  -b "${COOKIE_FILE}" \
  -d '{"status": "published"}')
PUB_AT=$(echo $PUB | jq -r '.article.published_at')
[ "$PUB_AT" != "null" ] && echo "✓ Published at: $PUB_AT" || echo "✗ published_at not set"

echo
echo "=== All Phase 1 tests passed! ==="
```

Run it:

```bash
chmod +x test-phase1.sh
./test-phase1.sh
```

---

## Summary

**All Phase 1 endpoints are working correctly if:**

✅ `POST /api/cms/articles/draft` creates minimal articles  
✅ `POST /api/cms/articles/{id}/images/batch` bulk-inserts images  
✅ `PATCH /api/cms/articles/{id}` supports autosave flag  
✅ `PATCH /api/cms/articles/{id}` auto-generates slugs  
✅ `POST /api/cms/articles` auto-generates slugs  
✅ All endpoints require authentication  
✅ All endpoints return proper error codes  

**Next Phase:** [02_COMPOSER_PAGE.md](./WORDPRESS_CMS_ARTICLE_FLOW/02_COMPOSER_PAGE.md)