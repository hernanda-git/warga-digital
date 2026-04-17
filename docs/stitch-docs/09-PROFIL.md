# Profil Page (User Profile)

## Route
`/profil`

## Purpose
User profile management including info editing, avatar upload, theme selection, PIN change, and family management.

---

## Layout Structure

### Container
```tsx
<main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
```

### Views (conditional rendering)

1. **Default View** - Profile display
2. **Edit View** - Profile editing form
3. **PIN Change View** - Change PIN form

---

## Default View

### PageHero Component (used in edit/pin views)
```tsx
<section className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white"
         style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)" }}>
```

### Header Row
```
┌─────────────────────────────────────────────────────────┐
│ [Back] breadcrumb                       rightSlot?      │
│ Title                                                │
└─────────────────────────────────────────────────────────┘
```

#### Back Button
```tsx
<button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 active:scale-90">
  <ChevronLeftIcon className="h-5 w-5 text-white" />
</button>
```

### Profile Header Card
```tsx
<div className="rounded-3xl bg-app-surface p-5 shadow-sm -mt-6 relative z-10">
```

#### Avatar Section
```tsx
<div className="flex flex-col items-center">
  <div className="relative">
    {profilePictureUrl ? (
      <Image src={profilePictureUrl} alt={fullName} fill className="rounded-full object-cover" />
    ) : (
      <Avatar name={fullName} size={96} />
    )}
    <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-app-primary text-white shadow-md">
      <CameraIcon className="h-4 w-4" />
    </button>
  </div>
</div>
```

#### Name & Role
```tsx
<h1 className="mt-3 text-center text-xl font-extrabold text-app-title">{fullName}</h1>
<p className="mt-1 text-center text-sm text-app-body-muted">
  @{username || "no username"}
</p>
```

#### Role Badges
```tsx
<div className="mt-2 flex justify-center gap-2 flex-wrap">
  {roles?.map((role) => (
    <span key={role.id} className="rounded-full bg-app-primary-muted px-3 py-1 text-[11px] font-semibold text-app-primary">
      {role.name}
    </span>
  ))}
</div>
```

### Info Section

#### Container
```tsx
<div className="mt-4 rounded-2xl border border-[var(--color-input-border)] overflow-hidden">
```

#### InfoRow Component
```tsx
<div className="flex items-center justify-between gap-3 py-2.5 px-4 border-b border-[var(--color-input-border)]">
  <span className="shrink-0 text-[13px] text-app-body-muted">{label}</span>
  <span className="text-right text-[13px] font-semibold text-app-title">{value}</span>
</div>
```

#### Rows
- WhatsApp: waNumberMasked or "—"
- Email: email or "—"
- Tanggal Lahir: formatted date or "—"
- Status: user status
- Bergabung: formatted date

### Action Cards Section

#### Container
```tsx
<div className="mt-5 space-y-3 px-4">
```

#### Action Card
```tsx
<div className="flex items-center justify-between rounded-2xl bg-app-surface p-4 shadow-sm">
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-primary-muted">
      <Icon className="h-5 w-5 text-app-primary" />
    </div>
    <div>
      <p className="text-[13px] font-semibold text-app-title">{label}</p>
      <p className="text-[11px] text-app-body-muted">{sublabel}</p>
    </div>
  </div>
  <ChevronRightIcon className="h-5 w-5 text-app-body-muted" />
</div>
```

#### Actions
1. **Edit Informasi** → Edit view
2. **Tema Warna** → Theme sheet
3. **Ubah PIN** → PIN change view
4. **Keluarga** (if kepala keluarga) → Family management
5. **Permintaan Masuk** (if has pending) → Pending requests
6. **Keluar** → Logout

### ThemeSheet Component (Bottom Sheet)

#### Trigger
```tsx
<button onClick={() => setThemeSheetOpen(true)}>
```

#### Sheet Structure
```tsx
<>
  <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
  <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full rounded-t-[2rem] bg-app-surface shadow-[0_-20px_60px_rgba(0,40,5,0.18)]">
```

