# Profile Page Architecture Diagrams

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Profile Page (200 lines)                     │
│                         Composition Layer Only                       │
│                                                                      │
│  ✓ Authentication guard                                             │
│  ✓ Hook orchestration                                               │
│  ✓ Component composition                                            │
│  ✓ Minimal logic                                                    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
    ┌────────────────────┐         ┌──────────────────────┐
    │   Custom Hooks     │         │    Components        │
    │   (State Layer)    │         │   (Presentation)     │
    │                    │         │                      │
    │ • useProfileData   │         │ • ProfileHeader      │
    │ • useProfileEdit   │         │ • ProfileInfoCard    │
    │ • useAvatarUpload  │         │ • ProfileEditForm    │
    │ • usePinChange     │         │ • FamilyMembers      │
    │ • useFamilyMgmt    │         │ • JoinRequests       │
    │ • useJoinRequests  │         │ • ThemeSheet         │
    │ • useThemeSelect   │         │ • ConfirmDialog      │
    │ • useValidation    │         │ • PinChangeDialog    │
    │                    │         └──────────────────────┘
    └────────┬───────────┘
             │
             ▼
    ┌─────────────────────┐
    │   Service Layer     │
    │   (Data Access)     │
    │                     │
    │ • api.service.ts    │
    │ • transformers.ts   │
    │ • validation.svc.ts │
    └────────┬────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌──────────┐    ┌──────────┐
│  Config  │    │  Types   │
│          │    │          │
│ • ROUTES │    │ • API    │
│ • MSGS   │    │ • UI     │
│ • RULES  │    │ • Forms  │
└──────────┘    └──────────┘
```

## 2. Component Hierarchy

```
ProfilePage
│
├─── ProfileHeader (Hero Section)
│    ├─── Avatar (with upload trigger)
│    ├─── Name & Username
│    └─── Blok/House info
│
├─── ResidenceSelector (if multiple residences)
│    └─── Dropdown with residence list
│
├─── ProfileInfoCard (View/Edit Mode)
│    │
│    ├─── [View Mode]
│    │    ├─── InfoRow (Full Name)
│    │    ├─── InfoRow (Username)
│    │    ├─── InfoRow (WhatsApp)
│    │    ├─── InfoRow (Email)
│    │    ├─── InfoRow (Date of Birth)
│    │    └─── Action Buttons
│    │         ├─── Edit Button
│    │         ├─── Change PIN Button
│    │         ├─── Change Theme Button
│    │         └─── Logout Button
│    │
│    └─── [Edit Mode]
│         └─── ProfileEditForm
│              ├─── FieldInput (Full Name)
│              ├─── FieldInput (Username) + ValidationIndicator
│              ├─── FieldInput (WhatsApp) + ValidationIndicator
│              ├─── FieldInput (Email)
│              ├─── FieldInput (Date of Birth)
│              └─── Action Buttons (Save/Cancel)
│
├─── FamilyMembersSection (if Kepala Keluarga)
│    ├─── Member List
│    │    └─── FamilyMemberCard (each member)
│    │         ├─── Avatar & Name
│    │         ├─── Relationship Badge
│    │         └─── Actions (Transfer/Remove)
│    │
│    └─── AddMemberForm (conditional)
│         ├─── FieldInput (Full Name)
│         ├─── FieldInput (Username)
│         ├─── FieldInput (WhatsApp)
│         └─── Submit Button
│
├─── JoinRequestsSection (if has pending requests)
│    └─── JoinRequestCard (each request)
│         ├─── Requester Info
│         ├─── House/Blok Info
│         └─── Actions (Accept/Reject)
│
├─── ThemeSheet (Modal/Sheet)
│    └─── ThemeGrid
│         └─── ThemeCard (each theme)
│              ├─── Preview Colors
│              ├─── Theme Name
│              └─── Active Indicator
│
├─── PinChangeDialog (Modal)
│    ├─── OtpInput (Current PIN)
│    ├─── OtpInput (New PIN)
│    ├─── OtpInput (Confirm PIN)
│    └─── Action Buttons
│
└─── ConfirmDialog (Reusable Modal)
     ├─── Title
     ├─── Message
     └─── Actions (Confirm/Cancel)
