# Forgot PIN / Reset PIN Feature

**Status**: Implemented, pending production env configuration.  
**Created**: 2026-04-26  
**Tech**: Resend API, custom JWT tokens, SHA-256 hashed tokens, scrypt PIN hashing.

---

## Overview

Self-service PIN reset flow for users who forgot their 4-digit login PIN. The user provides their username or WhatsApp number, and if the account is ACTIVE and has an email on file, a time-limited reset link is emailed via Resend.

**Token expiry**: 6 hours.  
**Rate limit**: 3 requests per 15-minute window (forgot + reset endpoints).

---

## Database Schema

### `password_reset_tokens`

```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,   -- SHA-256 of the raw token
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token_hash)
);
```

**Indexes**:
- `idx_password_reset_tokens_hash` — fast token lookup.
- `idx_password_reset_tokens_expires` — cleanup of expired unused tokens.

**Migration file**: `supabase/migrations/20260426000000_add_password_reset_tokens.sql`

> **Agent note**: If you need to query or extend this table, reuse the existing migration pattern. Always index `token_hash` and `expires_at`.

---

## Environment Variables

Add these to `.env` (and Vercel dashboard for production):

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@warga-digital.com   # or onboarding@resend.dev for testing
APP_URL=http://localhost:3000                  # production: https://warga-digital.com
```

> **Agent note**: `APP_URL` must NOT have a trailing slash. The email service strips it internally, but consistency matters.

---

## API Routes

### `POST /api/auth/forgot-pin`

**Body**: `{ login: string }` (username or WhatsApp number)

**Logic**:
1. Rate-limits by login identifier (`forgotPinLimiter`).
2. Looks up the user by username (case-insensitive) or WA number (canonical variants).
3. Checks `status === 'ACTIVE'`.
4. Checks `email IS NOT NULL`.
5. Generates a 32-byte hex token, stores `SHA-256(token)` in `password_reset_tokens`.
6. Invalidates any previous unused tokens for that user.
7. Sends email via `sendResetPinEmail()` from `src/lib/email/resend.ts`.
8. Returns generic success message regardless of outcome (prevents user enumeration).

**Errors returned to client** (only for found users):
- `Akun belum aktif. Tidak dapat mereset PIN.`
- `Akun ini belum memiliki email terdaftar. Hubungi admin untuk bantuan.`

### `GET /api/auth/reset-pin/validate?token=&user=`

**Logic**:
1. Hashes incoming token with SHA-256.
2. Looks up row matching `user_id + token_hash`.
3. Checks `used_at IS NULL` and `expires_at > now()`.
4. Returns `{ valid: true }` or `{ valid: false, error: "..." }`.

### `POST /api/auth/reset-pin`

**Body**: `{ token, userId, pin, confirmPin }`

**Logic**:
1. Validates both PINs are 4 digits and match.
2. Rate-limits by `userId`.
3. Re-validates token hash + expiry + not-used (same as GET validate).
4. Hashes new PIN with `hashPin()` (scrypt salt:hash).
5. Updates `users.pin_hash`.
6. Marks token as used (`used_at = NOW()`).
7. **Deletes all sessions** for the user (`sessions` table) to force re-login.
8. Resets rate limit.

---

## Email Service

**File**: `src/lib/email/resend.ts`

- Uses the official `resend` npm package.
- Sends HTML + plain text email in Indonesian.
- HTML template uses inline CSS for email client compatibility.
- Escape helper prevents XSS in email body.

**Function signature**:
```ts
sendResetPinEmail({ to, userName, resetUrl, expiresInHours })
```

---

## UI Pages

### `/auth/forgot-pin`

- Input: username or WA number.
- Shows generic success screen after submission (even if account doesn't exist — anti-enumeration).
- Has "Kembali ke Login" link.

### `/auth/reset-pin`

- Reads `?token=` and `?user=` from query string.
- On mount, calls `GET /api/auth/reset-pin/validate`.
- If invalid/expired/used: shows error + "Minta Tautan Baru" button.
- If valid: shows two masked `OtpInput` fields (PIN + confirm PIN).
- On success: shows checkmark + "Masuk Sekarang" button.

> **Agent note**: This page wraps the form in `<Suspense>` because `useSearchParams()` requires a suspense boundary in Next.js 15 App Router.

---

## Rate Limiters

**File**: `src/lib/rate-limiter.ts`

Added `forgotPinLimiter`:
```ts
export const forgotPinLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 3,
});
```

Both `/api/auth/forgot-pin` and `/api/auth/reset-pin` consume from this limiter.

---

## Middleware & Auth

**File**: `src/middleware.ts`

Added to `PUBLIC_PAGE_PATHS`:
```ts
"/auth/forgot-pin",
"/auth/reset-pin",
```

No API route prefix needed because `/api/auth/*` is already in `ALWAYS_ALLOW_PREFIXES`.

---

## Security Considerations

1. **Token storage**: Raw tokens are NEVER stored. Only `SHA-256(token)` is persisted.
2. **Token entropy**: 32 random bytes = 64 hex chars = 256 bits.
3. **Expiry**: 6 hours, hardcoded in `src/app/api/auth/forgot-pin/route.ts` (`TOKEN_EXPIRY_HOURS`).
4. **One-time use**: Tokens are marked `used_at` immediately on successful reset.
5. **Session invalidation**: All existing sessions are deleted on reset, forcing re-login on all devices.
6. **Anti-enumeration**: `forgot-pin` returns the same message whether the user exists or not.
7. **Rate limiting**: Prevents brute force on both forgot and reset endpoints.

---

## Common Maintenance Tasks

### Change token expiry
Edit `TOKEN_EXPIRY_HOURS` in:
- `src/app/api/auth/forgot-pin/route.ts`
- `src/lib/email/resend.ts` template text (if you want the email text to match)

### Change rate limits
Edit `forgotPinLimiter` config in `src/lib/rate-limiter.ts`.

### Add email template customization
Edit the HTML + text templates inside `src/lib/email/resend.ts`.

### Clean up expired tokens
Run a scheduled Supabase function or manual query:
```sql
DELETE FROM password_reset_tokens
WHERE used_at IS NOT NULL
   OR expires_at < NOW() - INTERVAL '7 days';
```

### Debug email delivery
1. Check Resend dashboard for delivery logs.
2. Ensure `RESEND_FROM_EMAIL` domain is verified in Resend.
3. For local testing without Resend, you can temporarily mock `sendResetPinEmail` to log the URL to console.

---

## Testing Checklist (for agents)

- [ ] User without email → gets clear error on forgot-pin page.
- [ ] User with email → receives email, link works, token validates.
- [ ] Expired token → shows "Tautan sudah kadaluarsa".
- [ ] Reused token → shows "Tautan sudah digunakan".
- [ ] PIN mismatch → shows validation error before API call.
- [ ] After reset, old sessions are invalidated (user must re-login).
- [ ] Rate limit kicks in after 3 rapid attempts.
- [ ] Build passes (`npm run build`).