#### Header
```tsx
<div className="flex justify-center pt-3">
  <div className="h-1 w-10 rounded-full bg-[var(--color-input-border)]" />
</div>
<div className="px-5 pb-8 pt-3">
  <div className="mb-5 flex items-center justify-between">
    <h2 className="text-lg font-extrabold text-app-title">Tema Warna</h2>
    <button onClick={onClose}>
      <XMarkIcon className="h-5 w-5 text-app-body-muted" />
    </button>
  </div>
</div>
```

#### Theme Grid (3 columns)
```tsx
<div className="grid grid-cols-3 gap-3">
  {THEMES.map((theme) => (
    <button key={theme.id} onClick={() => onSelect(theme.id)} className="relative flex flex-col items-center gap-2.5 rounded-2xl border-2 px-3 py-4">
      <span className="h-9 w-9 rounded-full shadow-md" 
            style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryHover})` }} />
      {isActive && (
        <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-app-primary">
          <CheckIcon className="h-2.5 w-2.5 text-white" />
        </span>
      )}
      <span className="text-[11px] font-semibold text-app-title">{theme.nameId}</span>
    </button>
  ))}
</div>
```

---

## Edit View

### PageHero
```tsx
<PageHero breadcrumb="Profil" title="Edit Informasi" onBack={() => setIsEditing(false)} />
```

### Form Container
```tsx
<form onSubmit={handleSave} className="space-y-4 px-4 pb-10 pt-5">
```

### Avatar Edit Section
```tsx
<div className="flex flex-col items-center gap-4 py-6 -mx-4 px-4 bg-gradient-to-b from-app-surface to-transparent">
  <div className="relative w-full flex items-center justify-center">
    <div className="relative rounded-3xl overflow-hidden shadow-lg" style={{ width: "90%", maxWidth: "500px", aspectRatio: "1 / 1" }}>
      {/* Image or Avatar fallback */}
      {avatarLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-white border-t-transparent" />
        </div>
      )}
      <button type="button" onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20">
        <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100">
          <CameraIcon className="h-12 w-12 text-white drop-shadow-lg" />
          <span className="text-white font-semibold text-sm">Ubah Foto</span>
        </div>
      </button>
    </div>
  </div>
  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
</div>
```

### FieldInput Component
```tsx
<div>
  <label htmlFor={id} className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
    {label}{optional && <span className="ml-1 normal-case font-normal">(opsional)</span>}
  </label>
  <input id={id} value={value} onChange={(e) => onChange(e.target.value)}
         className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title" />
</div>
```

### Username Field (with availability check)
```tsx
<div>
  <div className="mb-2 flex items-center justify-between">
    <label>Username</label>
    {usernameCheckLoading && <Spinner />}
    {usernameCheckStatus === "available" && <CheckIcon className="h-3 w-3 text-green-600" />}
    {usernameCheckStatus === "taken" && <span className="text-[10px] text-red-600">Sudah dipakai</span>}
  </div>
  <input value={editUsername} onChange={handleUsernameChange}
         className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold" />
</div>
```

### Action Buttons
```tsx
<div className="flex gap-2 pt-1">
  <button type="button" onClick={() => setIsEditing(false)}
          className="flex-1 rounded-2xl py-4 text-sm font-bold text-app-body bg-app-surface-alt">
    Batal
  </button>
  <button type="submit" disabled={saving || usernameCheckLoading || usernameCheckStatus === "taken"}
          className="flex-1 rounded-2xl py-4 text-sm font-bold text-white bg-app-primary">
    {saving ? "Menyimpan..." : "Simpan"}
  </button>
</div>
```

---

## PIN Change View

### PageHero
```tsx
<PageHero breadcrumb="Keamanan" title="Ubah PIN" onBack={() => setIsChangingPin(false)} />
```

### Form
```tsx
<form onSubmit={handleChangePin} className="space-y-5 px-4 pb-10 pt-5">
```

### Fields
1. **PIN Saat Ini** - OtpInput
2. **PIN Baru** - OtpInput
3. **Konfirmasi PIN Baru** - OtpInput

### Error Display
```tsx
{error && (
  <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
    <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
    <p className="text-sm text-red-600">{error}</p>
  </div>
)}
```

### Submit
```tsx
<button type="submit" disabled={pinLoading || currentPin.length !== 4 || newPin.length !== 4 || confirmNewPin.length !== 4}
        className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white bg-app-primary">
  {pinLoading ? "Memproses..." : "Ubah PIN"}
