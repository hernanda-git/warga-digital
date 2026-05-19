# Cloudflare R2 Setup Guide

**Status:** ✅ Implementation Complete  
**Updated:** 2026-01-20  
**Phase:** 2.5 (Gambar Cover Feature)

---

## Overview

The Gambar Cover (Featured Image) feature requires Cloudflare R2 bucket configuration. This guide walks you through setting up R2 and configuring your environment variables.

---

## Prerequisites

- Cloudflare account (free tier supports R2)
- Access to Cloudflare dashboard
- Node.js project with Next.js 15+
- `.env.local` file in project root

---

## Step 1: Create R2 Bucket

### Via Cloudflare Dashboard

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** (left sidebar)
3. Click **Create Bucket**
4. Enter bucket name: `warga-digital-articles`
5. Choose region: **Auto (Geo-distributed)**
6. Click **Create Bucket**

### Bucket Settings

**CORS Configuration (Required):**

> ⚠️ **Important:** CORS must be configured for the **exact** production domain.
> The `jualan` (marketplace) module previously used direct browser-to-R2 uploads
> which require CORS. As of the latest fix, `jualan` now uses **server-side upload**
> (matching the `jasa` module pattern), which avoids CORS issues entirely.
> However, other modules (articles, branding) still use direct browser uploads.

**Option A — Via Cloudflare Dashboard:**

1. Go to bucket settings
2. Click **CORS** tab
3. Add CORS Rule:

```json
{
  "AllowedOrigins": [
    "https://www.warga-digital.com",
    "https://warga-digital.com",
    "http://localhost:3000"
  ],
  "AllowedMethods": ["GET", "PUT", "POST", "HEAD", "DELETE"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3600
}
```

**Option B — Via Script (recommended):**

Run the CORS configuration script:

```bash
npx tsx scripts/configure-r2-cors.ts
```

To customize origins:

```bash
npx tsx scripts/configure-r2-cors.ts --origins "https://www.warga-digital.com,https://staging.warga-digital.com,http://localhost:3000"
```

---

## Step 2: Create API Token

### Generate R2 API Token

1. In Cloudflare Dashboard, go to **R2**
2. Click **Settings** → **API Tokens**
3. Click **Create API Token**
4. Fill in details:
   - **Token Name:** `warga-digital-r2-upload`
   - **Permissions:** 
     - Read & Write (for object uploads)
   - **Resource Scopes:**
     - Buckets: `warga-digital-articles` (specific)
   - **TTL:** None (never expires)
5. Click **Create Token**
6. **Copy and save** the credentials immediately:
   - Access Key ID
   - Secret Access Key

### Get Account ID

1. Go to **R2** → **Settings**
2. Look for **Account ID** (example: `a1b2c3d4e5f6g7h8`)
3. Copy and save it

---

## Step 3: Configure Environment Variables

### Create `.env.local` file

In your project root, create or update `.env.local`:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=warga-digital-articles
R2_PUBLIC_BASE_URL=https://pub-r2url.s3.us-west-1.amazonaws.com
```

### Getting R2_PUBLIC_BASE_URL

1. Go to Cloudflare Dashboard → **R2**
2. Click on `warga-digital-articles` bucket
3. Look for **Public URL** or **Domain**
4. Example: `https://pub-abc123def456.r2.cloudflarestorage.com`
5. Or use custom domain if configured

### Verify Environment Variables

```bash
# Test that variables are loaded (don't print secrets!)
node -e "console.log('R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME)"
```

---

## Step 4: Verify Configuration

### Check Environment Loading

```typescript
// In src/lib/r2.ts, this function validates config:
function validateR2Config(): void {
  if (!process.env.R2_ACCOUNT_ID) {
    throw new Error('Missing: R2_ACCOUNT_ID');
  }
  if (!process.env.R2_ACCESS_KEY_ID) {
    throw new Error('Missing: R2_ACCESS_KEY_ID');
  }
  if (!process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('Missing: R2_SECRET_ACCESS_KEY');
  }
  if (!process.env.R2_BUCKET_NAME) {
    throw new Error('Missing: R2_BUCKET_NAME');
  }
}
```

### Test Upload

1. Start your Next.js server:
   ```bash
   npm run dev
   ```

2. Navigate to `/admin/articles/compose`

3. Try uploading a small image (< 1MB)

