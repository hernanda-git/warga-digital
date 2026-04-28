# Storage Migration: Supabase Storage → Cloudflare R2

Migrate all file storage from Supabase Storage buckets to Cloudflare R2, following the existing pattern used by Jualan media and CMS/Artikel images.

## Architecture Overview

### Current State

| Feature | Provider | Bucket / Key Prefix | Access | DB Column | Stored Value |
|---------|----------|--------------------|--------|-----------|-------------|
| Avatars | Supabase | `avatars/` | Public URL | `users.avatar_path` | Relative path (`{userId}/avatar.jpg`) |
| Jasa images | Supabase | `jasa-images/` | Public URL | `jasa_service_media.url` | Full Supabase URL |
| Kas RT attachments | Supabase | `kas-rt-attachments/` | Signed URL (private) | `kas_rt_attachments.storage_path` | Relative path |
| Jualan media | **R2 ✓** | `jualan/` | Public URL | `jualan_item_media.url` | Full R2 public URL |
| Artikel images | **R2 ✓** | `articles/` | Public URL | `article_images.url` | Full R2 public URL |

### Target State

| Feature | Provider | Key Prefix | Access | DB Column Change? |
|---------|----------|-----------|--------|-------------------|
| Avatars | R2 | `avatars/{userId}/avatar.{ext}` | Public URL | **No** — keep relative path |
| Jasa images | R2 | `jasa-images/{userId}/{serviceId}/{file}` | Public URL | **Yes** — replace full URLs |
| Kas RT attachments | R2 | `kas-rt/{txId}/{file}` | Presigned GET URL | **No** — keep relative path |
| Jualan media | R2 | `jualan/` | Public URL | Unchanged |
| Artikel images | R2 | `articles/` | Public URL | Unchanged |

## Strategy: One-Time Migration + Atomic Deploy

> **Approach**: Copy all existing files from Supabase → R2, update DB records, deploy code atomically.

### Why not dual-read?
- Cleaner code — no fallback/feature-flag logic needed
- All reads go through one path (R2)
- Old Supabase storage can be cleaned up after verification

## Key Object Key Patterns

```
avatars/{userId}/avatar.{ext}
jasa-images/{userId}/{serviceId}/{timestamp}-{random}.{ext}
kas-rt/{transactionId}/{timestamp}-{random}.{ext}
```

## Phase 1 — R2 Library Enhancements ✅

### File: `src/lib/r2.ts`

**New functions added:**

| Function | Purpose | Replaces |
|----------|---------|----------|
| `serverUpload(body, objectKey, contentType)` | Direct server-side upload (PutObjectCommand) | `supabase.storage.from().upload()` |
| `generateSignedGetUrl(objectKey, expiresIn)` | Presigned GET URL for private files | `supabase.storage.from().createSignedUrl()` |
| `getPublicUrl(objectKey)` | Construct public URL from key | `${SUPABASE_URL}/storage/v1/object/public/...` |
| `extractObjectKey(publicUrl)` | Extract key from R2 public URL | — |

**New/expanded constants:**

| Constant | Value | Used By |
|----------|-------|---------|
| `ALLOWED_IMAGE_TYPES` | Added `image/heic`, `image/avif` | Avatars, jasa |
| `ALLOWED_ATTACHMENT_TYPES` | `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf` | Kas RT |
| `MAX_IMAGE_FILE_SIZE` | 10MB | Images |
| `MAX_ATTACHMENT_FILE_SIZE` | 10MB | Kas RT attachments |
| `MAX_AVATAR_FILE_SIZE` | 5MB | Avatars |
| `DEFAULT_SIGNED_GET_URL_EXPIRY` | 3600s (1 hour) | Kas RT signed URLs |

### Backward compatibility
- `ALLOWED_IMAGE_TYPES` kept and expanded (not renamed)
- `MAX_FILE_SIZE` deprecated in favor of `MAX_IMAGE_FILE_SIZE` (kept for now to not break imports)
- `isAllowedContentType`, `isValidFileSize` unchanged

## Phase 2 — Rewrite Upload APIs

### 2a. Avatars

**Files to modify:**

| File | Operation | Change |
|------|-----------|--------|
| `src/app/api/profile/avatar/route.ts` | POST (upload) | `supabase.storage.from("avatars").upload()` → `serverUpload()` |
| `src/app/api/admin/users/avatar/route.ts` | POST (upload) | Same as above |
| `src/app/api/admin/users/avatar/route.ts` | DELETE | `supabase.storage.from("avatars").remove()` → `deleteObject()` |
| `src/app/api/organisation/members/avatar/route.ts` | POST (upload) | Same as profile avatar |