```

## 3. Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                         │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
         ┌──────────────────────┐
         │   Component Events   │
         │  (onClick, onChange) │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   Custom Hook        │
         │  (Business Logic)    │
         │                      │
         │  1. Validate input   │
         │  2. Update local UI  │
         │  3. Call service     │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   Service Layer      │
         │  (API Calls)         │
         │                      │
         │  1. Build request    │
         │  2. Call API         │
         │  3. Handle response  │
         └──────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌────────────────┐
│  Transformer  │      │  Validator     │
│               │      │                │
│ Transform API │      │ Validate data  │
│ to UI model   │      │ Check rules    │
└───────┬───────┘      └────────┬───────┘
        │                       │
        └───────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   Custom Hook        │
         │  (Update State)      │
         │                      │
         │  1. Set data         │
         │  2. Clear errors     │
         │  3. Reset loading    │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   Component Re-render│
         │  (UI Update)         │
         └──────────────────────┘
```

## 4. State Management by Domain

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROFILE PAGE STATE DOMAINS                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│  useProfileData      │  │  useProfileEdit      │
│                      │  │                      │
│ • profile: Data      │  │ • isEditing: bool    │
│ • isLoading: bool    │  │ • formData: Form     │
│ • error: string?     │  │ • isSaving: bool     │
│ • refreshProfile()   │  │ • error: string?     │
│                      │  │ • handleSave()       │
│                      │  │ • handleCancel()     │
└──────────────────────┘  └──────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│  useFieldValidation  │  │  useAvatarUpload     │
│                      │  │                      │
│ • username: Status   │  │ • isUploading: bool  │
│ • phone: Status      │  │ • error: string?     │
│ • checkUsername()    │  │ • previewUrl: str?   │
│ • checkPhone()       │  │ • handleUpload()     │
│ • validateAll()      │  │ • clearPreview()     │
└──────────────────────┘  └──────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│  usePinChange        │  │  useFamilyMgmt       │
│                      │  │                      │
│ • isOpen: bool       │  │ • isManaging: bool   │
│ • formData: PinForm  │  │ • showAddForm: bool  │
│ • isChanging: bool   │  │ • addFormData: Form  │
│ • error: string?     │  │ • isAdding: bool     │
│ • handleChange()     │  │ • transferLoading?   │
│ • handleClose()      │  │ • removeLoading?     │
│                      │  │ • handleAdd()        │
│                      │  │ • handleTransfer()   │
│                      │  │ • handleRemove()     │
└──────────────────────┘  └──────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│  useJoinRequests     │  │  useThemeSelection   │
│                      │  │                      │
│ • requests: JoinReq[]│  │ • isOpen: bool       │
│ • respondingId: str? │  │ • selectedTheme: str │
│ • error: string?     │  │ • isSaving: bool     │
│ • handleAccept()     │  │ • error: string?     │
│ • handleReject()     │  │ • handleSelect()     │
└──────────────────────┘  └──────────────────────┘