4. Check browser DevTools → Network tab:
   - Look for PUT request to `s3.us-west-1.amazonaws.com`
   - Status should be **200 OK**

5. Check R2 bucket in Cloudflare Dashboard:
   - Navigate to bucket
   - Should see folder: `articles/`
   - Inside: article ID folders
   - Inside: `cover-{timestamp}-{filename}.jpg`

---

## Troubleshooting

### Error: "Missing required R2 environment variables"

**Cause:** Environment variables not loaded

**Solution:**

1. Verify `.env.local` exists in project root (not `src/`)
2. Check file is not in `.gitignore`
3. Restart dev server: `npm run dev`
4. Check each variable:
   ```bash
   echo "R2_ACCOUNT_ID: $R2_ACCOUNT_ID"
   echo "R2_BUCKET_NAME: $R2_BUCKET_NAME"
   ```

### Error: "Invalid Access Key ID"

**Cause:** Wrong credentials

**Solution:**

1. Verify API token was copied correctly (no extra spaces)
2. Check you're using Access Key ID (not token ID)
3. Create new API token and try again
4. Ensure token has R2 read/write permissions

### Error: "The specified bucket does not exist"

**Cause:** Wrong bucket name or deleted bucket

**Solution:**

1. Check bucket still exists in Cloudflare Dashboard
2. Verify spelling: `warga-digital-articles` (exact match)
3. Check bucket is in correct account
4. Create bucket again if needed

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause:** CORS not configured

**Solution:**

1. Go to R2 bucket settings
2. Add CORS rule with:
   - `AllowedOrigins`: Your admin domain + localhost:3000
   - `AllowedMethods`: PUT, GET, POST, HEAD
   - `AllowedHeaders`: *

### Error: "Upload failed" in browser

**Cause:** Network issue or CORS

**Solution:**

1. Check browser console for error details
2. Verify CORS policy is configured
3. Check network connection
4. Try different image size (smaller)
5. Check signed URL hasn't expired (5 min max)

### Upload Succeeds But Image Not Found

**Cause:** R2_PUBLIC_BASE_URL wrong

**Solution:**

1. Get correct public URL from Cloudflare:
   - R2 Dashboard → Bucket → Overview
   - Look for "Public URL"
2. Should look like: `https://pub-xxx.r2.cloudflarestorage.com`
3. Update `.env.local` with correct URL
4. Restart dev server

### Can't See Images in R2 Dashboard

**Cause:** Private bucket or upload permission issue

**Solution:**

1. Check bucket isn't marked as private
2. Verify API token has write permissions
3. Check object key structure:
   - Should be: `articles/{articleId}/cover-{timestamp}-{filename}`
   - Browse manually in bucket to verify

---

## Production Deployment

### For Vercel

1. Add environment variables to Vercel project:
   ```
   Settings → Environment Variables
   ```

2. Add each variable:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_BASE_URL`

3. **Note:** Don't commit `.env.local` to Git!

4. Redeploy after adding variables

### For Other Platforms

1. Set environment variables via platform dashboard
2. Or use `.env` files (check platform docs)
3. Ensure secrets aren't exposed in logs

### Security Best Practices

1. **Never commit .env.local** to Git
2. **Use separate credentials** for staging/production
3. **Rotate API tokens** periodically
4. **Restrict token permissions** to minimum needed
5. **Monitor R2 usage** for unexpected uploads
6. **Set up alerts** in Cloudflare for high usage

---

## Environment Variable Reference

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `R2_ACCOUNT_ID` | ✅ Yes | `a1b2c3d4e5f6g7h8` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | ✅ Yes | `1234567890abcdef` | API token access key |
| `R2_SECRET_ACCESS_KEY` | ✅ Yes | `abc123def456ghi789` | API token secret |
| `R2_BUCKET_NAME` | ✅ Yes | `warga-digital-articles` | R2 bucket name |
| `R2_PUBLIC_BASE_URL` | ✅ Yes | `https://pub-xxx.r2.cloudflarestorage.com` | Public URL for images |

---

## Testing Upload Flow

