warga-digital\docs\plans\R2_CMS_IMAGE_INTEGRATION_2026-05-01\09_TESTING_VALIDATION.md
```md
# R2 CMS Image Integration — Sub-Plan 9: Testing & Validation

## Overview

This sub-plan defines testing and validation checklists for the R2 + Supabase CMS image integration, ensuring the implementation works correctly across all environments before production rollout.

---

## 1. Environment Setup Checklist

### Local Development

- [ ] `.env.development` contains all required R2 variables:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME=warga-digital`
  - `R2_PUBLIC_BASE_URL`
- [ ] Supabase environment variables present:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- [ ] No `NEXT_PUBLIC_` prefix on sensitive R2 keys
- [ ] `next.config.ts` includes `images.remotePatterns` for R2 domain
- [ ] CORS policy configured for `localhost:3000` in R2 bucket

### Staging/Production

- [ ] Environment secrets configured in deployment platform (Vercel/other)
- [ ] Custom media domain (`oo.warga-digital.com`) configured and SSL active
- [ ] Production CORS policy includes production domain
- [ ] All environment variables verified in deployment dashboard

---

## 2. Unit Testing

### Upload URL Endpoint (`POST /api/cms/articles/upload-url`)

- [ ] Endpoint returns valid signed URL structure
- [ ] Request validation rejects invalid `articleId`
- [ ] Request validation rejects invalid `contentType`
- [ ] Authorization check prevents unauthorized users from generating URLs
- [ ] Rate limiting enforced (if configured)

### R2 Service Layer

- [ ] `uploadFile()` successfully uploads buffer to R2
- [ ] `deleteFile()` removes object from R2
- [ ] `getPublicUrl()` constructs correct public URL
- [ ] Error handling catches and logs R2 API failures
- [ ] Credentials are not exposed in error responses

### Image Metadata Service

- [ ] `createImageRecord()` inserts record into `article_images` table
- [ ] `updateImageRecord()` updates existing record
- [ ] `deleteImageRecord()` removes record and returns object key
- [ ] `getImagesByArticleId()` returns ordered image list
- [ ] Bulk delete handles partial failures gracefully

---

## 3. Integration Testing

### Single Image Upload Flow

- [ ] CMS selects one image file
- [ ] Frontend requests signed URL from backend
- [ ] Frontend uploads file directly to R2 via signed URL
- [ ] Upload returns 200 with ETag
- [ ] Frontend receives `publicUrl`, `objectKey`
- [ ] Image metadata saved to Supabase `article_images` table
- [ ] Article save/update includes image reference

### Multi-Image Upload Flow

- [ ] CMS selects multiple images (3+)
- [ ] Frontend requests signed URLs for all files (parallel)
- [ ] Concurrent uploads execute with limit (3-5 concurrent)
- [ ] Each upload completes independently
- [ ] Failed uploads allow retry without affecting others
- [ ] Cancelled uploads stop pending requests
- [ ] Progress indicator updates per-file
- [ ] All successful URLs collected after completion
- [ ] Batch insert to `article_images` table succeeds
- [ ] Article content blocks reference all uploaded images

### Image Rendering

- [ ] Article page loads without errors when R2 images present
- [ ] `next/image` component renders images from R2 URLs
- [ ] `width` and `height` attributes applied correctly
- [ ] `alt` text displays when image fails to load
- [ ] Lazy loading works for below-fold images
- [ ] WebP/AVIF format served when browser supports

### Delete Article Flow

- [ ] Deleting article triggers R2 object deletion
- [ ] All related `article_images.object_key` values fetched
- [ ] R2 bulk delete executes successfully
- [ ] Supabase DB rows deleted in same workflow
- [ ] Orphaned R2 objects do not remain after deletion

---

## 4. E2E Testing (Playwright/Cypress)

### Happy Path

