# Login Page

## Route
`/auth/login`

## Purpose
2-step authentication flow using username/phone + PIN.

---

## Layout Structure

### Overall Container
```tsx
<main className="flex h-full flex-col overflow-hidden">
```

### Hero Section (Gradient Header)
- Height: approximately 40% of viewport
- Background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`
- Decorative blobs: absolute positioned circles with `bg-white/10` or `bg-white/[0.06-0.07]`

#### Hero Content
1. **Logo Container**
   - Size: `h-[72px] w-[72px]`
   - Border radius: `rounded-[22px]`
   - Background: `bg-white/25` with backdrop blur
   - Icon: `KeyIcon` from Heroicons, `h-9 w-9`, white

2. **Badge/Tag**
   - Container: `inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1`
   - Icon: `ShieldCheckIcon`, `h-3 w-3`
   - Text: `text-[10px] font-bold uppercase tracking-widest text-white/80`
   - Content: "Sawangan Regensi · RT 03"

3. **Title**
   - Element: `h1`
   - Class: `text-[24px] font-extrabold leading-tight text-white`
   - Content: "Warga Digital"

4. **Subtitle**
   - Element: `p`
   - Class: `mt-1 text-sm text-white/70`
   - Content: "Masuk ke akun Anda" (step 1) / "Verifikasi identitas" (step 2)

### Form Card (Sliding Card)
- Negative top margin: `-mt-6` (overlaps hero)
- Border radius: `rounded-t-[2rem]`
- Background: `bg-app-surface`
- Shadow: `shadow-[0_-8px_40px_rgba(0,40,5,0.16)]`
- Padding: `px-5 pt-6 pb-10`

### Step Indicator
- Container: `flex justify-center gap-2 mb-7`
- Pills: `h-1.5 rounded-full`
- Inactive: width 8px, `var(--color-indicator-inactive)`
- Active: width 32px, `var(--color-primary)`

---

## Step 1: Username/WhatsApp Input

### Content
- **Title**: "Masuk ke akun" (`text-xl font-extrabold text-app-title`)
- **Subtitle**: "Gunakan Username atau Nomor WhatsApp yang terdaftar." (`text-sm text-app-body-muted`)

### Hint Banner
- Container: `flex items-start gap-2.5 rounded-2xl px-3.5 py-3`
- Background: `var(--color-surface-alt)`
- Icon: `CheckCircleIcon`, `h-4 w-4`, `var(--color-primary)`
- Text: `text-xs text-app-body-muted`

### Input Field
- Label: `text-[11px] font-bold uppercase tracking-widest text-app-body-muted`
- Input:
  ```css
  w-full rounded-2xl border bg-white px-4 py-3.5 text-sm font-semibold 
  text-app-title placeholder:font-normal placeholder:text-app-body-muted/50
  ```
- Border color: `var(--color-input-border)`
- Focus: green border + shadow

### Error Message
- Container: `flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3`
- Text: `text-sm text-red-600`

### Submit Button
- Style: PrimaryButton pattern
- Text: "Lanjut" with `ArrowRightIcon`
- Disabled when: input empty or loading

### Link
- Text: "Belum punya akun?"
- Link: "Daftar sekarang" → `/auth/register`
- Style: `font-semibold` with `var(--color-primary)` color

---

## Step 2: PIN Input

### User Identity Chip
- Container: `flex items-center gap-3 rounded-2xl px-3.5 py-3`
- Background: `var(--color-surface-alt)`

#### Avatar
- Size: `h-9 w-9`
- Border radius: `rounded-xl`
- Background: `var(--color-primary)`
- Text: First letter of username, `text-xs font-extrabold text-white`

#### User Info
- Name: `text-sm font-bold text-app-title truncate`
- Status: "Akun ditemukan ✓" (`text-[11px] text-app-body-muted`)

#### Change Account Button
- Size: `h-8 w-8`
- Border radius: `rounded-xl`
- Icon: `ChevronLeftIcon`
- Action: Go back to step 1

### PIN Input
Uses custom `OtpInput` component:
- 4 separate input boxes
- Each: `h-14 w-12` (or similar)
- Masked by default (dots)
- Focus state per box

### Error Message
Same pattern as Step 1

### Submit Button
- Text: "Masuk ke Akun"
- Disabled when: PIN length !== 4 or loading

---

## Trust Footer

- Container: `flex items-center justify-center gap-1.5 mt-8`
- Icon: `LockClosedIcon` in `h-4 w-4` circle with `var(--color-primary-muted)` background
- Text: `text-[11px] text-app-body-muted/70`
- Content: "Terenkripsi & aman oleh Supabase"

---

## Animations

### Form Card Entrance
```css
animation: auth-login-card-in 0.4s ease-out;
@keyframes auth-login-card-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Logo Hover
```css
.auth-login-page:has(form:focus-within) .auth-login-logo,
.auth-login-logo:hover {
  transform: scale(1.02);
  box-shadow: 0 12px 28px -8px color-mix(in srgb, var(--color-primary) 0.35, transparent);
}
```

### Step Transition
- Use CSS transitions for step indicator width change
- Duration: 300ms

---

## Form Validation

### Step 1
- Login field: required (trimmed value must not be empty)
- Error: "Isi Username atau Nomor WhatsApp untuk melanjutkan."

### Step 2
- PIN: must be exactly 4 digits
- Error: "PIN harus 4 digit."

---

## API Integration

### Check User Exists
```typescript
POST /api/auth/check-login
Body: { login: string }
Response: { exists: boolean, canProceed: boolean, error?: string }
```

### Login
```typescript
POST /api/auth/login
Body: { login: string, pin: string }
Response: { userId: string, fullName: string }
```

---

## State Management

Uses Zustand `useAuthStore`:
- `setUser({ id, fullName })`
- Redirects to `/landing` on success

Uses Zustand `useOnboardingStore`:
- `setCompleted(true)` after successful login

---

## Responsive

- Mobile-first design
- Max width: 430px (app shell)
- Content scales appropriately on all mobile sizes
