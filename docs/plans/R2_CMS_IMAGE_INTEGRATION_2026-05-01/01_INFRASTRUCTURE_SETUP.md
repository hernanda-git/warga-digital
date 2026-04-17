# Sub-Plan 01: Infrastructure Setup
## Cloudflare R2 + Supabase Storage Integration

### Objective
Set up Cloudflare R2 bucket and custom domain for CMS article images.

---

### Tasks

#### 1.1 R2 Bucket Confirmation
- [ ] Confirm bucket `warga-digital` exists in Cloudflare Dashboard
- [ ] Verify region is set to `Automatic`
- [ ] Note bucket endpoint URL for configuration

#### 1.2 Custom Domain Setup
- [ ] Configure custom domain: `media.wargadigital.id`
- [ ] Enable HTTPS on custom domain
- [ ] Verify DNS propagation for media domain
- [ ] Test public access via custom domain URL

#### 1.3 CORS Policy Configuration
- [ ] Configure R2 bucket CORS for browser direct uploads (if using signed URL approach)
- [ ] Add allowed origins:
  - `http://localhost:3000` (development)
  - `https://wargadigital.id` (production)
  - Add staging domain if applicable
- [ ] Set allowed methods: `GET`, `PUT`, `POST`, `HEAD`
- [ ] Configure `AllowedHeaders: *`
- [ ] Set `MaxAgeSeconds: 3600`

#### 1.4 Access Keys & Security Credentials
- [ ] Create R2 API token in Cloudflare Dashboard
- [ ] Set bucket scope to `warga-digital` only
- [ ] Set permissions: read/write for CMS upload backend
- [ ] Save securely:
  - Account ID
  - Access Key ID
  - Secret Access Key
- [ ] Document backup location for credentials

#### 1.5 Environment Variables
- [ ] Add to `.env.development`:
  ```
  R2_ACCOUNT_ID=your_cloudflare_account_id
  R2_ACCESS_KEY_ID=your_r2_access_key_id
  R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
  R2_BUCKET_NAME=warga-digital
  R2_PUBLIC_BASE_URL=https://media.wargadigital.id
  ```
- [ ] Verify `R2_SECRET_ACCESS_KEY` does NOT have `NEXT_PUBLIC_` prefix
- [ ] Add same variables to production secrets

#### 1.6 Security Validation
- [ ] Verify no R2 secrets are prefixed with `NEXT_PUBLIC_`
- [ ] Confirm bucket is not publicly writable
- [ ] Test that credentials work from server-side only

---

### Dependencies
- Cloudflare account with R2 enabled
- Domain `wargadigital.id` with DNS access
- Access to create API tokens

### Success Criteria
- Bucket accessible via `https://media.wargadigital.id`
- CORS configured for browser uploads
- Environment variables set in `.env.development`
- No secrets leaked to client bundle

### Notes
- If custom domain setup is delayed, can use R2.dev URL temporarily
- Keep Supabase Storage for profile photos and app docs only