1. [ ] Login as CMS user
2. [ ] Create new article draft
3. [ ] Upload hero image
4. [ ] Upload 3 gallery images
5. [ ] Insert images into article content
6. [ ] Publish article
7. [ ] Navigate to article page as public user
8. [ ] Verify hero image renders correctly
9. [ ] Verify gallery images render in sequence
10. [ ] Check browser devtools — no 404/403 on image requests

### Error Scenarios

1. [ ] Upload with expired signed URL → proper error message
2. [ ] Upload to invalid object key → R2 returns error
3. [ ] Upload without auth token → 401 response
4. [ ] Upload to another user's article → 403 response
5. [ ] Upload oversized file → rejected before upload starts
6. [ ] Upload invalid file type → rejected with validation message
7. [ ] Network interruption mid-upload → retry mechanism works
8. [ ] R2 bucket unreachable → graceful error, no crash

---

## 5. Performance Testing

- [ ] Single image upload < 5s for 5MB file on decent connection
- [ ] Multi-image (10 images) upload completes < 30s
- [ ] Signed URL generation < 200ms response time
- [ ] Article page with 10 images loads < 3s on 4G
- [ ] Image lazy loading triggers at correct viewport threshold

---

## 6. Security Testing

- [ ] R2 credentials not present in client-side bundle
- [ ] Network tab does not expose `R2_SECRET_ACCESS_KEY`
- [ ] Signed URL expires within expected window (15-60 min)
- [ ] Upload endpoint rate-limited under abuse
- [ ] File type validation enforced server-side
- [ ] File size validation enforced server-side
- [ ] SQL injection in image metadata fields prevented
- [ ] XSS in `alt_text` or filename fields prevented

---

## 7. Staging Validation

- [ ] CORS rules include staging domain
- [ ] Staging images accessible via custom domain
- [ ] Auth flow works with staging Supabase project
- [ ] Image metadata syncs correctly to staging DB
- [ ] Large file upload (50MB) retries successfully
- [ ] CDN cache invalidation works after image update

---

## 8. Production Pre-Launch Checklist

### Infrastructure

- [ ] Custom domain `oo.warga-digital.com` active with HTTPS
- [ ] DNS points to Cloudflare R2 or Cloudflare CDN
- [ ] SSL certificate valid and auto-renewing
- [ ] R2 bucket region set to `Automatic` or specific region

### Configuration

- [ ] `next.config.ts` `remotePatterns` includes R2 domain
- [ ] CSP headers include `oo.warga-digital.com` in `img-src`
- [ ] Cache headers set to `public, max-age=31536000, immutable` for images
- [ ] Rate limiting configured on upload URL endpoint

### Monitoring

- [ ] Upload error alerts configured (spike detection)
- [ ] R2 bucket size/count metrics dashboard visible
- [ ] Supabase `article_images` table row count trending
- [ ] Error logging aggregation active (e.g., Sentry)

---

## 9. Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| 403 on upload | Signed URL expired or malformed | Regenerate URL, check signature |
| CORS error in browser | Origin not in R2 CORS policy | Add domain to CORS AllowedOrigins |
| Image shows broken icon | `remotePatterns` missing hostname | Add R2 domain to `next.config.ts` |
| Upload succeeds but no image in article | Missing DB insert after upload | Check CMS save flow transaction |
| Signed URL returns 403 | Wrong HTTP method (POST vs PUT) | Use PUT for direct R2 upload |
| Images slow to load | No cache headers | Add `Cache-Control` to R2 object metadata |

---

## 10. Sign-Off

| Checkpoint | Tester | Date |
|------------|--------|------|
| Local unit tests pass | | |
| Integration tests pass | | |
| E2E happy path passes | | |
| Security tests passed | | |
| Staging validation complete | | |
| Production pre-launch passed | | |

---

**Next:** Proceed to [10_MONITORING_OPTIMIZATION.md](./10_MONITORING_OPTIMIZATION.md) for post-deployment monitoring and optimization guidance.