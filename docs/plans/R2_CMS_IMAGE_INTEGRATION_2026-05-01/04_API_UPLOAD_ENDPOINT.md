
# Sub-Plan 04: Signed URL API Endpoint Implementation

## Objective

Implement `POST /api/cms/articles/upload-url` endpoint to generate pre-signed URLs for direct browser-to-R2 uploads.

---

## Tasks

### 4.1 Create Upload URL API Route

- [ ] Create file: `src/app/api/cms/articles/upload-url/route.ts`
- [ ] Validate request body: `articleId`, `filename`, `contentType`
- [ ] Verify user authentication via session/cookie
- [ ] Verify user authorization: can edit the target article
- [ ] Generate deterministic object key: `articles/{articleId}/{yyyy}/{mm}/{uuid}-{sanitized-filename}`
- [ ] Create R2 signed PUT URL with configurable expiry (e.g., 5 minutes)
- [ ] Return: `{ objectKey, uploadUrl, publicUrl }`

### 4.2 Input Validation

- [ ] Validate `contentType` against allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- [ ] Validate `filename` length and character sanitization
- [ ] Validate `articleId` exists and belongs to accessible article

### 4.3 R2 Client Integration

- [ ] Create/extend R2 client utility in `src/lib/r2.ts`
- [ ] Implement `generateSignedUploadUrl(objectKey, contentType, expiresIn)` function
- [ ] Use `@aws-sdk/client-s3` with R2-compatible endpoint configuration

### 4.4 Error Handling

- [ ] Return 401 for unauthenticated requests
- [ ] Return 403 for unauthorized edit attempts
- [ ] Return 400 for invalid input (bad content type, malformed filename)
- [ ] Return 500 for R2 API failures with generic message (no leaking internal details)

### 4.5 Rate Limiting

- [ ] Add rate limit to upload-url endpoint (e.g., 20 requests per minute per user)
- [ ] Consider using in-memory store or Redis for rate limit tracking

---

## Acceptance Criteria

- Endpoint generates valid signed URL that browser can use for direct PUT
- Invalid content types are rejected with 400
- Unauthenticated requests return 401
- Users cannot generate upload URLs for articles they don't own
- Rate limiting prevents abuse

---

## Dependencies

- [x] Sub-Plan 01: Environment Variables Setup
- [x] Sub-Plan 02: R2 Client Utility

---

## Next Steps

After this sub-plan, proceed to Sub-Plan 05 for frontend CMS multi-image upload UI integration.