┌──────────────────────┐
│  useResidenceSelect  │
│                      │
│ • selectedIndex: num │
│ • currentRes: Res    │
│ • allResidences: []  │
│ • handleChange()     │
└──────────────────────┘
```

## 5. Before vs After Comparison

### BEFORE (Monolithic - 2,215 lines)

```
┌─────────────────────────────────────────────────────────┐
│              page.tsx (2,215 lines) 😱                   │
│                                                          │
│  const [profile, setProfile] = useState(...)            │
│  const [loading, setLoading] = useState(...)            │
│  const [error, setError] = useState(...)                │
│  const [isEditing, setIsEditing] = useState(...)        │
│  const [saving, setSaving] = useState(...)              │
│  const [editFullName, setEditFullName] = useState(...)  │
│  const [editUsername, setEditUsername] = useState(...)  │
│  const [editWaNumber, setEditWaNumber] = useState(...)  │
│  const [usernameCheckLoading, ...] = useState(...)      │
│  const [usernameCheckStatus, ...] = useState(...)       │
│  const [waNumberCheckLoading, ...] = useState(...)      │
│  const [waNumberCheckStatus, ...] = useState(...)       │
│  const [isChangingPin, ...] = useState(...)             │
│  const [currentPin, ...] = useState(...)                │
│  const [newPin, ...] = useState(...)                    │
│  const [confirmNewPin, ...] = useState(...)             │
│  const [avatarLoading, ...] = useState(...)             │
│  const [isManagingFamily, ...] = useState(...)          │
│  const [showAddMemberForm, ...] = useState(...)         │
│  const [addMemberFullName, ...] = useState(...)         │
│  const [addMemberUsername, ...] = useState(...)         │
│  const [addMemberWaNumber, ...] = useState(...)         │
│  const [transferLoadingId, ...] = useState(...)         │
│  const [removeLoadingId, ...] = useState(...)           │
│  const [themeSheetOpen, ...] = useState(...)            │
│  const [appearanceSaving, ...] = useState(...)          │
│  ... 15+ more useState declarations ...                 │
│                                                          │
│  // Inline API calls                                    │
│  const res = await apiFetch("/api/profile", {...})      │
│  const res = await apiFetch("/api/profile", {...})      │
│  const res = await apiFetch("/api/profile/check/...")   │
│  const res = await apiFetch("/api/profile/house/...")   │
│  ... 15+ more inline API calls ...                      │
│                                                          │
│  // 2000+ lines of nested JSX                           │
│  return (                                                │
│    <div>                                                 │
│      {/* 200 lines hero */}                             │
│      {/* 300 lines profile info */}                     │
│      {isEditing ? (                                      │
│        {/* 500 lines edit form */}                      │
│      ) : (                                               │
│        {/* 300 lines view mode */}                      │
│      )}                                                  │
│      {/* 400 lines family management */}                │
│      {/* 300 lines join requests */}                    │
│      {/* 200 lines theme sheet */}                      │
│      {/* 200 lines confirm dialog */}                   │
│    </div>                                                │
│  )                                                       │
│                                                          │
│  ❌ Impossible to test                                  │
│  ❌ Cannot reuse logic                                  │
│  ❌ Hard to understand                                  │
│  ❌ Difficult to debug                                  │
│  ❌ Tightly coupled                                     │
└──────────────────────────────────────────────────────────┘
```

### AFTER (Modular Architecture)

```
┌─────────────────────────────────────────────────────────┐
│              page.tsx (~200 lines) ✨                    │
│                                                          │
│  const { profile, isLoading, error } =                  │
│    useProfileData();                                    │
│                                                          │
│  const { isEditing, formData, handleSave, ... } =       │
│    useProfileEdit(profile);                             │
│                                                          │
│  const { handleUpload, isUploading } =                  │
│    useAvatarUpload();                                   │
│                                                          │
│  const { isOpen, handleChange } =                       │
│    usePinChange();                                      │
│                                                          │
│  const { handleAdd, handleTransfer, ... } =             │
│    useFamilyManagement(currentHouse);                   │
│                                                          │
│  const { handleAccept, handleReject } =                 │
│    useJoinRequests();                                   │
│                                                          │
│  const { handleSelect, isOpen } =                       │
│    useThemeSelection();                                 │
│                                                          │
│  // Clean JSX composition                               │
│  return (                                                │
│    <>                                                    │
│      <ProfileHeader {...} />                            │
│      <ResidenceSelector {...} />                        │
│      <ProfileInfoCard {...} />                          │
│      <FamilyMembersSection {...} />                     │
│      <JoinRequestsSection {...} />                      │
│      <ThemeSheet {...} />                               │
│      <PinChangeDialog {...} />                          │
│      <ConfirmDialog {...} />                            │
│    </>                                                   │
│  )                                                       │
│                                                          │
│  ✅ Easy to test                                        │
│  ✅ Reusable hooks                                      │
│  ✅ Clear and simple                                    │
│  ✅ Easy to debug                                       │
│  ✅ Loosely coupled                                     │
└──────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
         ▼                                   ▼
┌─────────────────────┐           ┌─────────────────────┐
│   CUSTOM HOOKS      │           │   COMPONENTS        │
│   (~1,200 lines)    │           │   (~800 lines)      │
│                     │           │                     │
│ useProfileData      │           │ ProfileHeader       │
│ useProfileEdit      │           │ ProfileInfoCard     │
│ useAvatarUpload     │           │ ProfileEditForm     │
│ usePinChange        │           │ FamilyMembers       │
│ useFamilyMgmt       │           │ JoinRequests        │
│ useJoinRequests     │           │ ThemeSheet          │
│ useThemeSelection   │           │ ConfirmDialog       │
│ useFieldValidation  │           │ PinChangeDialog     │
│ useResidenceSelect  │           │ Shared components   │
│                     │           │                     │
│ ✅ Testable         │           │ ✅ Testable         │
│ ✅ Reusable         │           │ ✅ Reusable         │
└─────────┬───────────┘           └─────────────────────┘
          │
          ▼