### Manual Test

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/admin/articles/compose`

3. Log in with test account

4. Enter article title: "Test Article"

5. Slug auto-generates

6. Click "Gambar Cover" → select test image (< 5MB)

7. Image preview displays

8. Click "Publikasi"

9. Wait for upload (watch footer: "Mengunggah gambar...")

10. Check DevTools Network tab:
    - PUT request to `s3.us-west-1.amazonaws.com`
    - Status 200

11. Verify in Cloudflare:
    - R2 Dashboard → Bucket → Browse
    - Should see: `articles/{id}/cover-{ts}-{name}.jpg`

12. Verify in Database:
    - Article record should have `featured_image_url`
    - URL should be: `https://pub-xxx.../articles/{id}/cover-...jpg`

### Automated Test (Future)

```typescript
describe('R2 Upload Integration', () => {
  it('should upload image and return public URL', async () => {
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const articleId = 'test-article-id';
    
    const { uploadUrl, publicUrl } = await getSignedUploadUrl(
      `articles/${articleId}/cover-test.jpg`,
      'image/jpeg'
    );
    
    expect(uploadUrl).toContain('s3.us-west-1.amazonaws.com');
    expect(publicUrl).toContain('pub-');
  });
});
```

---

## Cost Estimation

### Cloudflare R2 Pricing (as of 2026)

| Item | Cost |
|------|------|
| Storage | $0.015/GB/month |
| PUT/PATCH requests | $0.006/million |
| GET/HEAD requests | $0.0006/million |
| Class A operations | $0.006/million |
| Class B operations | $0.0006/million |

### Example Usage (1000 articles with 1MB cover each)

```
Storage: 1GB × $0.015 = $0.015/month
Uploads: 1000 × $0.006/million = $0.000006/month
Downloads: Varies by views
─────────────────────────
Estimated: < $0.10/month for small site
```

---

## Common Issues & Solutions

### Variables Show in Production But Error Remains

**Cause:** Next.js caches environment at build time

**Solution:**

1. Rebuild/redeploy application
2. Ensure variables set before build starts
3. Check `next.config.ts` isn't hiding variables

### Upload Succeeds, But URL Returns 403

**Cause:** R2 bucket is private

**Solution:**

1. Check bucket isn't marked private in R2 settings
2. Verify public URL is correct
3. Check CORS policy allows GET requests

### Signed URL Expires Too Quickly

**Cause:** Expiry time too short

**Solution:**

- Default is 300 seconds (5 minutes)
- Can increase in `src/app/admin/articles/compose/actions.ts`
- Don't set too high (security risk)
- Recommended: 300-600 seconds

### Different Upload URL Each Time

**Cause:** Expected behavior (signed URLs are unique)

**Solution:**

- Each upload gets new signed URL
- Same object key will replace previous file
- This is correct and secure

---

## Advanced Configuration

### Custom Domain for Images

1. In Cloudflare R2 bucket settings
2. Click **Settings** → **Custom Domain**
3. Enter domain: `images.yoursite.com`
4. Update `R2_PUBLIC_BASE_URL` in `.env.local`:
   ```
   R2_PUBLIC_BASE_URL=https://images.yoursite.com
   ```

### Lifecycle Rules (Auto-Delete Old Uploads)

1. In R2 bucket → **Settings** → **Lifecycle Rules**
2. Delete objects after 90 days (recommended for drafts)
3. Keep published images permanently

### Usage Analytics

1. Cloudflare Dashboard → **R2**
2. View monthly costs and bandwidth
3. Monitor for unusual activity

---

## Security Checklist

- [ ] API token created with minimal permissions
- [ ] Secrets stored in `.env.local` (not committed to Git)
- [ ] CORS policy restricts to your domains
- [ ] Signed URLs expire after 5 minutes
- [ ] R2 bucket set to private (public via signed URLs only)
- [ ] Access logs enabled in production
- [ ] Separate credentials for staging/production
- [ ] Token rotation planned (quarterly)

---

## Support Resources

- **Cloudflare R2 Docs:** https://developers.cloudflare.com/r2/
- **AWS S3 Compatibility:** https://developers.cloudflare.com/r2/api/s3/
- **Signed URLs:** https://developers.cloudflare.com/r2/api/s3/tokens/

---

## Next Steps

1. ✅ Create R2 bucket
2. ✅ Generate API token
3. ✅ Get account ID
4. ✅ Configure environment variables
5. ✅ Test upload flow
6. ⏳ Monitor usage in production
7. ⏳ Set up lifecycle rules
8. ⏳ Plan token rotation

---

**Status:** ✅ Ready for testing  
**Last Updated:** 2026-01-20  
**Questions?** Check Cloudflare R2 documentation