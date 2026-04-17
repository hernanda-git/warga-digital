# Register Page

## Route
`/auth/register`

## Purpose
Multi-step registration wizard (3 steps) for new users.

---

## Layout Structure

### Overall Container
```tsx
<main className="flex h-full flex-col overflow-hidden">
```

### Sticky Header Section (Gradient)
- Background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`
- Padding: `px-4 pb-6 pt-5`
- Decorative blobs: same pattern as login

#### Navigation Row
- Back button: `h-9 w-9`, `rounded-xl`, `bg-white/20`, `ChevronLeftIcon`
- Title area: min-width-0 flex-1

#### Header Title/Subtitle
Dynamic based on step:
- Step 0 normal: "Daftar Akun" / "Sawangan Regensi · RT 03"
- Step 0 existing house: "Rumah Terdaftar" / "Blok X"
- Step 0 pending: "Menunggu Persetujuan" / "Blok X"
- Step 1: "Anggota Keluarga" / "Pemilik · Blok X"
- Step 2: "Atur PIN" / "Blok X"

### Step Progress Indicator
- Only shown for normal flow (not existing house/pending)
- 3-column grid: `grid grid-cols-3 gap-2 mt-4`

#### Step Pill
```css
flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5
/* Active: bg-white/25 */
/* Done: bg-white/18 */
/* Pending: bg-white/10 */
```

- Icon container: `h-7 w-7 rounded-lg`
- Icon: `h-4 w-4`
- Label: `text-[10px] font-bold`

### Form Body (Sliding Card)
- Negative top margin: `-mt-4`
- Border radius: `rounded-t-[2rem]`
- Background: `bg-app-surface`
- Shadow: `shadow-[0_-8px_40px_rgba(0,40,5,0.14)]`
- Padding: `px-5 pt-6 pb-10`

---

## Step 0: Registration Form

### Fields (NextUI Input)

#### Full Name
- Label: "Nama Lengkap"
- Placeholder: "Contoh: Budi Santoso"
- Validation: required, min 2 characters

#### WhatsApp Number
- Label: "Nomor WhatsApp"
- Placeholder: "08xxxxxxxxxx (opsional jika isi username)"
- Validation: phone number format if provided
- Optional: can be empty if username is provided

#### Username
- Label: "Username"
- Placeholder: "Contoh: budi_santoso (opsional jika isi WhatsApp)"
- Validation: regex `/^[a-zA-Z0-9_]{3,30}$/`
- Optional: can be empty if WhatsApp is provided

#### Blok Rumah
- Label: "Blok Rumah"
- Placeholder: "Contoh: N2, J12A"
- Description: "Blok + nomor rumah. Contoh: N2, J12A, B5. Wajib diisi."
- Validation: required, parsed with `parseBlokRumah`

### Info Banner
- Container: `flex items-start gap-2.5 rounded-2xl px-3.5 py-3`
- Background: `var(--color-surface-alt)`
- Icon: `CheckCircleIcon`
- Text: Login credentials info

### Submit Button
- Text: "Berikutnya" with `ArrowRightIcon`

### Link
- Text: "Sudah punya akun?"
- Link: "Masuk" → `/auth/login`

---

## Existing House Confirmation (Step 0 Branch)

### Alert Card
- Border: `border-amber-200`
- Background: `bg-amber-50`
- Icon: `ExclamationTriangleIcon`, amber
- Title: "Rumah sudah terdaftar"
- Content: Owner name, creator name

### Info Box
- Text explaining approval requirement
- Background: `var(--color-surface-alt)`

### Buttons
- Cancel: Secondary style
- Continue: Primary style

---

## Pending Approval State (Step 0 Branch)

### Status Card
- Icon: `ClockIcon` in `var(--color-primary-muted)` circle
- Title: "Permintaan Terkirim"
- Content: Owner info, approval instructions

### Options
- "Atur PIN Sekarang" - shows PIN form inline
- "Selesai — Kembali ke Login"

### PIN Form (Inline)
- Same pattern as Step 2 PIN setup
- Saves PIN and redirects to login

---

## Step 1: Family Members

### Info Box
- Title explaining you are house owner
- House block display

### Member List
- Container: `rounded-2xl border` with `var(--color-input-border)`
- Header: "Anggota ditambahkan (X)"

#### Member Row
- Avatar: `h-8 w-8`, initial letter
- Name: `text-xs font-bold text-app-title`
- Username: `@username`, `text-[10px]`

### Add Member Form
- Container: `rounded-2xl border p-4`
- Fields:
  - Nama Lengkap (required)
  - Username (required)
  - Nomor WhatsApp (required)
- Submit: "Tambah Anggota"

### Navigation
- Previous: Secondary button
- Next: Primary button

---

## Step 2: Set PIN

### Info Box
- Icon: `LockClosedIcon`
- Text about PIN importance

### PIN Input
- Label: "PIN (4 digit)"
- Uses `OtpInput` component

### Confirm PIN Input
- Label: "Konfirmasi PIN"
- Same `OtpInput` component

### Validation
- Both PINs required, 4 digits each
- PINs must match
- Error display if mismatch

### Submit Button
- Text: "Simpan & Mulai"
- Loading: "Menyimpan..."

---

## Form Validation

### Step 0
```typescript
// Name
if (!fullName.trim()) "Nama lengkap wajib diisi"
if (fullName.length < 2) "Nama minimal 2 karakter"