┌─────────────────────┐
│   SERVICES          │
│   (~600 lines)      │
│                     │
│ api.service.ts      │
│ transformers.ts     │
│ validation.svc.ts   │
│                     │
│ ✅ Testable         │
│ ✅ Mockable         │
└─────────┬───────────┘
          │
     ┌────┴────┐
     │         │
     ▼         ▼
┌─────────┐ ┌──────┐
│ Config  │ │ Types│
│ (~300)  │ │ (~400)│
└─────────┘ └──────┘
```

## 6. Hook Dependencies & Interactions

```
┌───────────────────────────────────────────────────────────┐
│                    useProfileData (Core)                   │
│  • Fetches profile on mount                               │
│  • Manages loading/error states                           │
│  • Provides refreshProfile()                              │
│  • Updates auth store on 401                              │
└────────────────────────┬──────────────────────────────────┘
                         │
                         │ Provides: profile, isLoading
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────────┐            ┌──────────────────┐
│ useProfileEdit   │            │ useResidenceSelect│
│                  │            │                  │
│ Depends on:      │            │ Depends on:      │
│ • profile        │            │ • profile        │
│                  │            │                  │
│ Calls:           │            │ Updates:         │
│ • updateProfile()│            │ • currentRes     │
│ • refreshProfile│            └──────────────────┘
└──────────────────┘
        │
        │ Used by edit form
        │
        ▼
┌──────────────────┐
│ useFieldValidation│
│                  │
│ Depends on:      │
│ • formData       │
│                  │
│ Calls:           │
│ • checkUsername()│
│ • checkPhone()   │
└──────────────────┘

┌──────────────────┐            ┌──────────────────┐
│ useAvatarUpload  │            │ usePinChange     │
│                  │            │                  │
│ Independent      │            │ Independent      │
│                  │            │                  │
│ Calls:           │            │ Calls:           │
│ • uploadAvatar() │            │ • changePin()    │
│ • refreshProfile │            └──────────────────┘
└──────────────────┘

┌──────────────────┐            ┌──────────────────┐
│ useFamilyMgmt    │            │ useJoinRequests  │
│                  │            │                  │
│ Depends on:      │            │ Depends on:      │
│ • currentHouse   │            │ • profile        │
│                  │            │                  │
│ Calls:           │            │ Calls:           │
│ • addMember()    │            │ • respondToReq() │
│ • transferOwner()│            │ • refreshProfile │
│ • removeMember() │            └──────────────────┘
│ • refreshProfile │
└──────────────────┘

┌──────────────────┐
│ useThemeSelection│
│                  │
│ Independent      │
│                  │
│ Calls:           │
│ • updateTheme()  │
│ Updates:         │
│ • appearanceStore│
│ • themeCookie    │
└──────────────────┘
```

## 7. Service Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Service Layer Pattern                   │
└─────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │  Custom Hook │
                    └──────┬───────┘
                           │
                           │ calls
                           │
                           ▼
            ┌──────────────────────────┐
            │   api.service.ts         │
            │                          │
            │  async function          │
            │  fetchProfile():         │
            │    ApiResult<Profile>    │
            │  {                       │
            │    try {                 │
            │      const res = await   │
            │        apiFetch(...)     │
            │                          │
            │      if (!res.ok)        │
            │        return error      │
            │                          │
            │      const data =        │
            │        await res.json()  │
            │                          │
            │      return success      │
            │    } catch {             │
            │      return error        │
            │    }                     │
            │  }                       │
            └────────┬─────────────────┘
                     │
                     │ returns ApiResult<T>
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐         ┌──────────────┐
│  Success     │         │  Error       │
│              │         │              │
│ {            │         │ {            │
│   success:   │         │   success:   │
│     true,    │         │     false,   │
│   data: T    │         │   error: str │
│ }            │         │ }            │
└──────────────┘         └──────────────┘
        │                         │
        └────────────┬────────────┘
                     │
                     ▼
            ┌────────────────┐
            │  Custom Hook   │
            │  handles both  │
            │  success/error │
            └────────────────┘
```

