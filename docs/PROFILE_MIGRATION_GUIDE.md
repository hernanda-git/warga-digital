# Profile Page Refactoring - Migration & Implementation Guide

## Table of Contents

1. [Migration Strategy](#migration-strategy)
2. [Prerequisites](#prerequisites)
3. [Implementation Phases](#implementation-phases)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Testing Strategy](#testing-strategy)
6. [Rollback Plan](#rollback-plan)
7. [Common Pitfalls](#common-pitfalls)
8. [Performance Considerations](#performance-considerations)
9. [Checklist](#checklist)

---

## Migration Strategy

### Approach: **Incremental Migration with Feature Flags**

We'll use an **incremental approach** rather than a big bang rewrite:

```
Phase 1: Foundation (Types, Config, Services)     → 2-3 days
Phase 2: Core Hooks (Profile Data, Edit)          → 2-3 days
Phase 3: Feature Hooks (Avatar, PIN, Family, etc) → 3-4 days
Phase 4: Components (Presentational)               → 3-4 days
Phase 5: Page Integration & Testing                → 2-3 days
Phase 6: Cleanup & Documentation                   → 1-2 days
---------------------------------------------------------------
Total Estimated Time: 13-19 days (2.5-4 weeks)
```

### Why Incremental?

✅ **Lower risk** - Can test each layer independently  
✅ **Easier to debug** - Smaller changesets  
✅ **Team can continue working** - No major disruption  
✅ **Easy to rollback** - Can revert specific parts  
✅ **Progressive enhancement** - Can ship improvements incrementally  

---

## Prerequisites

### 1. Environment Setup

```bash
# Ensure you're on the latest main branch
git checkout main
git pull origin main

# Create a feature branch
git checkout -b refactor/profile-page-modular

# Install dependencies (if needed)
npm install
```

### 2. Code Freeze

⚠️ **Important**: Notify team to avoid modifying `src/app/profil/page.tsx` during refactoring.

### 3. Backup Current Implementation

```bash
# Create a backup of the current page
cp src/app/profil/page.tsx src/app/profil/page.backup.tsx
```

### 4. Testing Environment

Ensure you have:
- ✅ Local development environment working
- ✅ Test user accounts with different roles
- ✅ Access to API endpoints
- ✅ Browser DevTools ready

---

## Implementation Phases

### Phase 1: Foundation Layer (2-3 days)

**Goal**: Create the foundational structure without breaking existing code.

#### 1.1 Create Directory Structure

```bash
# Create directories
mkdir -p src/types/profile
mkdir -p src/config
mkdir -p src/services/profile
mkdir -p src/hooks/profile
mkdir -p src/components/profile
mkdir -p src/components/profile/shared
```

#### 1.2 Extract Types

**File**: `src/types/profile/index.ts`

Start by extracting all interfaces from the current `page.tsx`:

```typescript
// Copy existing interfaces from page.tsx
interface FamilyMember { ... }
interface PendingJoinRequestItem { ... }
// ... etc

// Add new API response types
export interface ProfileApiResponse { ... }

// Add UI model types
export interface ProfileData { ... }

// Add form types
export interface ProfileEditFormData { ... }

// Add validation types
export type ValidationStatus = "idle" | "checking" | "available" | "taken" | "error";
```

**Testing**: Import these types in the original page.tsx and verify no TypeScript errors.

```typescript
// In src/app/profil/page.tsx
import type { 
  ProfileData, 
  FamilyMember,
  // ... other types
} from "@/types/profile";

// Verify all type usages still work
```

#### 1.3 Create Configuration

**File**: `src/config/profile.ts`

```typescript
export const PROFILE_API_ENDPOINTS = {
  PROFILE: "/api/profile",
  CHECK_USERNAME: "/api/profile/check/username",
  // ... all endpoints
} as const;

export const RELATIONSHIP_LABELS: Record<string, string> = {
  OWNER: "Kepala Rumah Tangga",
  FAMILY: "Keluarga",
  TENANT: "Penyewa",
  CARETAKER: "Penjaga",
} as const;

export const VALIDATION_RULES = { ... };
export const PROFILE_MESSAGES = { ... };
export const AVATAR_CONFIG = { ... };
```

**Testing**: Import and use in page.tsx to verify constants work.

#### 1.4 Create Services

**File**: `src/services/profile/api.service.ts`

Extract API calls one by one:

```typescript
import { apiFetch } from "@/lib/api-client";
import { PROFILE_API_ENDPOINTS } from "@/config/profile";
import type { ApiResult, ProfileApiResponse } from "@/types/profile";

export async function fetchProfile(): Promise<ApiResult<ProfileApiResponse>> {
  try {
    const response = await apiFetch(PROFILE_API_ENDPOINTS.PROFILE);
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data.error ?? "Gagal memuat profil" };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Gagal memuat profil" };
  }
}

// Repeat for all API calls...
```

**Testing**: Write unit tests for each service function.

```typescript
// src/services/profile/__tests__/api.service.test.ts
import { fetchProfile } from "../api.service";

describe("fetchProfile", () => {
  it("returns success with valid data", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: "123", fullName: "Test" }),
      })
    );

    const result = await fetchProfile();
    expect(result.success).toBe(true);
  });

  it("returns error on failure", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Not found" }),
      })
    );

    const result = await fetchProfile();
    expect(result.success).toBe(false);
  });
});
```

**File**: `src/services/profile/transformers.ts`

```typescript
import type { ProfileApiResponse, ProfileData } from "@/types/profile";
import { PROFILE_DEFAULTS, RELATIONSHIP_LABELS } from "@/config/profile";

export function transformProfileData(
  apiResponse: ProfileApiResponse
): ProfileData {
  // Transform API response to UI model
  return {
    id: apiResponse.id,
    fullName: apiResponse.fullName ?? "Warga",
    username: apiResponse.username ?? PROFILE_DEFAULTS.USERNAME_PLACEHOLDER,
    waNumber: apiResponse.waNumber ?? PROFILE_DEFAULTS.PHONE_PLACEHOLDER,
    // ... all transformations
  };
}

export function transformFamilyMember(
  apiMember: FamilyMemberApiResponse
): FamilyMember {
  return {
    userId: apiMember.userId,
    fullName: apiMember.fullName,
    username: apiMember.username ?? "—",
    relationship: apiMember.relationship,
    relationshipLabel: RELATIONSHIP_LABELS[apiMember.relationship] ?? apiMember.relationship,
    isPrimary: apiMember.isPrimary,
  };
}
```

**Testing**: Unit test transformers with various input scenarios.

**File**: `src/services/profile/validation.service.ts`

```typescript
import type { ValidationResult } from "@/types/profile";
import { VALIDATION_RULES, PROFILE_MESSAGES } from "@/config/profile";

export function validateUsername(username: string): ValidationResult {
  if (!username.trim()) {
    return { isValid: false, error: "Username tidak boleh kosong" };
  }

  if (username.length < VALIDATION_RULES.USERNAME.MIN_LENGTH) {
    return { isValid: false, error: VALIDATION_RULES.USERNAME.MESSAGE };
  }

  if (!VALIDATION_RULES.USERNAME.PATTERN.test(username)) {
    return { isValid: false, error: VALIDATION_RULES.USERNAME.MESSAGE };
  }

  return { isValid: true, error: null };
}

export function validatePhone(phone: string): ValidationResult {
  // Similar validation logic
}

export function validatePin(pin: string): ValidationResult {
  // PIN validation
}

export function validateAvatarFile(file: File): ValidationResult {
  // File validation
}

export function validateProfileForm(formData: ProfileEditFormData): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Full name
  if (!formData.fullName.trim()) {
    errors.fullName = "Nama lengkap tidak boleh kosong";
  }

  // Username
  if (formData.username) {
    const usernameResult = validateUsername(formData.username);
    if (!usernameResult.isValid) {
      errors.username = usernameResult.error!;
    }
  }

  // ... other validations

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
```

**Testing**: Unit test all validation functions.

---

### Phase 2: Core Hooks (2-3 days)

**Goal**: Create the primary hooks that manage profile data and editing.

#### 2.1 useProfileData (Core Hook)

**File**: `src/hooks/profile/useProfileData.ts`

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useAppearanceStore } from "@/stores/appearance-store";
import { fetchProfile } from "@/services/profile/api.service";
import { transformProfileData } from "@/services/profile/transformers";
import { setThemeCookie } from "@/lib/theme-cookie";
import { setHeaderProfileCookie } from "@/lib/header-profile-cookie";
import type { ProfileData, Residence } from "@/types/profile";

export interface UseProfileDataReturn {
  profile: ProfileData | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  currentResidence: Residence | null;
  isKepalaKeluarga: boolean;
}

export function useProfileData(): UseProfileDataReturn {
  // Implementation as outlined in PROFILE_HOOKS_PLAN.md
  // ...
}
```

**Testing**: Create integration test for useProfileData.

```typescript
// src/hooks/profile/__tests__/useProfileData.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useProfileData } from "../useProfileData";

describe("useProfileData", () => {
  it("loads profile on mount", async () => {
    const { result } = renderHook(() => useProfileData());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile).not.toBeNull();
  });

  it("redirects on 401", async () => {
    // Mock 401 response
    // Test redirect behavior
  });
});
```

#### 2.2 useProfileEdit

**File**: `src/hooks/profile/useProfileEdit.ts`

Implement as outlined in hooks plan.

**Testing**: Test edit flow, validation, save logic.

#### 2.3 Barrel Export

**File**: `src/hooks/profile/index.ts`

```typescript
export { useProfileData } from "./useProfileData";
export { useProfileEdit } from "./useProfileEdit";
export type { UseProfileDataReturn } from "./useProfileData";
export type { UseProfileEditReturn } from "./useProfileEdit";
```

#### 2.4 Integration Test in Page

Now test these hooks in the actual page by using them alongside existing code:

```typescript
// In src/app/profil/page.tsx
import { useProfileData, useProfileEdit } from "@/hooks/profile";

export default function ProfilePage() {
  // NEW: Test hooks (but don't use them yet)
  const {
    profile: newProfile,
    isLoading: newLoading,
    error: newError,
  } = useProfileData();

  // OLD: Keep existing implementation
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  // ... existing code

  // VERIFY: Log to console to compare
  useEffect(() => {
    console.log("OLD profile:", profile);
    console.log("NEW profile:", newProfile);
    console.log("Match:", JSON.stringify(profile) === JSON.stringify(newProfile));
  }, [profile, newProfile]);

  // Use OLD implementation for now
  return (
    // ... existing JSX
  );
}
```

**Validation**: Verify logs show matching data between old and new implementations.

---

### Phase 3: Feature Hooks (3-4 days)

**Goal**: Create all remaining hooks for specific features.

Implement in this order:

1. **useFieldValidation** - Username/phone validation
2. **useAvatarUpload** - Avatar management
3. **usePinChange** - PIN change dialog
4. **useFamilyManagement** - Family CRUD
5. **useJoinRequests** - Join request handling
6. **useThemeSelection** - Theme management
7. **useResidenceSelector** - Multi-residence support

For each hook:
1. ✅ Implement the hook
2. ✅ Write unit tests
3. ✅ Test in isolation
4. ✅ Add to barrel export

---

### Phase 4: Components (3-4 days)

**Goal**: Extract presentational components.

#### 4.1 Shared Components First

**File**: `src/components/profile/shared/InfoRow.tsx`

```typescript
interface InfoRowProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

export function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-200">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
```

**File**: `src/components/profile/shared/FieldInput.tsx`

```typescript
interface FieldInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "date";
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  validationIndicator?: React.ReactNode;
}

export function FieldInput({ ... }: FieldInputProps) {
  // Implementation
}
```

#### 4.2 Major Components

Extract components in this order:

1. **ProfileHeader** - Hero section with avatar
2. **ProfileInfoCard** - Info display wrapper
3. **ProfileEditForm** - Edit form
4. **FamilyMembersSection** - Family list and management
5. **JoinRequestsSection** - Join requests
6. **ThemeSheet** - Theme selection
7. **PinChangeDialog** - PIN change
8. **ConfirmDialog** - Reusable confirmation

For each component:
1. ✅ Create component file
2. ✅ Extract JSX from page.tsx
3. ✅ Define props interface
4. ✅ Make it presentational (no logic)
4. ✅ Add to barrel export
5. ✅ Write component tests

---

### Phase 5: Page Integration (2-3 days)

**Goal**: Replace old implementation with new modular version.

#### 5.1 Create New Page (Parallel)

**File**: `src/app/profil-new/page.tsx` (temporary)

```typescript
"use client";

import { PageLoader } from "@/components/ui";
import {
  useProfileData,
  useProfileEdit,
  useAvatarUpload,
  usePinChange,
  useFamilyManagement,
  useJoinRequests,
  useThemeSelection,
  useResidenceSelector,
} from "@/hooks/profile";
import {
  ProfileHeader,
  ProfileInfoCard,
  ProfileEditForm,
  FamilyMembersSection,
  JoinRequestsSection,
  ThemeSheet,
  PinChangeDialog,
  ConfirmDialog,
} from "@/components/profile";

export default function ProfilePage() {
  // ========================================
  // HOOKS
  // ========================================
  
  const {
    profile,
    isLoading,
    error,
    refreshProfile,
    currentResidence,
    isKepalaKeluarga,
  } = useProfileData();

  const {
    isEditing,
    formData,
    isSaving,
    saveError,
    validationErrors,
    startEditing,
    cancelEditing,
    updateField,
    handleSave,
  } = useProfileEdit(profile);

  const {
    isUploading,
    uploadError,
    fileInputRef,
    handleFileSelect,
    triggerFileInput,
  } = useAvatarUpload();

  const {
    isOpen: isPinDialogOpen,
    formData: pinFormData,
    isChanging: isPinChanging,
    changeError: pinError,
    openDialog: openPinDialog,
    closeDialog: closePinDialog,
    updatePin,
    handleChange: handlePinChange,
  } = usePinChange();

  const {
    showAddForm,
    addFormData,
    isAdding,
    addError,
    transferLoadingId,
    removeLoadingId,
    showAddMemberForm,
    hideAddMemberForm,
    updateAddFormField,
    handleAddMember,
    handleTransferOwnership,
    handleRemoveMember,
  } = useFamilyManagement(currentResidence?.house ?? null);

  const {
    respondingId,
    respondError,
    handleAccept: handleAcceptJoinRequest,
    handleReject: handleRejectJoinRequest,
  } = useJoinRequests();

  const {
    isOpen: isThemeSheetOpen,
    selectedTheme,
    isSaving: isThemeSaving,
    openSheet: openThemeSheet,
    closeSheet: closeThemeSheet,
    handleSelect: handleThemeSelect,
  } = useThemeSelection();

  const {
    selectedIndex,
    currentResidence: selectedResidence,
    handleChange: handleResidenceChange,
  } = useResidenceSelector(profile?.residences ?? []);

  // ========================================
  // LOADING & ERROR STATES
  // ========================================
  
  if (isLoading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={refreshProfile} className="mt-4 btn-primary">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // ========================================
  // RENDER
  // ========================================
  
  return (
    <>
      {/* Header */}
      <ProfileHeader
        profile={profile}
        onAvatarClick={triggerFileInput}
        isUploading={isUploading}
        uploadError={uploadError}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Residence Selector (if multiple residences) */}
      {profile.residences.length > 1 && (
        <ResidenceSelector
          residences={profile.residences}
          selectedIndex={selectedIndex}
          onChange={handleResidenceChange}
        />
      )}

      {/* Profile Info / Edit Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {isEditing ? (
          <ProfileEditForm
            formData={formData}
            isSaving={isSaving}
            saveError={saveError}
            validationErrors={validationErrors}
            onFieldChange={updateField}
            onSave={handleSave}
            onCancel={cancelEditing}
          />
        ) : (
          <ProfileInfoCard
            profile={profile}
            onEdit={startEditing}
            onChangePin={openPinDialog}
            onChangeTheme={openThemeSheet}
            onLogout={handleLogout}
          />
        )}
      </div>

      {/* Family Management (if Kepala Keluarga) */}
      {isKepalaKeluarga && currentResidence && (
        <FamilyMembersSection
          members={currentResidence.house.members}
          showAddForm={showAddForm}
          addFormData={addFormData}
          isAdding={isAdding}
          addError={addError}
          transferLoadingId={transferLoadingId}
          removeLoadingId={removeLoadingId}
          onShowAddForm={showAddMemberForm}
          onHideAddForm={hideAddMemberForm}
          onUpdateAddFormField={updateAddFormField}
          onAddMember={handleAddMember}
          onTransferOwnership={handleTransferOwnership}
          onRemoveMember={handleRemoveMember}
        />
      )}

      {/* Join Requests */}
      {profile.pendingJoinRequests.length > 0 && (
        <JoinRequestsSection
          requests={profile.pendingJoinRequests}
          respondingId={respondingId}
          respondError={respondError}
          onAccept={handleAcceptJoinRequest}
          onReject={handleRejectJoinRequest}
        />
      )}

      {/* Theme Selection Sheet */}
      <ThemeSheet
        isOpen={isThemeSheetOpen}
        selectedTheme={selectedTheme}
        isSaving={isThemeSaving}
        onClose={closeThemeSheet}
        onSelect={handleThemeSelect}
      />

      {/* PIN Change Dialog */}
      <PinChangeDialog
        isOpen={isPinDialogOpen}
        formData={pinFormData}
        isChanging={isPinChanging}
        error={pinError}
        onClose={closePinDialog}
        onUpdatePin={updatePin}
        onChange={handlePinChange}
      />
    </>
  );
}
```

#### 5.2 Testing New Page

Test the new page thoroughly:

1. ✅ All features work correctly
2. ✅ No console errors
3. ✅ Loading states work
4. ✅ Error handling works
5. ✅ All user flows functional
6. ✅ Performance is good

#### 5.3 A/B Testing (Optional)

Add feature flag to test both versions:

```typescript
// In src/app/profil/page.tsx
const USE_NEW_IMPLEMENTATION = process.env.NEXT_PUBLIC_USE_NEW_PROFILE === "true";

export default function ProfilePage() {
  if (USE_NEW_IMPLEMENTATION) {
    return <NewProfilePage />;
  }
  return <OldProfilePage />;
}
```

#### 5.4 Replace Old Implementation

Once confident:

```bash
# Backup old
mv src/app/profil/page.tsx src/app/profil/page.old.tsx

# Move new
mv src/app/profil-new/page.tsx src/app/profil/page.tsx
```

---

### Phase 6: Cleanup (1-2 days)

**Goal**: Remove old code and finalize documentation.

1. ✅ Delete old backup files
2. ✅ Remove unused imports
3. ✅ Update documentation
4. ✅ Run linter and fix issues
5. ✅ Final testing
6. ✅ Code review

---

## Testing Strategy

### Unit Tests

Test each layer independently:

```typescript
// Services
describe("fetchProfile", () => { ... });
describe("transformProfileData", () => { ... });
describe("validateUsername", () => { ... });

// Hooks
describe("useProfileData", () => { ... });
describe("useProfileEdit", () => { ... });

// Components
describe("ProfileHeader", () => { ... });
describe("FieldInput", () => { ... });
```

### Integration Tests

Test hook interactions:

```typescript
describe("Profile Edit Flow", () => {
  it("should load, edit, and save profile", async () => {
    // Test complete flow
  });
});
```

### E2E Tests

Test complete user journeys:

```typescript
describe("Profile Page", () => {
  it("should allow user to edit profile", () => {
    cy.visit("/profil");
    cy.get("[data-testid=edit-button]").click();
    cy.get("[data-testid=fullname-input]").type("New Name");
    cy.get("[data-testid=save-button]").click();
    cy.contains("Profil berhasil diperbarui");
  });
});
```

---

## Rollback Plan

### If Issues Found in Production

#### Option 1: Immediate Rollback (< 5 minutes)

```bash
# Revert to old implementation
git revert <commit-hash>
git push origin main

# Or manual rollback
cp src/app/profil/page.old.tsx src/app/profil/page.tsx
git commit -m "Rollback profile page refactor"
git push
```

#### Option 2: Feature Flag Disable

```bash
# Set environment variable
NEXT_PUBLIC_USE_NEW_PROFILE=false

# Rebuild and deploy
npm run build
```

#### Option 3: Targeted Fix

If issue is in specific hook/component:
1. Identify problematic component
2. Revert just that component
3. Use old implementation for that feature
4. Fix and redeploy

---

## Common Pitfalls

### 1. **State Sync Issues**

❌ **Problem**: Profile data out of sync between hooks

✅ **Solution**: Always use `useProfileData` as single source of truth. Other hooks should call `refreshProfile()` after mutations.

### 2. **Infinite Re-render Loops**

❌ **Problem**: useEffect dependencies cause infinite loops

✅ **Solution**: Use `useCallback` for functions. Add proper dependency arrays.

### 3. **Type Mismatches**

❌ **Problem**: API response doesn't match expected type

✅ **Solution**: Use transformers to convert API → UI models. Validate with Zod or similar.

### 4. **Memory Leaks**

❌ **Problem**: Subscriptions/listeners not cleaned up

✅ **Solution**: Return cleanup functions from useEffect:

```typescript
useEffect(() => {
  const subscription = subscribeToData();
  return () => {
    subscription.unsubscribe(); // Cleanup
  };
}, []);
```

### 5. **Race Conditions**

❌ **Problem**: Multiple API calls in flight, last one doesn't win

✅ **Solution**: Use abort controllers or ignore stale requests:

```typescript
useEffect(() => {
  let ignore = false;
  
  async function loadData() {
    const result = await fetchData();
    if (!ignore) {
      setData(result);
    }
  }
  
  loadData();
  
  return () => {
    ignore = true;
  };
}, []);
```

### 6. **Testing Async Hooks**

❌ **Problem**: Tests fail intermittently

✅ **Solution**: Use `waitFor` and proper async handling:

```typescript
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});
```

---

## Performance Considerations

### 1. **Memoization**

Use `useMemo` for expensive computations:

```typescript
const isKepalaKeluarga = useMemo(() => {
  return currentResidence?.roles.some(r => r.name === "OWNER") ?? false;
}, [currentResidence]);
```

### 2. **Debouncing**

Debounce validation checks:

```typescript
const checkUsername = useMemo(
  () => debounce(async (username: string) => {
    // Check availability
  }, 500),
  []
);
```

### 3. **Code Splitting**

Lazy load heavy components:

```typescript
const ThemeSheet = lazy(() => import("@/components/profile/ThemeSheet"));
const PinChangeDialog = lazy(() => import("@/components/profile/PinChangeDialog"));
```

### 4. **Avoid Unnecessary Re-renders**

Use `React.memo` for pure components:

```typescript
export const InfoRow = React.memo(function InfoRow({ label, value }) {
  return <div>...</div>;
});
```

---

## Checklist

### Pre-Implementation

- [ ] Read all documentation (REFACTOR.md, ARCHITECTURE.md, HOOKS_PLAN.md)
- [ ] Understand current implementation
- [ ] Set up testing environment
- [ ] Create feature branch
- [ ] Notify team of refactoring

### Phase 1: Foundation

- [ ] Create directory structure
- [ ] Extract types to `types/profile/`
- [ ] Create config in `config/profile.ts`
- [ ] Create API service
- [ ] Create transformers
- [ ] Create validation service
- [ ] Write unit tests for services
- [ ] All tests pass

### Phase 2: Core Hooks

- [ ] Implement `useProfileData`
- [ ] Implement `useProfileEdit`
- [ ] Write hook tests
- [ ] Test hooks in page (parallel)
- [ ] Verify data matches old implementation

### Phase 3: Feature Hooks

- [ ] Implement `useFieldValidation`
- [ ] Implement `useAvatarUpload`
- [ ] Implement `usePinChange`
- [ ] Implement `useFamilyManagement`
- [ ] Implement `useJoinRequests`
- [ ] Implement `useThemeSelection`
- [ ] Implement `useResidenceSelector`
- [ ] Write tests for all hooks
- [ ] All hook tests pass

### Phase 4: Components

- [ ] Create shared components (InfoRow, FieldInput)
- [ ] Create ProfileHeader
- [ ] Create ProfileInfoCard
- [ ] Create ProfileEditForm
- [ ] Create FamilyMembersSection
- [ ] Create JoinRequestsSection
- [ ] Create ThemeSheet
- [ ] Create PinChangeDialog
- [ ] Create ConfirmDialog
- [ ] Write component tests
- [ ] All component tests pass

### Phase 5: Integration

- [ ] Create new page implementation
- [ ] Test all features work
- [ ] Test loading states
- [ ] Test error handling
- [ ] Performance testing
- [ ] Accessibility testing
- [ ] Cross-browser testing
- [ ] Replace old implementation
- [ ] Smoke test production

### Phase 6: Cleanup

- [ ] Remove old files
- [ ] Update documentation
- [ ] Run linter
- [ ] Code review
- [ ] Final QA
- [ ] Deploy to production
- [ ] Monitor for errors

---

## Success Metrics

After refactoring, you should see:

✅ **Code Metrics**
- Main page: ~2,