</button>
```

---

## ConfirmDialog Component

### Structure
```tsx
<>
  <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
  <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2.5rem)] rounded-3xl bg-app-surface p-6 shadow-[0_32px_64px_rgba(0,0,0,0.18)]">
```

### Content
- Icon (if danger)
- Title: `text-base font-extrabold text-app-title`
- Message: `text-sm text-app-body-muted`
- Buttons: Cancel + Confirm

---

## Family Management (Sub-view)

### Family List
```tsx
<div className="space-y-3">
  {currentHouse?.members?.map((member) => (
    <div key={member.userId} className="flex items-center justify-between rounded-2xl bg-app-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar name={member.fullName} />
        <div>
          <p className="text-sm font-bold text-app-title">{member.fullName}</p>
          <p className="text-[11px] text-app-body-muted">{RELATIONSHIP_LABELS[member.relationship]}</p>
        </div>
      </div>
      {isKepalaKeluarga && member.userId !== profile?.id && (
        <div className="flex gap-2">
          <button onClick={() => handleTransferOwner(member.userId)} className="text-[11px] text-app-primary">Jadikan KK</button>
          <button onClick={() => handleRemoveMember(member.userId)} className="text-[11px] text-red-600">Keluarkan</button>
        </div>
      )}
    </div>
  ))}
</div>
```

### Add Member Form
```tsx
<form onSubmit={handleAddMemberSubmit} className="rounded-2xl border p-4">
  <p className="mb-4 text-[11px] font-bold uppercase">Tambah Anggota</p>
  {/* Fields: Nama, Username, WhatsApp */}
  <button type="submit" className="w-full rounded-2xl border border-app-primary py-3 text-sm font-bold text-app-primary">
    Tambah Anggota
  </button>
</div>
```

---

## Data Types

### ProfileData
```typescript
interface ProfileData {
  id: string;
  fullName: string;
  username: string | null;
  waNumber: string | null;
  waNumberMasked: string | null;
  email: string | null;
  dateOfBirth: string | null;
  status: string;
  createdAt: string;
  profilePictureUrl: string | null;
  themeId?: string;
  roles?: ProfileRole[];
  badges?: ProfileBadge[];
  house: HouseData | null;
  residences?: ProfileResidence[];
  pendingJoinRequests?: PendingJoinRequestItem[];
}
```

### FamilyMember
```typescript
interface FamilyMember {
  userId: string;
  fullName: string;
  username: string | null;
  relationship: "OWNER" | "FAMILY" | "TENANT" | "CARETAKER";
  isPrimary: boolean;
}
```

---

## API Endpoints

### Get Profile
```typescript
GET /api/profile
```

### Update Profile
```typescript
PATCH /api/profile
Body: { full_name, username, wa_number, email, date_of_birth, theme_id }
```

### Check Username
```typescript
POST /api/profile/check/username
Body: { username }
```

### Check WhatsApp Number
```typescript
POST /api/profile/check/wa-number
Body: { waNumber }
```

### Upload Avatar
```typescript
POST /api/profile/avatar
Body: FormData with file
```

### Change PIN
```typescript
POST /api/auth/change-pin
Body: { currentPin, newPin, confirmNewPin }
```

### Family Transfer Owner
```typescript
POST /api/family/transfer-owner
Body: { houseId, newOwnerUserId }
```

### Family Remove Member
```typescript
POST /api/family/remove-member
Body: { houseId, memberUserId }
```

### Family Add Member
```typescript
POST /api/family/add-member
Body: { fullName, username?, waNumber, houseId? }
```

### Respond to Join Request
```typescript
POST /api/house-join-requests/respond
Body: { requestId, action: "approve" | "reject" }
```

---

## Responsive

- Mobile-first (max-width: 430px)
- Avatar centered and large
- Full-width action cards
- Bottom sheet for themes
- Dialog for confirmations