## 8. Error Handling Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    Error Handling Flow                   │
└─────────────────────────────────────────────────────────┘

    User Action
        │
        ▼
    Component Event Handler
        │
        ▼
    Custom Hook Function
        │
        ├─ Set loading state (true)
        ├─ Clear previous errors
        │
        ▼
    Call Service Function
        │
        ├─ try/catch block
        │   │
        │   ├─ API call
        │   │   │
        │   │   ├─ Network error ──────────┐
        │   │   ├─ 401 Unauthorized ────────┼─┐
        │   │   ├─ 403 Forbidden ───────────┼─┼─┐
        │   │   ├─ 404 Not Found ───────────┼─┼─┼─┐
        │   │   ├─ 500 Server Error ────────┼─┼─┼─┼─┐
        │   │   └─ Success ─────────────────┼─┼─┼─┼─┼─┐
        │   │                                │ │ │ │ │ │
        │   └─ catch ──────────────────────────────┐ │ │ │ │ │
        │                                           │ │ │ │ │ │
        ▼                                           │ │ │ │ │ │
    Return ApiResult                                │ │ │ │ │ │
        │                                           │ │ │ │ │ │
        ▼                                           ▼ ▼ ▼ ▼ ▼ ▼
    Custom Hook Handles Result              ┌────────────────┐
        │                                    │ Error Handling │
        │                                    │                │
        ├─ if (result.success)               │ • Network:     │
        │   ├─ Update state with data        │   Generic msg  │
        │   └─ Clear errors                  │                │
        │                                    │ • 401:         │
        └─ else                              │   Clear auth   │
            ├─ Set error message             │   Redirect     │
            └─ Keep loading false            │                │
                │                            │ • 403:         │
                ▼                            │   Show error   │
        Component Re-renders                 │                │
                │                            │ • 404:         │
                ▼                            │   Show error   │
        Display Error UI                     │                │
        • Toast notification                 │ • 500:         │
        • Inline error message               │   Generic msg  │
        • Error boundary (critical)          │                │
                                             │ • Catch:       │
                                             │   Generic msg  │
                                             └────────────────┘
```

## 9. Type Transformation Flow

```
┌─────────────────────────────────────────────────────────┐
│              Type Transformation Pipeline                │
└─────────────────────────────────────────────────────────┘

    Backend API
        │
        │ Returns
        ▼
┌──────────────────────┐
│ ProfileApiResponse   │  Raw API structure
│                      │  • snake_case fields
│ {                    │  • nullable strings
│   id: string         │  • ISO date strings
│   full_name: string  │  • nested objects
│   username: null     │  • minimal processing
│   wa_number: null    │
│   date_of_birth: ISO │
│   house: {           │
│     blok_rumah: str  │
│     members: [...]   │
│   }                  │
│   ...                │
│ }                    │
└──────────┬───────────┘
           │
           │ Pass to
           ▼
┌──────────────────────┐
│   Transformer        │  Business logic layer
│                      │
│ transformProfile(    │  • Normalize data
│   api: ApiResponse   │  • Format dates
│ ): ProfileData       │  • Compute derived fields
│                      │  • Set defaults
│ {                    │  • Build display strings
│   // Normalize       │
│   username:          │
│     api.username     │
│     ?? "—",          │
│                      │
│   // Format dates    │
│   dateOfBirth:       │
│     formatDate(...)  │
│                      │
│   // Compute fields  │
│   isKepalaKeluarga:  │
│     checkRole(...)   │
│                      │
│   // Transform array │
│   members:           │
│     api.house        │
│       .members       │
│       .map(...)      │
│ }                    │
└──────────┬───────────┘
           │
           │ Returns
           ▼
┌──────────────────────┐
│   ProfileData        │  UI-optimized model
│                      │  • camelCase fields
│ {                    │  • non-null strings
│   id: string         │  • formatted dates
│   fullName: string   │  • computed properties
│   username: string   │  • flattened structure
│   waNumber: string   │  • display-ready
│   dateOfBirth: str?  │
│   dateFormatted: str │
│   currentHouse: {    │
│     id: string       │
│     displayName: str │
│     members: Member[]│
│   }                  │
│   isKepalaKeluarga   │
│   ...                │
│ }                    │
└──────────┬───────────┘
           │
           │ Used by
           ▼
┌──────────────────────┐
│   React Component    │  Direct consumption
│                      │
│ <div>                │  • No transformation
│   {profile.fullName} │  • Type-safe
│   {profile           │  • Autocomplete
│     .dateFormatted}  │  • Easy to use
│   {profile           │
│     .currentHouse    │
│     .display