**Key pattern for uploads:**
```typescript
// Before
const { error: uploadError } = await supabase.storage
  .from("avatars")
  .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true });

const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? "";
const profilePictureUrl = `${baseUrl}/storage/v1/object/public/avatars/${path}`;

// After
const { publicUrl } = await serverUpload(
  await file.arrayBuffer(),
  path, // key = "avatars/{userId}/avatar.{ext}"
  file.type,
);

const profilePictureUrl = publicUrl;
```

**> Database column `users.avatar_path` stays as relative path** — the value stored is the R2 key, same as before.

### 2b. Jasa Images

**Files to modify:**

| File | Operation | Change |
|------|-----------|--------|
| `src/app/api/jasa/route.ts` | POST (create with image) | Upload to R2, store R2 public URL |
| `src/app/api/jasa/[id]/upload/route.ts` | POST (upload) | Upload to R2, store R2 public URL |
| `src/app/api/jasa/[id]/route.ts` | DELETE (cleanup) | Extract key from URL → `deleteObject()` |
| `src/app/api/jasa/[id]/media/[mediaId]/route.ts` | DELETE (single media) | Extract key from URL → `deleteObject()` |

**> Database column `jasa_service_media.url` stores the **full public URL** — same as before, but now R2 URL instead of Supabase URL.**

**Extracting object key from stored URL:**
```typescript
// Before: extract from Supabase URL
const parts = url.split("/jasa-images/");
const path = parts[1] || null;
await supabase.storage.from("jasa-images").remove([path]);

// After: extract from R2 URL
const objectKey = extractObjectKey(url);
if (objectKey) await deleteObject(objectKey);
```

### 2c. Kas RT Attachments

**Files to modify:**

| File | Operation | Change |
|------|-----------|--------|
| `src/app/api/kas-rt/transactions/route.ts` | POST (create + upload) | Upload to R2, generate presigned GET URL for response |
| `src/app/api/kas-rt/transactions/[id]/route.ts` | PUT (update + upload) | Same |
| `src/app/api/kas-rt/transactions/[id]/attachments/route.ts` | POST (add) | Same |
| `src/app/api/kas-rt/transactions/[id]/attachments/route.ts` | DELETE (remove) | `deleteObject()` |
| `src/app/kas-rt/data.ts` | GET (list) | Generate presigned GET URLs |

**Key difference:** Kas RT uses a **private** bucket in Supabase with **signed URLs**. On R2, we use **presigned GET URLs** instead.

```typescript
// Before: upload
const { error: uploadError } = await supabase.storage
  .from("kas-rt-attachments")
  .upload(path, file, { contentType: file.type || undefined });

// After: upload
await serverUpload(
  file, // Supported: File implements Blob interface
  `kas-rt/${path}`, // key
  file.type || "application/octet-stream",
);
```

```typescript
// Before: generate signed URL
const { data } = await supabase.storage
  .from("kas-rt-attachments")
  .createSignedUrl(path, 3600);
const url = data?.signedUrl ?? "";

// After: generate presigned GET URL
const url = await generateSignedGetUrl(`kas-rt/${path}`, 3600);
```

**Important:** The `storage_path` column in `kas_rt_attachments` stores the **relative key path**. We'll modify uploads to prepend `kas-rt/` prefix when storing. Migration script will also update existing rows.

## Phase 3 — Update Avatar URL Reads

All code that constructs avatar URLs from `avatar_path` must be updated.

**Files to modify (10 files):**

| File | Line(s) | Pattern to Replace |
|------|---------|-------------------|
| `src/app/api/profile/route.ts` | ~390-393 | `${baseUrl}/storage/v1/object/public/avatars/${path}` |
| `src/app/api/artikel/route.ts` | ~10-13 | Same + `SUPABASE_URL`/`AVATARS_BUCKET` env vars |
| `src/app/api/artikel/[slug]/route.ts` | ~11-14 | Same |
| `src/app/api/jualan/route.ts` | ~14-17 | Same |
| `src/app/api/organisation/route.ts` | ~57-58 | Same |
| `src/app/api/organisation/members/[id]/route.ts` | ~31-32 | Same |
| `src/app/api/organisation/roles/[id]/members/route.ts` | ~28-29 | Same |
| `src/app/api/organisation/community-users/route.ts` | ~70-71 | Same |
| `src/app/api/admin/warga/route.ts` | ~181-182 | Same |
| `src/app/landing/data.ts` | ~20-23 | Same |

