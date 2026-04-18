# R2 + Supabase CMS Image Integration - Security Checklist

## Overview

This document provides a comprehensive security checklist for the R2 + Supabase CMS image integration. All items must be verified before production deployment.

**Last Updated:** 2026-05-01  
**Version:** 1.0.0

---

## Pre-Deployment Security Checklist

### 1. Environment Variables & Secrets

- [ ] **R2 secrets stored only in server-side environment variables**
  - `R2_ACCOUNT_ID` - No `NEXT_PUBLIC_` prefix
  - `R2_ACCESS_KEY_ID` - No `NEXT_PUBLIC_` prefix
  - `R2_SECRET_ACCESS_KEY` - No `NEXT_PUBLIC_` prefix
  - `R2_BUCKET_NAME` - Can be public if needed
  - `R2_PUBLIC_BASE_URL` - Safe for client-side use

- [ ] **Sensitive keys do NOT have `NEXT_PUBLIC_` prefix**
  - Verify in `.env.development` and production secrets
  - Run: `grep -r "NEXT_PUBLIC_R2" src/`

- [ ] **`.env.development` is gitignored**
  - Check `.gitignore` includes `.env.development` or `.env*`
  - Never commit environment files to version control

- [ ] **Production secrets configured in hosting platform**
  - Vercel: Environment Variables settings
  - Other: Platform-specific secret management

---

### 2. Client Bundle Security

- [ ] **No R2 secret keys appear in client-side JavaScript bundles**
  - Build the project and check the `.next` directory
  - Search for secret keys in built files

- [ ] **No `console.log` statements exposing credentials**
  - Run: `grep -r "console.log.*R2" src/`
  - Remove any debug logging that exposes secrets

- [ ] **Environment variables checked at build time**
  - Verify build fails if required secrets are missing
  - Use TypeScript to enforce server-only usage

- [ ] **API routes validated for correct runtime**
  - Upload endpoint should use Node.js runtime (not Edge)
  - Verify in `route.ts` files

---

### 3. Upload Endpoint Protection

- [ ] **`POST /api/cms/articles/upload-url` requires authentication**
  - Check for `getSessionFromCookie()` or similar auth check
  - Verify 401 response for unauthenticated requests

- [ ] **User authorization verified**
  - Users can only upload to articles they own
  - Admin role check for elevated permissions
  - Verify 403 response for unauthorized access

- [ ] **Rate-limiting applied**
  - Default: 20 requests per minute per user
  - Configurable based on needs
  - Prevents abuse and DoS attacks

- [ ] **Request body validated**
  - All required fields present
  - Field types and formats validated
  - Generic error messages to prevent information leakage

---

### 4. File Validation (Server-Side)

- [ ] **File type allowlist enforced**
  - Allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
  - MIME type verified from file content, not just extension
  - Reject all other file types

- [ ] **Max file size enforced**
  - Default: 5MB per image
  - Configurable in `src/lib/r2.ts`
  - Reject files exceeding limit

- [ ] **File content scanned for valid image format**
  - Magic bytes verification implemented
  - Prevents file type spoofing attacks
  - See `src/lib/validation/image-validation.ts`

- [ ] **Filename sanitization**
  - Removes spaces, special characters
  - Prevents path traversal attempts
  - Maximum length: 255 characters

---

### 5. Object Key Generation

- [ ] **Object keys generated server-side only**
  - Client cannot specify custom object keys
  - All keys generated in `generateObjectKey()` function

- [ ] **Object key pattern enforced**
  - Format: `articles/{articleId}/{yyyy}/{mm}/{uuid}-{sanitized-filename}`
  - UUID prefix required for collision prevention
  - No user-controlled path components

- [ ] **Deterministic and predictable**
  - Same file gets same key (for deduplication)
  - Easy to trace back to source article

---

### 6. CORS Configuration

- [ ] **R2 bucket CORS configured with minimal origins**
  - Development: `http://localhost:3000`
  - Staging: Your staging domain
  - Production: `https://wargadigital.id`

- [ ] **Only necessary HTTP methods allowed**
  - `GET` - For image retrieval
  - `PUT` - For signed URL uploads
  - `POST` - For multipart uploads (if used)
  - `HEAD` - For metadata checks

- [ ] **Allowed headers configured**
  - `Content-Type` - For file uploads
  - `Authorization` - For authenticated requests
  - `*` for development (restrict in production)

---

### 7. Audit & Monitoring

- [ ] **Upload actions logged**
  - User ID
  - Timestamp
  - Object key
  - File metadata (size, type)

- [ ] **Delete actions logged**
  - User ID
  - Timestamp
  - Object key
  - Reason for deletion

- [ ] **Failed upload attempts logged**
  - User ID (if authenticated)
  - Timestamp
  - Failure reason
  - IP address

- [ ] **Alerting configured**
  - Unusual upload failure spikes
  - Rate limit breaches
  - Failed authentication attempts

