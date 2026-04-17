# Profile Page Refactoring Plan

## Table of Contents
1. [Overview](#overview)
2. [Current Problems](#current-problems)
3. [Refactoring Strategy](#refactoring-strategy)
4. [Architecture Design](#architecture-design)
5. [Detailed Implementation Plan](#detailed-implementation-plan)
6. [Migration Guide](#migration-guide)
7. [Success Metrics](#success-metrics)

---

## Overview

The profile page (`src/app/profil/page.tsx`) is a **2,215-line monolithic component** that desperately needs refactoring. It manages multiple complex domains in a single component with no separation of concerns.

### Current State
- **Lines of Code**: 2,215
- **useState Declarations**: 40+
- **Inline API Calls**: ~15+
- **Mixed Concerns**: 7+ different domains
- **Complexity**: Very High
- **Maintainability**: Very Low
- **Testability**: Nearly Impossible

### Refactoring Goals
1. ✅ **Reduce main page to ~200 lines** (composition only)
2. ✅ **Separate concerns** into distinct layers
3. ✅ **Make code testable** with proper abstractions
4. ✅ **Enable reusability** of hooks and components
5. ✅ **Improve type safety** with proper interfaces
6. ✅ **Centralize configuration** for easy maintenance
7. ✅ **Follow SOLID principles** throughout

---

## Current Problems

### 🔴 State Management Chaos

**40+ useState declarations** managing unrelated concerns:

```typescript
// Profile data (5 states)
const [profile, setProfile] = useState<ProfileData | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [isEditing, setIsEditing] = useState(false);
const [saving, setSaving] = useState(false);

// Edit form (5 states)
const [editFullName, setEditFullName] = useState("");
const [editUsername, setEditUsername] = useState("");
const [editWaNumber, setEditWaNumber] = useState("");
const [editEmail, setEditEmail] = useState("");
const [editDateOfBirth, setEditDateOfBirth] = useState("");

// Validation (5 states)
const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
const [usernameCheckStatus, setUsernameCheckStatus] = useState<...>("idle");
const [waNumberCheckLoading, setWaNumberCheckLoading] = useState(false);
const [waNumberCheckStatus, setWaNumberCheckStatus] = useState<...>("idle");
const [validationError, setValidationError] = useState<string | null>(null);

// PIN change (5 states)
const [isChangingPin, setIsChangingPin] = useState(false);
const [currentPin, setCurrentPin] = useState("");
const [newPin, setNewPin] = useState("");
const [confirmNewPin, setConfirmNewPin] = useState("");
const [pinError, setPinError] = useState<string | null>(null);

// Avatar upload (3 states)
const [avatarLoading, setAvatarLoading] = useState(false);
const [avatarError, setAvatarError] = useState<string | null>(null);
const fileInputRef = React.useRef<HTMLInputElement>(null);

// Family management (10+ states)
const [isManagingFamily, setIsManagingFamily] = useState(false);
const [showAddMemberForm, setShowAddMemberForm] = useState(false);
const [addMemberFullName, setAddMemberFullName] = useState("");
const [addMemberUsername, setAddMemberUsername] = useState("");
const [addMemberWaNumber, setAddMemberWaNumber] = useState("");
const [addMemberError, setAddMemberError] = useState<string | null>(null);
const [transferLoadingId, setTransferLoadingId] = useState<string | null>(null);
// ... and more

// Theme selection (3 states)
const [themeSheetOpen, setThemeSheetOpen] = useState(false);
const [appearanceSaving, setAppearanceSaving] = useState(false);
// ... etc
```

**Problem**: All these states are tangled together, making it hard to reason about the component's behavior.

### 🔴 Inline API Calls Everywhere

No abstraction for API calls - everything is inline:

```typescript
// In checkUsernameAvailability function
const res = await apiFetch("/api/profile/check/username", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: username.trim() }),
});

// In handleSave function
const res = await apiFetch("/api/profile", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    full_name: editFullName.trim(),
    username: hasUsername ? editUsername.trim() : null,
    // ... more fields
  }),
});

// In handleTransferOwner function
const res = await apiFetch(`/api/profile/house/${houseId}/transfer`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ targetUserId: member.userId }),
});

// ... and 10+ more inline API calls
```

**Problems**:
- ❌ Cannot test without mocking `apiFetch` globally
- ❌ Duplicated error handling logic
- ❌ Inconsistent response handling
- ❌ Hard to modify API structure

### 🔴 Mixed Concerns

Seven different domains mixed in one component:

1. **Profile Data Management** - Loading, editing, saving profile
2. **Validation** - Username/phone availability checks
3. **Avatar Upload** - Image upload and preview
4. **PIN Management** - Change PIN flow
5. **Family Management** - Add/remove members, transfer ownership
6. **Join Request Handling** - Accept/reject house join requests
7. **Theme Selection** - Change appearance theme
8. **Authentication** - Token management, logout

### 🔴 Complex Nested Rendering

2000+ lines of JSX with deep nesting:

```typescript
return (
  <>
    {/* 200+ lines of hero section */}
    <div>
      {/* 300+ lines of profile info */}
      {isEditing ? (
        {/* 500+ lines of edit form */}
      ) : (
        {/* 300+ lines of view mode */}
      )}
      {/* 400+ lines of family management */}
      {/* 300+ lines of join requests */}
    </div>
    {/* 200+ lines of theme sheet */}
    {/* 200+ lines of confirm dialog */}
  </>
);
```

### 🔴 No Type Safety for API Responses

Interfaces are defined but transformations are ad-hoc:

```typescript
// Direct assignment from API without validation
const data = await res.json();
setProfile(data); // Hope it matches ProfileData!
```

### 🔴 Impossible to Test

Cannot test individual features because:
- Everything is in one component
- State is tightly coupled
- API calls are inline
- Business logic mixed with UI

---

## Refactoring Strategy

Following the **Landing Page Refactor Pattern**, we'll apply:

### SOLID Principles

1. **Single Responsibility** - Each module has ONE job
2. **Open-Closed** - Open for extension, closed for modification
3. **Liskov Substitution** - Proper abstraction hierarchies
4. **Interface Segregation** - Focused, minimal interfaces
5. **Dependency Inversion** - Depend on abstractions, not concretions

### KISS Principle

**Keep It Simple, Stupid** - Prefer simple, obvious solutions over clever ones.

### Layer Separation

```
┌─────────────────────────────────────────────────────────┐
│                  ProfilePage (200 lines)                 │
│              Composition Layer - Assembles UI            │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
        ▼                                  ▼
┌──────────────────┐            ┌──────────────────┐
│  Custom Hooks    │            │   Components     │
│  State + Logic   │            │   Presentation   │
└────────┬─────────┘            └──────────────────┘
         │
         ▼
┌──────────────────┐
│    Services      │
│   API Calls      │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│ Trans- │ │ Valida-  │
│ formers│ │ tion     │
└────────┘ └──────────┘
```

---

## Architecture Design

### High-Level Structure

```
src/
├── types/profile/
│   └── index.ts                      # All profile-related types
│
├── config/
│   └── profile.ts                    # Constants and configuration
│
├── services/profile/
│   ├── api.service.ts                # API calls
│   ├── transformers.ts               # Data transformations
│   └── validation.service.ts         # Validation logic
│
├── hooks/profile/
│   ├── index.ts                      # Barrel export
│   ├── useProfileData.ts             # Core profile data
│   ├── useProfileEdit.ts             # Edit mode & save
│   ├── useFieldValidation.ts         # Username/phone validation
│   ├── useAvatarUpload.ts            # Avatar management
│   ├── usePinChange.ts               # PIN change flow
│   ├── useFamilyManagement.ts        # Family CRUD operations
│   ├── useJoinRequests.ts            # Join request handling
│   ├── useThemeSelection.ts          # Theme management
│   └── useResidenceSelector.ts       # Multi-residence support
│
├── components/profile/
│   ├── ProfileHeader.tsx             # Hero section
│   ├── ProfileInfoCard.tsx           # Profile info display
│   ├── ProfileEditForm.tsx           # Edit form
│   ├── FamilyMembersSection.tsx      # Family list
│   ├── AddMemberForm.tsx             # Add member form
│   ├── JoinRequestsSection.tsx       # Pending requests
│   ├── ResidenceSelector.tsx         # Multi-residence dropdown
│   ├── ThemeSheet.tsx                # Theme selection sheet
│   ├── ConfirmDialog.tsx             # Reusable confirm dialog
│   ├── PinChangeDialog.tsx           # Change PIN flow
│   └── shared/
│       ├── InfoRow.tsx               # Key-value display
│       ├── FieldInput.tsx            # Form input with validation
│       └── ValidationIndicator.tsx   # Username/phone check status
│
└── app/profil/
    └── page.tsx                      # Main page (composition only)
```

---

## Detailed Implementation Plan

### 1. Types Structure (`src/types/profile/index.ts`)

**Purpose**: Centralize all profile-related type definitions.

```typescript
// ============================================================================
// API Response Types (what we get from backend)
// ============================================================================

export interface ProfileApiResponse {
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
  tenant?: TenantApiResponse | null;
  community?: CommunityApiResponse | null;
  roles?: RoleApiResponse[];
  badges?: BadgeApiResponse[];
  house: HouseApiResponse | null;
  residences?: ResidenceApiResponse[];
  pendingJoinRequests?: JoinRequestApiResponse[];
  pendingJoinRequest?: PendingJoinRequestRequesterApiResponse | null;
}

export interface HouseApiResponse {
  houseId?: string;
  blok_rumah: string | null;
  address: string | null;
  name: string;
  members: FamilyMemberApiResponse[];
}

export interface FamilyMemberApiResponse {
  userId: string;
  fullName: string;
  username: string | null;
  relationship: string;
  isPrimary: boolean;
}

export interface ResidenceApiResponse {
  tenant: TenantApiResponse;
  community: CommunityApiResponse;
  house: HouseApiResponse;
  isPrimary: boolean;
  roles: RoleApiResponse[];
}

export interface JoinRequestApiResponse {
  id: string;
  houseId?: string;
  requesterFullName: string;
  blokRumah: string;
  createdAt: string;
}

export interface PendingJoinRequestRequesterApiResponse {
  blokRumah: string;
  ownerFullName: string;
  status: string;
}

export interface TenantApiResponse {
  id: string;
  name: string;
}

export interface CommunityApiResponse {
  id: string;
  code: string;
  name: string | null;
}

export interface RoleApiResponse {
  id: number;
  name: string;
  description: string | null;
}

export interface BadgeApiResponse {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  earnedAt: string;
}

// ============================================================================
// UI Model Types (transformed for UI consumption)
// ============================================================================

export interface ProfileData {
  id: string;
  fullName: string;
  username: string;
  waNumber: string;
  waNumberMasked: string;
  email: string;
  dateOfBirth: string | null;
  dateOfBirthFormatted: string;
  status: string;
  createdAt: string;
  profilePictureUrl: string | null;
  themeId: string;
  currentResidence: Residence | null;
  residences: Residence[];
  roles: Role[];
  badges: Badge[];
  pendingJoinRequests: JoinRequest[];
  hasActiveTenant: boolean;
}

export interface Residence {
  tenant: Tenant;
  community: Community;
  house: House;
  isPrimary: boolean;
  roles: Role[];
  isKepalaKeluarga: boolean;
}

export interface House {
  id: string;
  blokRumah: string;
  address: string;
  displayName: string;
  members: FamilyMember[];
}

export interface FamilyMember {
  userId: string;
  fullName: string;
  username: string;
  relationship: string;
  relationshipLabel: string;
  isPrimary: boolean;
}

export interface JoinRequest {
  id: string;
  houseId: string;
  requesterFullName: string;
  blokRumah: string;
  createdAt: string;
  createdAtFormatted: string;
}

export interface Tenant {
  id: string;
  name: string;
}

export interface Community {
  id: string;
  code: string;
  name: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
}

export interface Badge {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  earnedAtFormatted: string;
}

// ============================================================================
// Form Types
// ============================================================================

export interface ProfileEditFormData {
  fullName: string;
  username: string;
  waNumber: string;
  email: string;
  dateOfBirth: string;
}

export interface AddFamilyMemberFormData {
  fullName: string;
  username: string;
  waNumber: string;
}

export interface PinChangeFormData {
  currentPin: string;
  newPin: string;
  confirmNewPin: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export type ValidationStatus = "idle" | "checking" | "available" | "taken" | "error";

export interface FieldValidationState {
  status: ValidationStatus;
  isLoading: boolean;
  message: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

// ============================================================================
// Dialog Types
// ============================================================================

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

// ============================================================================
// Result Types (for service layer)
// ============================================================================

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface UploadAvatarResult {
  profilePictureUrl: string;
}

export interface CheckAvailabilityResult {
  available: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const RELATIONSHIP_TYPES = {
  OWNER: "OWNER",
  FAMILY: "FAMILY",
  TENANT: "TENANT",
  CARETAKER: "CARETAKER",
} as const;

export type RelationshipType = typeof RELATIONSHIP_TYPES[keyof typeof RELATIONSHIP_TYPES];
```

**Benefits**:
- ✅ Single source of truth for types
- ✅ Clear separation between API and UI models
- ✅ Type-safe transformations
- ✅ Autocomplete everywhere
- ✅ Easy to maintain

---

### 2. Config Structure (`src/config/profile.ts`)

**Purpose**: Centralize all profile-related configuration and constants.

```typescript
// ============================================================================
// API Endpoints
// ============================================================================

export const PROFILE_API_ENDPOINTS = {
  PROFILE: "/api/profile",
  CHECK_USERNAME: "/api/profile/check/username",
  CHECK_PHONE: "/api/profile/check/wa-number",
  UPLOAD_AVATAR: "/api/profile/upload-avatar",
  CHANGE_PIN: "/api/profile/change-pin",
  HOUSE_TRANSFER: (houseId: string) => `/api/profile/house/${houseId}/transfer`,
  HOUSE_REMOVE_MEMBER: (houseId: string) => `/api/profile/house/${houseId}/remove-member`,
  HOUSE_ADD_MEMBER: (houseId: string) => `/api/profile/house/${houseId}/add-member`,
  JOIN_REQUEST_RESPOND: "/api/profile/join-request/respond",
  THEME: "/api/profile/theme",
  LOGOUT: "/api/auth/logout",
} as const;

// ============================================================================
// Relationship Labels
// ============================================================================

export const RELATIONSHIP_LABELS: Record<string, string> = {
  OWNER: "Kepala Rumah Tangga",
  FAMILY: "Keluarga",
  TENANT: "Penyewa",
  CARETAKER: "Penjaga",
} as const;

// ============================================================================
// Validation Rules
// ============================================================================

export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/,
    MESSAGE: "Username harus 3-30 karakter (huruf, angka, underscore)",
  },
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
    PATTERN: /^[0-9]+$/,
    MESSAGE: "Nomor WhatsApp harus 10-15 digit angka",
  },
  FULL_NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
    MESSAGE: "Nama lengkap harus 2-100 karakter",
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MESSAGE: "Format email tidak valid",
  },
  PIN: {
    LENGTH: 6,
    PATTERN: /^[0-9]{6}$/,
    MESSAGE: "PIN harus 6 digit angka",
  },
} as const;

// ============================================================================
// Avatar Upload
// ============================================================================

export const AVATAR_CONFIG = {
  MAX_SIZE_MB: 5,
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
  ACCEPTED_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ACCEPTED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".webp"],
} as const;

// ============================================================================
// UI Messages
// ============================================================================

export const PROFILE_MESSAGES = {
  LOADING: "Memuat profil...",
  LOAD_ERROR: "Gagal memuat profil",
  SAVE_SUCCESS: "Profil berhasil diperbarui",
  SAVE_ERROR: "Gagal menyimpan profil",
  
  AVATAR_UPLOADING: "Mengunggah foto...",
  AVATAR_SUCCESS: "Foto profil berhasil diperbarui",
  AVATAR_ERROR: "Gagal mengunggah foto",
  AVATAR_SIZE_ERROR: "Ukuran file maksimal 5MB",
  AVATAR_TYPE_ERROR: "Format file harus JPG, PNG, atau WebP",
  
  PIN_CHANGE_SUCCESS: "PIN berhasil diubah",
  PIN_CHANGE_ERROR: "Gagal mengubah PIN",
  PIN_MISMATCH: "PIN baru tidak cocok",
  PIN_CURRENT_WRONG: "PIN saat ini salah",
  
  USERNAME_AVAILABLE: "Username tersedia",
  USERNAME_TAKEN: "Username sudah digunakan",
  USERNAME_CHECKING: "Memeriksa username...",
  
  PHONE_AVAILABLE: "Nomor tersedia",
  PHONE_TAKEN: "Nomor sudah digunakan",
  PHONE_CHECKING: "Memeriksa nomor...",
  
  FAMILY_ADD_SUCCESS: "Anggota keluarga berhasil ditambahkan",
  FAMILY_ADD_ERROR: "Gagal menambahkan anggota keluarga",
  FAMILY_REMOVE_SUCCESS: "Anggota keluarga berhasil dihapus",
  FAMILY_REMOVE_ERROR: "Gagal menghapus anggota keluarga",
  FAMILY_TRANSFER_SUCCESS: "Kepemilikan rumah berhasil dipindahkan",
  FAMILY_TRANSFER_ERROR: "Gagal memindahkan kepemilikan rumah",
  
  JOIN_REQUEST_ACCEPT_SUCCESS: "Permintaan bergabung diterima",
  JOIN_REQUEST_REJECT_SUCCESS: "Permintaan bergabung ditolak",
  JOIN_REQUEST_ERROR: "Gagal memproses permintaan",
  
  THEME_CHANGE_SUCCESS: "Tema berhasil diubah",
  THEME_CHANGE_ERROR: "Gagal mengubah tema",
  
  LOGOUT_SUCCESS: "Berhasil keluar",
  LOGOUT_ERROR: "Gagal keluar",
} as const;

// ============================================================================
// Confirm Dialog Templates
// ============================================================================

export const CONFIRM_DIALOGS = {
  TRANSFER_OWNERSHIP: (memberName: string) => ({
    title: "Pindahkan Kepemilikan?",
    message: `Yakin ingin memindahkan kepemilikan rumah ke ${memberName}? Anda akan menjadi anggota keluarga biasa.`,
    confirmLabel: "Ya, Pindahkan",
    cancelLabel: "Batal",
    danger: false,
  }),
  
  REMOVE_MEMBER: (memberName: string) => ({
    title: "Hapus Anggota?",
    message: `Yakin ingin menghapus ${memberName} dari rumah ini?`,
    confirmLabel: "Ya, Hapus",
    cancelLabel: "Batal",
    danger: true,
  }),
  
  CHANGE_PIN: {
    title: "Ubah PIN",
    message: "Masukkan PIN saat ini dan PIN baru Anda.",
    confirmLabel: "Ubah PIN",
    cancelLabel: "Batal",
    danger: false,
  },
  
  LOGOUT: {
    title: "Keluar",
    message: "Yakin ingin keluar dari akun?",
    confirmLabel: "Ya, Keluar",
    cancelLabel: "Batal",
    danger: false,
  },
} as const;

// ============================================================================
// Default Values
// ============================================================================

export const PROFILE_DEFAULTS = {
  THEME_ID: "green",
  AVATAR_PLACEHOLDER: "/images/avatar-placeholder.png",
  BLOK_LABEL: "Blok —",
  USERNAME_PLACEHOLDER: "Belum diatur",
  PHONE_PLACEHOLDER: "Belum diatur",
  EMAIL_PLACEHOLDER: "Belum diatur",
  DATE_PLACEHOLDER: "Belum diatur",
} as const;

// ============================================================================
// Debounce Times (ms)
// ============================================================================

export const DEBOUNCE_TIMES = {
  USERNAME_CHECK: 500,
  PHONE_CHECK: 500,
  AUTO_SAVE: 1000,
} as const;
```

**Benefits**:
- ✅ All configuration in one place
- ✅ Easy to modify messages
- ✅ Type-safe endpoint functions
- ✅ Reusable dialog templates
- ✅ Centralized validation rules

---

### 3. Services Structure

#### 3.1 API Service (`src/services/profile/api.service.ts`)

**Purpose**: Handle all API interactions with consistent error handling.

```typescript
import { apiFetch } from "@/lib/api-client";
import { PROFILE_API_ENDPOINTS } from "@/config/profile";
import type {
  ApiResult,
  ProfileApiResponse,
  CheckAvailabilityResult,
  UploadAvatarResult,
} from "@/types/profile";

// ============================================================================
// Profile Data
// ============================================================================

export async function fetchProfile(): Promise<ApiResult<ProfileApiResponse>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.PROFILE);
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: data.error ?? "Gagal memuat profil" 
      };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: "Gagal memuat profil" 
    };
  }
}

export async function updateProfile(payload: {
  full_name: string;
  username: string | null;
  wa_number: string | null;
  email: string | null;
  date_of_birth: string | null;
}): Promise<ApiResult<ProfileApiResponse>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.PROFILE, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: data.error ?? "Gagal menyimpan profil" 
      };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: "Gagal menyimpan profil" 
    };
  }
}

// ============================================================================
// Validation
// ============================================================================

export async function checkUsernameAvailability(
  username: string
): Promise<ApiResult<CheckAvailabilityResult>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.CHECK_USERNAME, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: "Gagal memeriksa username" 
    };
  }
}

export async function checkPhoneAvailability(
  waNumber: string
): Promise<ApiResult<CheckAvailabilityResult>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.CHECK_PHONE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waNumber }),
    });
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: "Gagal memeriksa nomor telepon" 
    };
  }
}

// ============================================================================
// Avatar
// ============================================================================

export async function uploadAvatar(
  file: File
): Promise<ApiResult<UploadAvatarResult>> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await apiFetch(PROFILE_API_ENDPOINTS.UPLOAD_AVATAR, {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: data.error ?? "Gagal mengunggah foto" 
      };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: "Gagal mengunggah foto" 
    };
  }
}

// ============================================================================
// PIN
// ============================================================================

export async function changePin(payload: {
  currentPin: string;
  newPin: string;
}): Promise<ApiResult<void>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.CHANGE_PIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: data.error ?? "Gagal mengubah PIN" 
      };
    }
    
    return { success: true, data: undefined };
  } catch (error) {
    return { 
      success: false, 
      error: "Gagal mengubah PIN" 
    };
  }
}

// ============================================================================
// Family Management
// ============================================================================

export async function transfer