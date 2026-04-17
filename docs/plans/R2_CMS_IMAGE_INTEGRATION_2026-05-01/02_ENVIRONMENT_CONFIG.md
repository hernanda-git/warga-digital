
warga-digital\docs\plans\R2_CMS_IMAGE_INTEGRATION_2026-05-01\02_ENVIRONMENT_CONFIG.md
```

# Sub-Plan 02: Environment Variables Configuration

## Objective

Add Cloudflare R2 credentials and configuration to the Next.js environment files for server-side-only access.

## Prerequisites

- [ ] Cloudflare R2 bucket `warga-digital` created
- [ ] R2 API token created with read/write permissions for `warga-digital` bucket
- [ ] Custom domain `media.wargadigital.id` configured (or R2.dev URL available)

## Tasks

### 1. Update `.env.development`

Add the following variables to your local development environment file:

```env
# Cloudflare R2 (server-side only - DO NOT prefix with NEXT_PUBLIC_)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=warga-digital
R2_PUBLIC_BASE_URL=https://media.wargadigital.id
```

### 2. Document Required Variables

| Variable | Description | Required | Sensitive |
|----------|-------------|----------|-----------|
| `R2_ACCOUNT_ID` | Cloudflare account identifier | Yes | Yes |
| `R2_ACCESS_KEY_ID` | R2 API access key ID | Yes | Yes |
| `R2_SECRET_ACCESS_KEY` | R2 API secret access key | Yes | Yes |
| `R2_BUCKET_NAME` | R2 bucket name (`warga-digital`) | Yes | No |
| `R2_PUBLIC_BASE_URL` | Public-facing base URL for images | Yes | No |

### 3. Verify No Client-Side Leakage

- [ ] Confirm no `NEXT_PUBLIC_` prefix on any R2 secret variables
- [ ] Verify `R2_PUBLIC_BASE_URL` is safe for client use

### 4. Production Deployment Config

When deploying to production:

- [ ] Add same variables to production environment secrets
- [ ] Ensure `R2_PUBLIC_BASE_URL` uses custom domain with valid HTTPS
- [ ] Test that server-side routes can read R2 credentials

## Verification

After configuration, verify by running:

```bash
node -e "console.log('R2_ACCOUNT_ID:', !!process.env.R2_ACCOUNT_ID)"
```

Expected: `R2_ACCOUNT_ID: true`

## Dependencies

- **Parent Plan**: `00_MASTER_PLAN.md`
- **Next Step**: `03_API_UPLOAD_ENDPOINT.md`

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Completed
- [ ] Blocked