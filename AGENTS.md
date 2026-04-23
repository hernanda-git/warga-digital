# AGENTS.md — Warga Digital

High-signal notes for AI agents working in this repo.

## Project
Next.js 15 App Router + React 18 + TypeScript 5 + Tailwind CSS 3 + NextUI 2.
Single app (not a monorepo). Deployed on Vercel.

## Developer commands
- `npm run dev` — Next.js with Turbopack (`next dev --turbopack`)
- `npm run build` — Standard Next.js build
- `npm run lint` — ESLint (`next lint`)
- `npm run db:generate` — Regenerate Supabase TypeScript types. **Caveat**: the script uses PowerShell syntax (`2>nul`, `$env:SUPABASE_PROJECT_ID`). Run it in PowerShell on Windows, or rewrite the fallback chain for POSIX.
- `node scripts/bump-version.js [major|minor|patch]` — Bumps `VERSION`, `package.json`, and `CHANGELOG.md`. Expects a `VERSION` file in repo root.

## Architecture & entrypoints
- App routes live under `src/app/`. Major routes: `landing`, `profil`, `jualan`, `jasa`, `kas-rt`, `dompet`, `organisasi`, `artikel`, `auth`, `onboarding`, `admin`, `notifikasi`, `usaha`.
- API routes live under `src/app/api/`.
- Feature code is grouped by domain under `src/components/{feature}/`, `src/hooks/{feature}/`, `src/services/{feature}/`, `src/types/{feature}/`, `src/config/{feature}.ts`.
- Path alias: `@/*` → `./src/*`.
- Barrel exports (`index.ts`) are common in feature folders.

## Environment & secrets
- `.env` in the repo root contains **live secrets** (Supabase service role key, R2 keys, JWT secret, encryption key). It is listed in `.gitignore`, but the file is present in the working tree. **Never commit it** and avoid exposing its values in logs or generated files.
- Required variables: `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET` (base64, 48 bytes), `ENCRYPTION_KEY` (exactly 32 chars), `OTP_PROVIDER` (`mock` or `clawdbot`), `R2_*` credentials.
- Default seeded IDs are hardcoded in `.env` for dev (`DEFAULT_TENANT_ID`, `DEFAULT_COMMUNITY_ID`, `DEFAULT_ROLE_WARGA_ID`).

## Database & backend
- Supabase (Postgres 15) for auth, database, and storage.
- Local Supabase CLI config in `supabase/config.toml` (ports: API 54321, DB 54322, Studio 54323).
- Migrations are in `supabase/migrations/`.
- There is no `npm run test` or test runner configured (no Jest/Vitest/Playwright configs found), despite testing examples in some READMEs.

## Storage
- **Supabase Storage** buckets: `avatars`, `marketplace-media`, `kas-rt-attachments`.
- **Cloudflare R2** is used for `jualan` media and CMS images. Uses `@aws-sdk/client-s3` with R2 S3-compatible API.
- `next.config.ts` whitelists Supabase hostname, `oo.warga-digital.com` (R2 public URL), and `*.r2.cloudflarestorage.com` for image optimization.

## Auth
- Hybrid: Supabase Auth plus a custom JWT session system (`jose`, 7-day expiry).
- Custom `apiFetch` wrapper dispatches `auth:unauthorized` on 401; `AuthInterceptor` redirects to login.
- OTP provider abstraction: `mock` logs to console; `clawdbot` sends real WhatsApp OTP.

## Style & toolchain conventions
- ESLint flat config (`eslint.config.mjs`) extending only `next/core-web-vitals`.
- Tailwind custom theme includes Material Design 3 surface colors and an `app.*` design system via CSS variables.
- Dark mode is class-based (`darkMode: "class"`).
- Custom utility `.scrollbar-hide` is available.

## Versioning
- Uses a custom semver workflow (`VERSION` file + `CHANGELOG.md` + `scripts/bump-version.js`), not `npm version`.