- [ ] **Audit logs stored securely**
  - In Supabase `audit_logs` table
  - Or external logging service (Sentry, LogRocket, etc.)
  - Immutable (no updates/deletes)

---

### 8. Content Security Policy

- [ ] **CSP header includes R2 media domain**
  - `img-src 'self' data: https://oo.warga-digital.com;`
  - Also include R2 wildcard URL for testing
  - Configured in `src/middleware.ts`

- [ ] **Other CSP directives configured**
  - `default-src 'self'`
  - `script-src 'self' 'unsafe-inline'`
  - `style-src 'self' 'unsafe-inline'`
  - `connect-src 'self'`

---

### 9. Production Hardening

- [ ] **R2 dev URL accessible**
  - Public URL is accessible
  - HTTPS enabled
  - No mixed content warnings

- [ ] **R2 bucket has no public write access**
  - Only signed URLs can upload
  - No public write policies
  - Verify in Cloudflare dashboard

- [ ] **API routes have proper error handling**
  - No stack traces exposed to client
  - Generic error messages
  - Proper HTTP status codes

- [ ] **Input validation errors return generic messages**
  - Don't reveal internal implementation details
  - Don't expose database schema
  - Don't leak file paths

- [ ] **Database queries use parameterized statements**
  - Supabase client handles this automatically
  - No raw SQL with user input
  - Prevents SQL injection

---

## Security Testing Checklist

### Manual Testing

- [ ] **Test unauthenticated upload attempts**
  - Should return 401 Unauthorized
  - No upload URL generated

- [ ] **Test unauthorized upload attempts**
  - Try to upload to another user's article
  - Should return 403 Forbidden

- [ ] **Test file type validation**
  - Try uploading non-image files (PDF, EXE, etc.)
  - Should return 400 Bad Request

- [ ] **Test file size validation**
  - Try uploading files > 5MB
  - Should return 400 Bad Request

- [ ] **Test rate limiting**
  - Make rapid requests to upload endpoint
  - Should be rate-limited after threshold

- [ ] **Test path traversal attempts**
  - Try filenames with `../` or other path components
  - Should be rejected or sanitized

### Automated Testing

- [ ] **Run security verification script**
  ```bash
  npx tsx scripts/verify-r2-security.ts
  ```
  - All checks should pass
  - Address any failures before deployment

- [ ] **Run dependency audit**
  ```bash
  npm audit
  ```
  - Fix high/critical vulnerabilities
  - Keep dependencies updated

- [ ] **Run linter with security rules**
  ```bash
  npm run lint
  ```
  - Fix all linting errors
  - Enable security-focused ESLint rules

---

## Monitoring & Incident Response

### Monitoring Metrics

- [ ] **Upload success rate**
  - Alert if drops below 95%
  - Indicates potential issues

- [ ] **Upload failure rate by error type**
  - Track common failure reasons
  - Identify patterns for improvement

- [ ] **Storage usage growth**
  - Monitor R2 bucket size
  - Alert on unusual growth spikes

- [ ] **API response times**
  - Upload URL generation latency
  - Image upload completion time

### Incident Response

- [ ] **Document incident response procedures**
  - Who to notify
  - How to investigate
  - How to remediate

- [ ] **Prepare rollback procedures**
  - How to disable image uploads
  - How to revert to previous version
  - How to clean up compromised data

- [ ] **Test incident response**
  - Run tabletop exercises
  - Verify communication channels
  - Validate rollback procedures

---

## Compliance & Legal

- [ ] **Data retention policy defined**
  - How long to keep images
  - When to delete orphaned files
  - User data deletion procedures

- [ ] **Privacy policy updated**
  - Mention image storage in R2
  - Explain data processing
  - Provide opt-out options

- [ ] **Terms of service updated**
  - Image upload guidelines
  - Content moderation policy
  - User responsibilities

---

## Post-Deployment Verification

After deployment to production, verify:

- [ ] **Upload functionality works end-to-end**
- [ ] **Images render correctly on article pages**
- [ ] **Error messages are user-friendly**
- [ ] **Performance is acceptable**
- [ ] **Security headers are present**
- [ ] **CSP is active and working**
- [ ] **Rate limiting is effective**
- [ ] **Audit logs are being created**
- [ ] **Monitoring alerts are configured**

---

## Security Resources

### Documentation
- [Cloudflare R2 Security Best Practices](https://developers.cloudflare.com/r2/)
- [Supabase Security Guide](https://supabase.com/docs/guides/security)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### Tools
- [Security verification script](../../scripts/verify-r2-security.ts)
- [Image validation utility](../../src/lib/validation/image-validation.ts)
- [R2 client utility](../../src/lib/r2.ts)

### Contacts
- Security Team: [security@wargadigital.id]
- DevOps Team: [devops@wargadigital.id]
- On-Call Engineer: [oncall@wargadigital.id]

---

## Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-05-01 | 1.0.0 | Initial version | Security Team |

---

**Note:** This checklist should be reviewed and updated regularly as new security threats emerge and the system evolves.