// Login credentials
if (!hasWa && !hasUsername) "Isi nomor WhatsApp atau username"

// WhatsApp
validateNormalizedWaNumber(normalized)

// Username
if (!USERNAME_REGEX.test(username)) "Username 3–30 karakter, huruf/angka/underscore saja"

// Blok
parseBlokRumah(blokRumah)
```

### Step 1 (Family)
- Member name: required, min 2 chars
- Username: required, regex validation
- WhatsApp: required, phone validation

### Step 2
- PIN: 4 digits required
- Confirm PIN: must match
- Error if mismatch

---

## API Integration

### Check Blok Exists
```typescript
POST /api/auth/register/check-blok
Body: { blokRumah: string }
Response: { exists: boolean, ownerFullName?: string, createdByFullName?: string }
```

### Register
```typescript
POST /api/auth/register
Body: { fullName, waNumber?, username?, blokRumah, requestToJoinExisting?: boolean }
Response: { userId, fullName, houseId, blokRumah, requiresApproval?, ownerFullName? }
```

### Set PIN
```typescript
POST /api/auth/set-pin
Body: { userId, pin, confirmPin }
Response: { userId, fullName }
```

### Add Family Member
```typescript
POST /api/auth/add-family-member
Body: { ownerUserId, houseId, fullName, username, waNumber }
```

---

## State Management

### Zustand Stores
- `useAuthStore`: `setUser({ id, fullName })`
- `useOnboardingStore`: `setCompleted(true)` after registration

### Local State
```typescript
const [step, setStep] = useState<StepIndex>(0);
const [fullName, setFullName] = useState("");
const [waNumber, setWaNumber] = useState("");
const [username, setUsername] = useState("");
const [blokRumah, setBlokRumah] = useState("");
const [members, setMembers] = useState<FamilyMemberRow[]>([]);
const [pin, setPin] = useState("");
const [confirmPin, setConfirmPin] = useState("");
const [error, setError] = useState("");
const [fieldErrors, setFieldErrors] = useState({...});
const [loading, setLoading] = useState(false);
```

---

## NextUI Input Styling

```typescript
const inputClassNames = {
  label: "text-app-body-muted text-[11px] font-bold uppercase tracking-widest",
  input: "text-sm font-semibold text-app-title",
  inputWrapper: "min-h-[52px] bg-white border-default-200 data-[hover=true]:bg-white data-[focus=true]:bg-white data-[focus=true]:border-app-primary",
};
```

---

## Responsive

- Mobile-first (max-width: 430px)
- Form inputs stack vertically
- Buttons full-width on mobile
- Touch-friendly tap targets (min 44px)
