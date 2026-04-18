# Sub-Plan 08: Security Hardening Checklist

## Overview

This sub-plan covers security hardening measures for the R2 + Supabase CMS image integration. All items must be verified before production deployment.

---

## Security Checklist

### 13.1 Environment Variables & Secrets

- [ ] R2 secrets stored only in server-side environment variables
- [ ] Sensitive keys do NOT have `NEXT_PUBLIC_` prefix
- [ ] `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` are server-only
- [ ] `R2_PUBLIC_BASE_URL` can be exposed to client safely
- [ ] `.env.development` is gitignored
- [ ] Production secrets configured in hosting platform (Vercel/other)

### 13.2 Client Bundle Security

- [ ] No R2 secret keys appear in client-side JavaScript bundles
- [ ] No `console.log` statements exposing credentials
- [ ] Environment variables checked at build time for accidental exposure
- [ ] API routes validated for correct `runtime` setting (edge vs node)

### 13.3 Upload Endpoint Protection

- [ ] `POST /api/cms/articles/upload-url` requires authentication
- [ ] User authorization verified: can only upload to articles they own/can edit
- [ ] Rate-limiting applied to upload URL generation endpoint
- [ ] Request body validated before processing

### 13.4 File Validation (Server-Side)

- [ ] File type allowlist enforced: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- [ ] MIME type verified from file content, not just extension
- [ ] Max file size enforced (recommended: 5MB for images)
- [ ] File content scanned for valid image format (magic bytes)
- [ ] Filename sanitization removes: spaces, special characters, path traversal attempts

### 13.5 Object Key Generation

- [ ] Object keys generated server-side only
- [ ] Client cannot specify custom object keys
- [ ] Object key pattern enforced: `articles/{articleId}/{yyyy}/{mm}/{uuid}-{sanitized-filename}`
- [ ] UUID prefix required for collision prevention
- [ ] No user-controlled path components in object key

### 13.6 CORS Configuration

- [ ] R2 bucket CORS configured with minimal required origins
- [ ] Only necessary HTTP methods allowed (GET, PUT, POST, HEAD)
- [ ] Staging domain included in allowed origins
- [ ] Production domain included in allowed origins
- [ ] Localhost development origin included (with wildcard for port)
- [ ] If no browser direct upload: CORS can be more restrictive

### 13.7 Audit & Monitoring

- [ ] Upload actions logged with user ID, timestamp, object key
- [ ] Delete actions logged with user ID, timestamp, object key
- [ ] Failed upload attempts logged with reason
- [ ] Alerting configured for unusual upload failure spikes
- [ ] Audit logs stored in Supabase or external logging service

### 13.8 Content Security Policy (Optional)

- [ ] CSP header includes R2 media domain in `img-src`
- [ ] Example: `img-src 'self' data: https://oo.warga-digital.com;`
- [ ] CSP configured in `next.config.ts` or hosting platform headers

### 13.9 Production Hardening

- [ ] Custom domain HTTPS verified and working
- [ ] R2 bucket has no public access unless via signed URLs/custom domain
- [ ] API routes have proper error handling (no stack traces exposed)
- [ ] Input validation errors return generic messages to client
- [ ] Database queries use parameterized statements (no SQL injection)

---

## Implementation Notes

### Server-Only Environment Variable Pattern

```ts
// lib/r2.ts - server-side only
export const r2Config = {
  accountId: process.env.R2_ACCOUNT_ID!,       // server-only
  accessKeyId: process.env.R2_ACCESS_KEY_ID!, // server-only
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, // server-only
  bucketName: process.env.R2_BUCKET_NAME!,
  publicBaseUrl: process.env.R2_PUBLIC_BASE_URL!, // safe for client
}
```

### File Validation Helper

```ts
// lib/validation/image-validation.ts
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' };
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'File too large' };
  }
  return { valid: true };
}
```

---

## Verification Commands

```bash
# Verify no NEXT_PUBLIC_ prefix on secrets
grep -r "NEXT_PUBLIC_R2" src/ --include="*.ts" --include="*.tsx"

# Verify no secret logging
grep -r "console.log.*R2" src/ --include="*.ts" --include="*.tsx"

# Verify API routes have auth check
grep -r "auth" src/app/api/cms/articles/upload-url/route.ts
```

---

## Related Sub-Plans

- [01_INFRASTRUCTURE_SETUP.md](./01_INFRASTRUCTURE_SETUP.md) - R2 bucket and domain configuration
- [03_API_ENDPOINTS.md](./03_API_ENDPOINTS.md) - Upload URL endpoint implementation
- [05_DATABASE_SCHEMA.md](./05_DATABASE_SCHEMA.md) - Article images table structure

---

**Status**: Pending  
**Owner**: Backend/Security  
**Last Updated**: 2026-05-01