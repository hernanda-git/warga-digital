warga-digital\docs\plans\R2_CMS_IMAGE_INTEGRATION_2026-05-01\00_MAIN_PLAN.md
```

# R2 + Supabase CMS Image Integration Plan

**Date:** 2026-05-01  
**Status:** Planned  
**Parent Guide:** `CLOUDFLARE_R2_SUPABASE_ARTICLE_IMAGE_GUIDE.md`

---

## Overview

This plan implements a hybrid storage strategy for CMS article images using Cloudflare R2 for media storage and delivery, while keeping Supabase as the source of truth for metadata and relationships.

---

## Sub-Plans

| # | Sub-Plan | File | Description |
|---|----------|------|-------------|
| 1 | Infrastructure Setup | [01_INFRASTRUCTURE_SETUP.md](./01_INFRASTRUCTURE_SETUP.md) | Configure R2 bucket, custom domain, and CORS |
| 2 | Environment Configuration | [02_ENVIRONMENT_CONFIG.md](./02_ENVIRONMENT_CONFIG.md) | Add R2 credentials to env configs |
| 3 | Database Design | [03_DATABASE_DESIGN.md](./03_DATABASE_DESIGN.md) | Create `article_images` table in Supabase |
| 4 | API Upload Endpoint | [04_API_UPLOAD_ENDPOINT.md](./04_API_UPLOAD_ENDPOINT.md) | Create signed URL generation endpoint |
| 5 | CMS Upload UI | [05_CMS_UPLOAD_UI.md](./05_CMS_UPLOAD_UI.md) | Implement multi-image upload UI flow |
| 6 | Image Rendering | [06_IMAGE_RENDERING.md](./06_IMAGE_RENDERING.md) | Configure `next/image` and render R2 images |
| 7 | Lifecycle Operations | [07_LIFECYCLE_OPERATIONS.md](./07_LIFECYCLE_OPERATIONS.md) | Implement delete/replace cleanup jobs |
| 8 | Security Hardening | [08_SECURITY_HARDENING.md](./08_SECURITY_HARDENING.md) | Security checklist and hardening |
| 9 | Testing & Validation | [09_TESTING_VALIDATION.md](./09_TESTING_VALIDATION.md) | Testing checklists for all environments |

---

## Implementation Order

```
[1] Infrastructure Setup (R2 bucket + custom domain + CORS)
    ↓
[2] Environment Configuration (add env vars)
    ↓
[3] Database Design (create article_images table)
    ↓ (can parallel with 1-2)
[4] API Upload Endpoint (signed URL generation)
    ↓
[5] CMS Upload UI (multi-image upload with progress/retry)
    ↓
[6] Image Rendering (next/image config + components)
    ↓
[7] Lifecycle Operations (delete/replace/cleanup)
    ↓
[8] Security Hardening (apply all security measures)
    ↓
[9] Testing & Validation (full test suite)
```

---

## Key References

- **Guide:** `/CLOUDFLARE_R2_SUPABASE_ARTICLE_IMAGE_GUIDE.md`
- **R2 Bucket:** `warga-digital`
- **Custom Domain:** `media.wargadigital.id`
- **Object Key Pattern:** `articles/{articleId}/{yyyy}/{mm}/{uuid}-{filename}`

---

## Summary Checklist

- [ ] R2 bucket with custom domain configured
- [ ] CORS policy set for browser uploads
- [ ] Environment variables added (non-NEXT_PUBLIC prefix)
- [ ] `article_images` table created in Supabase
- [ ] Signed upload URL API endpoint created
- [ ] CMS multi-image upload with progress/retry
- [ ] `next.config.ts` remotePatterns configured
- [ ] `ArticleImage` and `ArticleGallery` components created
- [ ] Article pages render from R2 URLs
- [ ] Cleanup job for orphaned R2 objects
- [ ] Security hardening (authz, file validation, rate-limiting)
- [ ] Full testing validation (local → staging → production)

---

## Notes

- Supabase Storage remains for profile photos and app docs
- R2 is specifically for CMS article images (hero, gallery, rich-text embedded)
- All R2 secrets are server-side only (no `NEXT_PUBLIC_` prefix)
- Use signed URLs for secure browser-to-R2 uploads