**New pattern (all 10 files):**
```typescript
import { getPublicUrl } from "@/lib/r2";

function getAvatarUrl(avatarPath: string | null): string | null {
  if (!avatarPath) return null;
  return getPublicUrl(avatarPath); // key is already "avatars/{userId}/avatar.{ext}"
}
```

**Important note:** Some files declare local `SUPABASE_URL` and `AVATARS_BUCKET` constants. After migration, remove those and import `getPublicUrl` from `@/lib/r2`.

## Phase 4 — Data Migration Script

One-time Node.js script to copy existing files from Supabase to R2.

### Script: `scripts/migrate-storage-to-r2.mjs`

**What it does:**

1. Iterates all rows in `users` where `avatar_path IS NOT NULL`
2. Downloads each file from Supabase Storage via public URL
3. Uploads to R2 using `serverUpload()` with matching key
4. Updates `jasa_service_media.url` — replaces Supabase URL base with R2 URL
5. Updates `kas_rt_attachments.storage_path` — prepends `kas-rt/` prefix
6. Reports progress and errors

### Pre-Migration Checklist

- [ ] Supabase Storage bucket files are accessible via public URLs
- [ ] R2 bucket is created and configured
- [ ] R2 env vars (`R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`, etc.) are set in `.env`
- [ ] `R2_PUBLIC_BASE_URL` resolves correctly (e.g. `https://oo.warga-digital.com`)
- [ ] CORS is configured on R2 bucket (if browser upload needed later)
- [ ] Run on staging environment first

### Migration Steps

1. Run the migration script:
   ```bash
   node scripts/migrate-storage-to-r2.mjs
   ```
2. Verify migrated files are accessible via R2 public URLs
3. Run a diff/spot-check on a sample of records

## Phase 5 — Deploy

### Deployment Checklist

Before deploy:
- [ ] Phase 1 (R2 lib) committed and merged
- [ ] Phase 2 (upload APIs) all files modified
- [ ] Phase 3 (avatar URL reads) all 10 files modified
- [ ] Data migration script completed successfully
- [ ] All DB records point to correct R2 paths
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

After deploy:
- [ ] Verify profile avatar upload works
- [ ] Verify admin avatar upload/delete works
- [ ] Verify org member avatar upload works
- [ ] Verify jasa image upload works
- [ ] Verify jasa image delete works
- [ ] Verify kas-rt attachment upload + read works
- [ ] Verify kas-rt attachment delete works
- [ ] Verify avatar URLs render correctly on Landing, Artikel, Jualan, Organisasi pages
- [ ] Verify image proxy still works (CSP + remote patterns)
- [ ] Supabase Storage `avatars`, `jasa-images`, `kas-rt-attachments` buckets can be emptied/deprovisioned

## Rollback Plan

If issues are found after deploy:

1. **Code rollback**: Revert to previous commit (old code reads Supabase URLs)
2. **Data rollback**: The migration script is one-way. To reverse:
   - Keep Supabase Storage buckets intact (do NOT delete them during deployment)
   - If DB records were overwritten, restore from backup
3. **Dual-read safety**: The migration script should **not delete** any Supabase data — it only copies + updates DB records

## Environment Variables

### New variables needed
None — reuse existing R2 env vars:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL`

### Variables that become unused after migration
- `SUPABASE_BUCKET_KAS_RT` (optional override for bucket name)
- Any future `SUPABASE_BUCKET_*` vars

### Variables kept (still used for other purposes)
- `SUPABASE_URL` (database, auth, realtime — not storage)
- `SUPABASE_KEY` (auth)
- `SUPABASE_SERVICE_ROLE_KEY` (admin operations)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Migration script error midway | Some records updated, some not | Script should be transactional or idempotent. Run in dry-run mode first. |
| Signed URLs expire (kas-rt) | Broken attachment links | R2 signed URLs work identically to Supabase. `DEFAULT_SIGNED_GET_URL_EXPIRY` = 3600s. |
| HEIC images not supported by browser | Broken avatars on iOS | R2 serves the raw file — browser handles display. Same as Supabase. |
| R2 public URL changes | All stored URLs break | `R2_PUBLIC_BASE_URL` is stable. If it changes, run migration script again. |
| Rate limiting on Supabase download | Slow migration | Add delays/batch processing to migration script. |
