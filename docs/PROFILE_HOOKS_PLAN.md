# Profile Page Hooks - Detailed Implementation Plan

## Table of Contents

1. [Overview](#overview)
2. [Hook Architecture](#hook-architecture)
3. [Core Hooks](#core-hooks)
4. [Feature Hooks](#feature-hooks)
5. [Implementation Details](#implementation-details)
6. [Testing Strategy](#testing-strategy)

---

## Overview

This document provides detailed specifications for all custom hooks required for the profile page refactoring. Each hook follows the **Single Responsibility Principle** and manages one specific domain of the profile page.

### Design Principles

- ✅ **Single Responsibility** - Each hook manages one feature
- ✅ **Composability** - Hooks can depend on other hooks
- ✅ **Testability** - Pure logic, easy to mock
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Error Handling** - Consistent error patterns
- ✅ **Loading States** - Clear loading indicators

---

## Hook Architecture

```
hooks/profile/
├── index.ts                      # Barrel export
├── useProfileData.ts             # Core profile data (PRIMARY)
├── useProfileEdit.ts             # Edit mode & save
├── useFieldValidation.ts         # Username/phone validation
├── useAvatarUpload.ts            # Avatar management
├── usePinChange.ts               # PIN change flow
├── useFamilyManagement.ts        # Family CRUD operations
├── useJoinRequests.ts            # Join request handling
├── useThemeSelection.ts          # Theme management
└── useResidenceSelector.ts       # Multi-residence support
```

---

## Core Hooks

### 1. useProfileData (PRIMARY HOOK)

**File**: `src/hooks/profile/useProfileData.ts`

**Purpose**: Fetch and manage the user's profile data. This is the central hook that provides profile data to all other hooks.

**Dependencies**:
- `fetchProfile` from `services/profile/api.service`
- `transformProfileData` from `services/profile/transformers`
- `useAuthStore` from `stores/auth-store`
- `useRouter` from `next/navigation`

**State**:
```typescript
const [profile, setProfile] = useState<ProfileData | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [hasMounted, setHasMounted] = useState(false);
```

**Return Type**:
```typescript
interface UseProfileDataReturn {
  profile: ProfileData | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  currentResidence: Residence | null;
  isKepalaKeluarga: boolean;
}
```

**Implementation Outline**:
```typescript
export function useProfileData(): UseProfileDataReturn {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);
  const setThemeId = useAppearanceStore((s) => s.setThemeId);
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await fetchProfile();

    if (!result.success) {
      if (result.error === "UNAUTHORIZED") {
        clearUser();
        router.replace("/auth/login");
        return;
      }
      setError(result.error);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    // Transform API response to UI model
    const transformedProfile = transformProfileData(result.data);
    setProfile(transformedProfile);
    
    // Update global stores
    setThemeId(transformedProfile.themeId);
    setThemeCookie(transformedProfile.themeId);
    setHeaderProfileCookie({
      name: transformedProfile.fullName,
      profilePictureUrl: transformedProfile.profilePictureUrl,
      blokRumah: transformedProfile.currentResidence?.house.blokRumah ?? "Blok —",
    });

    setIsLoading(false);
  }, [clearUser, router, setThemeId]);

  // Load on mount (only if authenticated)
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    loadProfile();
  }, [hasMounted, isAuthenticated, loadProfile, router]);

  const refreshProfile = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  const currentResidence = profile?.currentResidence ?? null;
  const isKepalaKeluarga = currentResidence?.isKepalaKeluarga ?? false;

  return {
    profile,
    isLoading,
    error,
    refreshProfile,
    currentResidence,
    isKepalaKeluarga,
  };
}
```

**Key Features**:
- ✅ Automatic redirect on 401
- ✅ Updates global stores (theme, header profile)
- ✅ Transforms API data to UI model
- ✅ Provides computed properties (currentResidence, isKepalaKeluarga)
- ✅ Exposes refresh function for other hooks

---

### 2. useProfileEdit

**File**: `src/hooks/profile/useProfileEdit.ts`

**Purpose**: Manage profile edit mode, form state, and save operations.

**Dependencies**:
- `updateProfile` from `services/profile/api.service`
- `validateProfileForm` from `services/profile/validation.service`
- `useProfileData` (for refreshProfile)

**State**:
```typescript
const [isEditing, setIsEditing] = useState(false);
const [formData, setFormData] = useState<ProfileEditFormData>({...});
const [isSaving, setIsSaving] = useState(false);
const [saveError, setSaveError] = useState<string | null>(null);
const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
```

**Return Type**:
```typescript
interface UseProfileEditReturn {
  isEditing: boolean;
  formData: ProfileEditFormData;
  isSaving: boolean;
  saveError: string | null;
  validationErrors: Record<string, string>;
  
  startEditing: () => void;
  cancelEditing: () => void;
  updateField: <K extends keyof ProfileEditFormData>(
    field: K,
    value: ProfileEditFormData[K]
  ) => void;
  handleSave: () => Promise<void>;
}
```

**Implementation Outline**:
```typescript
export function useProfileEdit(
  profile: ProfileData | null,
  onSaveSuccess?: () => void
): UseProfileEditReturn {
  const { refreshProfile } = useProfileData();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileEditFormData>(
    initializeFormData(profile)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset form when profile changes
  useEffect(() => {
    if (profile && !isEditing) {
      setFormData(initializeFormData(profile));
    }
  }, [profile, isEditing]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    setSaveError(null);
    setValidationErrors({});
  }, []);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setFormData(initializeFormData(profile));
    setSaveError(null);
    setValidationErrors({});
  }, [profile]);

  const updateField = useCallback(<K extends keyof ProfileEditFormData>(
    field: K,
    value: ProfileEditFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    setValidationErrors((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setValidationErrors({});

    // Validate form
    const validation = validateProfileForm(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsSaving(true);

    // Transform to API payload
    const payload = {
      full_name: formData.fullName.trim(),
      username: formData.username.trim() || null,
      wa_number: formData.waNumber.trim() || null,
      email: formData.email.trim() || null,
      date_of_birth: formData.dateOfBirth || null,
    };

    const result = await updateProfile(payload);

    if (!result.success) {
      setSaveError(result.error);
      setIsSaving(false);
      return;
    }

    // Success - refresh profile and exit edit mode
    await refreshProfile();
    setIsEditing(false);
    setIsSaving(false);
    
    if (onSaveSuccess) {
      onSaveSuccess();
    }
  }, [formData, refreshProfile, onSaveSuccess]);

  return {
    isEditing,
    formData,
    isSaving,
    saveError,
    validationErrors,
    startEditing,
    cancelEditing,
    updateField,
    handleSave,
  };
}
```

**Key Features**:
- ✅ Auto-resets form when profile changes
- ✅ Validates before saving
- ✅ Calls refreshProfile on success
- ✅ Clears errors on field update
- ✅ Optional success callback

---

### 3. useFieldValidation

**File**: `src/hooks/profile/useFieldValidation.ts`

**Purpose**: Handle async validation for username and phone number availability.

**Dependencies**:
- `checkUsernameAvailability` from `services/profile/api.service`
- `checkPhoneAvailability` from `services/profile/api.service`
- `validateUsername`, `validatePhone` from `services/profile/validation.service`

**State**:
```typescript
const [usernameValidation, setUsernameValidation] = useState<FieldValidationState>({...});
const [phoneValidation, setPhoneValidation] = useState<FieldValidationState>({...});
```

**Return Type**:
```typescript
interface UseFieldValidationReturn {
  usernameValidation: FieldValidationState;
  phoneValidation: FieldValidationState;
  
  checkUsername: (username: string, currentUsername: string) => Promise<void>;
  checkPhone: (phone: string, currentPhone: string) => Promise<void>;
  resetValidation: () => void;
}
```

**Implementation Outline**:
```typescript
export function useFieldValidation(): UseFieldValidationReturn {
  const [usernameValidation, setUsernameValidation] = useState<FieldValidationState>({
    status: "idle",
    isLoading: false,
    message: null,
  });
  
  const [phoneValidation, setPhoneValidation] = useState<FieldValidationState>({
    status: "idle",
    isLoading: false,
    message: null,
  });

  // Debounced username check
  const checkUsername = useMemo(
    () =>
      debounce(async (username: string, currentUsername: string) => {
        if (!username.trim()) {
          setUsernameValidation({ status: "idle", isLoading: false, message: null });
          return;
        }

        // Skip if same as current
        if (username.trim() === currentUsername) {
          setUsernameValidation({ status: "idle", isLoading: false, message: null });
          return;
        }

        // Client-side validation first
        const validation = validateUsername(username);
        if (!validation.isValid) {
          setUsernameValidation({
            status: "error",
            isLoading: false,
            message: validation.error,
          });
          return;
        }

        setUsernameValidation({ status: "checking", isLoading: true, message: null });

        const result = await checkUsernameAvailability(username.trim());

        if (!result.success) {
          setUsernameValidation({
            status: "error",
            isLoading: false,
            message: result.error,
          });
          return;
        }

        if (result.data.available) {
          setUsernameValidation({
            status: "available",
            isLoading: false,
            message: PROFILE_MESSAGES.USERNAME_AVAILABLE,
          });
        } else {
          setUsernameValidation({
            status: "taken",
            isLoading: false,
            message: PROFILE_MESSAGES.USERNAME_TAKEN,
          });
        }
      }, DEBOUNCE_TIMES.USERNAME_CHECK),
    []
  );

  // Debounced phone check
  const checkPhone = useMemo(
    () =>
      debounce(async (phone: string, currentPhone: string) => {
        if (!phone.trim()) {
          setPhoneValidation({ status: "idle", isLoading: false, message: null });
          return;
        }

        if (phone.trim() === currentPhone) {
          setPhoneValidation({ status: "idle", isLoading: false, message: null });
          return;
        }

        const validation = validatePhone(phone);
        if (!validation.isValid) {
          setPhoneValidation({
            status: "error",
            isLoading: false,
            message: validation.error,
          });
          return;
        }

        setPhoneValidation({ status: "checking", isLoading: true, message: null });

        const result = await checkPhoneAvailability(phone.trim());

        if (!result.success) {
          setPhoneValidation({
            status: "error",
            isLoading: false,
            message: result.error,
          });
          return;
        }

        if (result.data.available) {
          setPhoneValidation({
            status: "available",
            isLoading: false,
            message: PROFILE_MESSAGES.PHONE_AVAILABLE,
          });
        } else {
          setPhoneValidation({
            status: "taken",
            isLoading: false,
            message: PROFILE_MESSAGES.PHONE_TAKEN,
          });
        }
      }, DEBOUNCE_TIMES.PHONE_CHECK),
    []
  );

  const resetValidation = useCallback(() => {
    setUsernameValidation({ status: "idle", isLoading: false, message: null });
    setPhoneValidation({ status: "idle", isLoading: false, message: null });
  }, []);

  return {
    usernameValidation,
    phoneValidation,
    checkUsername,
    checkPhone,
    resetValidation,
  };
}
```

**Key Features**:
- ✅ Debounced validation (500ms)
- ✅ Client-side validation before API call
- ✅ Skips check if value unchanged
- ✅ Clear status indicators
- ✅ Reset function for cleanup

---

## Feature Hooks

### 4. useAvatarUpload

**File**: `src/hooks/profile/useAvatarUpload.ts`

**Purpose**: Handle avatar image upload with validation and preview.

**Dependencies**:
- `uploadAvatar` from `services/profile/api.service`
- `validateAvatarFile` from `services/profile/validation.service`
- `useProfileData` (for refreshProfile)

**State**:
```typescript
const [isUploading, setIsUploading] = useState(false);
const [uploadError, setUploadError] = useState<string | null>(null);
const [previewUrl, setPreviewUrl] = useState<string | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
```

**Return Type**:
```typescript
interface UseAvatarUploadReturn {
  isUploading: boolean;
  uploadError: string | null;
  previewUrl: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  
  handleFileSelect: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  triggerFileInput: () => void;
  clearPreview: () => void;
}
```

**Implementation**:
```typescript
export function useAvatarUpload(
  onUploadSuccess?: (url: string) => void
): UseAvatarUploadReturn {
  const { refreshProfile } = useProfileData();
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate file
    const validation = validateAvatarFile(file);
    if (!validation.isValid) {
      setUploadError(validation.error);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    const result = await uploadAvatar(file);

    if (!result.success) {
      setUploadError(result.error);
      setIsUploading(false);
      return;
    }

    // Success
    await refreshProfile();
    setIsUploading(false);
    setPreviewUrl(null);
    
    if (onUploadSuccess) {
      onUploadSuccess(result.data.profilePictureUrl);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [refreshProfile, onUploadSuccess]);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewUrl(null);
    setUploadError(null);
  }, []);

  return {
    isUploading,
    uploadError,
    previewUrl,
    fileInputRef,
    handleFileSelect,
    triggerFileInput,
    clearPreview,
  };
}
```

**Key Features**:
- ✅ File validation (size, type)
- ✅ Image preview before upload
- ✅ Auto-refresh profile on success
- ✅ Clears input after upload
- ✅ Optional success callback

---

### 5. usePinChange

**File**: `src/hooks/profile/usePinChange.ts`

**Purpose**: Manage PIN change dialog and validation.

**Dependencies**:
- `changePin` from `services/profile/api.service`
- `validatePin` from `services/profile/validation.service`

**State**:
```typescript
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState<PinChangeFormData>({...});
const [isChanging, setIsChanging] = useState(false);
const [changeError, setChangeError] = useState<string | null>(null);
```

**Return Type**:
```typescript
interface UsePinChangeReturn {
  isOpen: boolean;
  formData: PinChangeFormData;
  isChanging: boolean;
  changeError: string | null;
  
  openDialog: () => void;
  closeDialog: () => void;
  updatePin: (field: keyof PinChangeFormData, value: string) => void;
  handleChange: () => Promise<void>;
}
```

**Implementation**:
```typescript
export function usePinChange(
  onChangeSuccess?: () => void
): UsePinChangeReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<PinChangeFormData>({
    currentPin: "",
    newPin: "",
    confirmNewPin: "",
  });
  const [isChanging, setIsChanging] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  const openDialog = useCallback(() => {
    setIsOpen(true);
    setFormData({ currentPin: "", newPin: "", confirmNewPin: "" });
    setChangeError(null);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setFormData({ currentPin: "", newPin: "", confirmNewPin: "" });
    setChangeError(null);
  }, []);

  const updatePin = useCallback((
    field: keyof PinChangeFormData,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setChangeError(null);
  }, []);

  const handleChange = useCallback(async () => {
    setChangeError(null);

    // Validate current PIN
    const currentValidation = validatePin(formData.currentPin);
    if (!currentValidation.isValid) {
      setChangeError(currentValidation.error);
      return;
    }

    // Validate new PIN
    const newValidation = validatePin(formData.newPin);
    if (!newValidation.isValid) {
      setChangeError(newValidation.error);
      return;
    }

    // Check if PINs match
    if (formData.newPin !== formData.confirmNewPin) {
      setChangeError(PROFILE_MESSAGES.PIN_MISMATCH);
      return;
    }

    // Check if new PIN is different
    if (formData.currentPin === formData.newPin) {
      setChangeError("PIN baru harus berbeda dengan PIN lama");
      return;
    }

    setIsChanging(true);

    const result = await changePin({
      currentPin: formData.currentPin,
      newPin: formData.newPin,
    });

    if (!result.success) {
      setChangeError(result.error);
      setIsChanging(false);
      return;
    }

    // Success
    setIsChanging(false);
    closeDialog();
    
    if (onChangeSuccess) {
      onChangeSuccess();
    }
  }, [formData, closeDialog, onChangeSuccess]);

  return {
    isOpen,
    formData,
    isChanging,
    changeError,
    openDialog,
    closeDialog,
    updatePin,
    handleChange,
  };
}
```

**Key Features**:
- ✅ PIN format validation
- ✅ Confirmation matching
- ✅ Auto-reset on close
- ✅ Clear error messages
- ✅ Success callback

---

### 6. useFamilyManagement

**File**: `src/hooks/profile/useFamilyManagement.ts`

**Purpose**: Manage family members (add, remove, transfer ownership).

**Dependencies**:
- `addFamilyMember`, `removeFamilyMember`, `transferOwnership` from `services/profile/api.service`
- `validateAddMemberForm` from `services/profile/validation.service`
- `useProfileData` (for refreshProfile)

**State**:
```typescript
const [isManaging, setIsManaging] = useState(false);
const [showAddForm, setShowAddForm] = useState(false);
const [addFormData, setAddFormData] = useState<AddFamilyMemberFormData>({...});
const [isAdding, setIsAdding] = useState(false);
const [addError, setAddError] = useState<string | null>(null);
const [transferLoadingId, setTransferLoadingId] = useState<string | null>(null);
const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);
const [actionError, setActionError] = useState<string | null>(null);
```

**Return Type**:
```typescript
interface UseFamilyManagementReturn {
  isManaging: boolean;
  showAddForm: boolean;
  addFormData: AddFamilyMemberFormData;
  isAdding: boolean;
  addError: string | null;
  transferLoadingId: string | null;
  removeLoadingId: string | null;
  actionError: string | null;
  
  startManaging: () => void;
  stopManaging: () => void;
  showAddMemberForm: () => void;
  hideAddMemberForm: () => void;
  updateAddFormField: <K extends keyof AddFamilyMemberFormData>(
    field: K,
    value: AddFamilyMemberFormData[K]
  ) => void;
  handleAddMember: () => Promise<void>;
  handleTransferOwnership: (member: FamilyMember) => Promise<void>;
  handleRemoveMember: (member: FamilyMember) => Promise<void>;
}
```

**Implementation Outline**:
```typescript
export function useFamilyManagement(
  currentHouse: House | null,
  onActionSuccess?: () => void
): UseFamilyManagementReturn {
  const { refreshProfile } = useProfileData();
  
  // State declarations...

  const handleAddMember = useCallback(async () => {
    setAddError(null);

    const validation = validateAddMemberForm(addFormData);
    if (!validation.isValid) {
      setAddError(validation.error);
      return;
    }

    if (!currentHouse?.id) {
      setAddError("Tidak ada rumah aktif");
      return;
    }

    setIsAdding(true);

    const result = await addFamilyMember(currentHouse.id, {
      fullName: addFormData.fullName.trim(),
      username: addFormData.username.trim() || null,
      waNumber: addFormData.waNumber.trim() || null,
    });

    if (!result.success) {
      setAddError(result.error);
      setIsAdding(false);
      return;
    }

    // Success
    await refreshProfile();
    setIsAdding(false);
    setShowAddForm(false);
    setAddFormData({ fullName: "", username: "", waNumber: "" });
    
    if (onActionSuccess) {
      onActionSuccess();
    }
  }, [addFormData, currentHouse, refreshProfile, onActionSuccess]);

  const handleTransferOwnership = useCallback(async (member: FamilyMember) => {
    if (!currentHouse?.id) return;

    setActionError(null);
    setTransferLoadingId(member.userId);

    const result = await transferOwnership(currentHouse.id, member.userId);

    if (!result.success) {
      setActionError(result.error);
      setTransferLoadingId(null);
      return;
    }

    await refreshProfile();
    setTransferLoadingId(null);
    
    if (onActionSuccess) {
      onActionSuccess();
    }
  }, [currentHouse, refreshProfile, onActionSuccess]);

  const handleRemoveMember = useCallback(async (member: FamilyMember) => {
    if (!currentHouse?.id) return;

    setActionError(null);
    setRemoveLoadingId(member.userId);

    const result = await removeFamilyMember(currentHouse.id, member.userId);

    if (!result.success) {
      setActionError(result.error);
      setRemoveLoadingId(null);
      return;
    }

    await refreshProfile();
    setRemoveLoadingId(null);
    
    if (onActionSuccess) {
      onActionSuccess();
    }
  }, [currentHouse, refreshProfile, onActionSuccess]);

  // ... other methods

  return {
    isManaging,
    showAddForm,
    addFormData,
    isAdding,
    addError,
    transferLoadingId,
    removeLoadingId,
    actionError,
    startManaging,
    stopManaging,
    showAddMemberForm,
    hideAddMemberForm,
    updateAddFormField,
    handleAddMember,
    handleTransferOwnership,
    handleRemoveMember,
  };
}
```

**Key Features**:
- ✅ Add member validation
- ✅ Individual loading states per action
- ✅ Auto-refresh on success
- ✅ Error handling per operation
- ✅ Form reset after add

---

### 7. useJoinRequests

**File**: `src/hooks/profile/useJoinRequests.ts`

**Purpose**: Handle pending house join requests (accept/reject).

**Dependencies**:
- `respondToJoinRequest` from `services/profile/api.service`
- `useProfileData` (for refreshProfile)

**State**:
```typescript
const [respondingId, setRespondingId] = useState<string | null>(null);
const [respondError, setRespondError] = useState<string | null>(null);
```

**Return Type**:
```typescript
interface UseJoinRequestsReturn {
  respondingId: string | null;
  respondError: string | null;
  
  handleAccept: (requestId: string) => Promise<void>;
  handleReject: (requestId: string) => Promise<void>;
}
```

**Implementation**:
```typescript
export function useJoinRequests(
  onRespondSuccess?: () => void
): UseJoinRequestsReturn {
  const { refreshProfile } = useProfileData();
  
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondError, setRespondError] = useState<string | null>(null);

  const respondToRequest = useCallback(async (
    requestId: string,
    action: "accept" | "reject"
  ) => {
    setRespondError(null);
    setRespondingId(requestId);

    const result = await respondToJoinRequest(requestId, action);

    if (!result.success) {
      setRespondError(result.error);
      setRespondingId(null);
      return;
    }

    await refreshProfile();
    setRespondingId(null);
    
    if (onRespondSuccess) {
      onRespondSuccess();
    }
  }, [refreshProfile, onRespondSuccess]);

  const handleAccept = useCallback(async (requestId: string) => {
    await respondToRequest(requestId, "accept");
  }, [respondToRequest]);

  const handleReject = useCallback(async (requestId: string) => {
    await respondToRequest(requestId, "reject");
  }, [respondToRequest]);

  return {
    respondingId,
    respondError,
    handleAccept,
    handleReject,
  };
}
```

**Key Features**:
- ✅ Loading state per request
- ✅ Accept/reject actions
- ✅ Auto-refresh on success
- ✅ Success callback

---

### 8. useThemeSelection

**File**: `src/hooks/profile/useThemeSelection.ts`

**Purpose**: Manage theme selection sheet and theme changes.

**Dependencies**:
- `updateTheme` from `services/profile/api.service`
- `useAppearanceStore` from `stores/appearance-store`

**State**: