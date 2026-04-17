# R2 CMS Image Upload - Issues & Solutions

## Overview

This document describes the issues encountered during CMS article image upload to Cloudflare R2 storage and the solutions implemented.

## Architecture

The image upload flow uses **direct browser-to-R2 upload** pattern:

```
┌─────────────┐     Signed URL      ┌─────────────┐    PUT     ┌──────────┐
│   Browser   │ ─────────────────▶  │   Next.js   │ ────────▶ │    R2    │
│   (Client)  │                    │   API       │            │  Bucket  │
└─────────────┘                    └─────────────┘            └──────────┘
      │                                   │
      │                                   │ Create record
      ▼                                   ▼
┌─────────────┐                    ┌─────────────┐
│   Display   │                    │ Supabase DB │
│   (img-src) │                    │ (article_images) │
└─────────────┘                    └─────────────┘
```

### Flow Steps

1. **Request Signed URL**: Browser requests upload URL from `/api/cms/articles/upload-url`
2. **Upload to R2**: Browser PUTs file directly to R2 using signed URL
3. **Create DB Record**: After successful upload, create record in `article_images` table
4. **Display**: Images displayed using R2 public URL

## Issues Encountered

### 1. CSP Blocking R2 Connection

**Error**: 
```
Connecting to 'https://warga-digital.a3741a45036312dd344b76c17dbe7bef.r2.cloudflarestorage.com/...'
violates the following Content Security Policy directive: "connect-src 'self'"
```

**Cause**: Middleware CSP didn't allow connections to R2 bucket domain.

**Solution**: Add R2 domains to CSP `connect-src` in `src/middleware.ts`:

```typescript
// src/middleware.ts
response.headers.set(
  "Content-Security-Policy",
  "default-src 'self'; ... connect-src 'self' https://*; ..."
);
```

### 2. CORS Error on R2 Upload

**Error**:
```
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Cause**: R2 bucket CORS policy not configured.

**Solution**: Configure CORS in Cloudflare Dashboard:
- Go to: **R2 → Your bucket → Settings → CORS policy**
- Add:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://your-production-domain.vercel.app"],
    "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
    "AllowedHeaders": ["*"]
  }
]
```

### 3. SSL Certificate Invalid on Custom Domain

**Error**:
```
net::ERR_CERT_AUTHORITY_INVALID
```

**Cause**: Custom R2 domain (`pub-*.r2.dev`) has SSL certificate issues.

**Solution Options**:

#### Option A: Use Native R2 Bucket URL (Recommended)

Update `R2_PUBLIC_BASE_URL` in environment to use native bucket domain:

```
# .env.local / Environment Variables
R2_PUBLIC_BASE_URL=https://warga-digital.a3741a45036312dd344b76c17dbe7bef.r2.cloudflarestorage.com
```

This URL has proper SSL from Cloudflare.

#### Option B: Use Supabase Storage

Supabase storage is already configured with proper SSL. Modify code to save images to Supabase instead of R2 for CMS articles.

#### Option C: Fix Custom Domain SSL

Configure proper SSL certificate for custom domain in Cloudflare:
- Use Cloudflare Origin Certificates, or
- Use Cloudflare Proxy with Full SSL mode

## Current Status

### Working Configuration

- ✅ CSP allows HTTPS connections
- ✅ R2 CORS configured
- ✅ Direct browser-to-R2 upload works
- ⚠️ Image display fails due to SSL on custom R2 domain

### Image Display Fix

In `src/middleware.ts`, ensure `img-src` includes both R2 domains:

```typescript
"img-src 'self' data: https://pub-e8fb49e00b3148128a9aa5967e921be2.r2.dev https://*.r2.cloudflarestorage.com https://*.supabase.co"
```

### Recommended Fix

Update environment variable to use native R2 URL:

```bash
# In your deployment platform (Vercel, etc.)
R2_PUBLIC_BASE_URL=https://warga-digital.a3741a45036312dd344b76c17dbe7bef.r2.cloudflarestorage.com
```

## Files Modified

1. `src/middleware.ts` - CSP configuration
2. `src/app/api/cms/articles/[articleId]/images/route.ts` - Added image creation endpoint
3. `src/app/admin/articles/page.tsx` - Added image record creation after upload
4. `src/lib/r2.ts` - R2 upload utilities

## Environment Variables Required

```bash
# R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=warga-digital
R2_PUBLIC_BASE_URL=https://warga-digital.a3741a45036312dd344b76c17dbe7bef.r2.cloudflarestorage.com
```

## Testing Checklist

- [ ] Upload image via admin panel
- [ ] Verify image appears in R2 bucket
- [ ] Verify image record created in Supabase `article_images` table
- [ ] Verify image displays correctly on article page
- [ ] Test on production domain (not just localhost)

## Future Improvements

1. **Server-side upload**: Upload to Next.js API first, then push to R2 (browsers don't need direct R2 access)
2. **Supabase Storage**: Use Supabase storage instead of R2 (already has proper SSL)
3. **Image optimization**: Add Next.js image optimization with R2 as source
4. **Upload progress**: Improve progress indicator with percentage
5. **Batch upload**: Support multiple image uploads with parallel progress