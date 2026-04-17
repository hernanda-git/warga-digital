# Profile API Service

Centralized API service layer for all profile-related operations in the Warga Digital application.

## Overview

This service module provides a clean, type-safe interface for interacting with profile-related endpoints. It follows SOLID principles and implements the Repository pattern to separate API concerns from UI logic.

### Key Features

- ✅ **Type Safety**: Full TypeScript support with detailed type definitions
- ✅ **Error Handling**: Consistent error handling with `ApiResult<T>` pattern
- ✅ **Single Responsibility**: Each function handles one specific API operation
- ✅ **Testability**: Pure functions that are easy to mock and test
- ✅ **Centralized Configuration**: Uses configuration from `@/config/profile`
- ✅ **Authentication**: Automatic 401 handling via `apiFetch` wrapper

## Installation

```typescript
import {
  fetchProfile,
  updateProfile,
  checkUsernameAvailability,
  // ... other functions
} from '@/services/profile';
```

## API Reference

### Profile Management

#### `fetchProfile()`

Fetches the complete user profile including personal information, residence details, family members, badges, and pending join requests.

**Returns**: `Promise<ApiResult<ProfileData>>`

**Example**:
```typescript
const result = await fetchProfile();

if (result.success) {
  console.log('User:', result.data.fullName);
  console.log('House:', result.data.house?.name);
  console.log('Family Members:', result.data.house?.members);
} else {
  console.error('Error:', result.error);
}
```

---

#### `updateProfile(profileData)`

Updates user profile information. Supports partial updates.

**Parameters**:
- `profileData`: Object containing fields to update
  - `full_name?`: string
  - `username?`: string | null
  - `wa_number?`: string | null
  - `email?`: string | null
  - `date_of_birth?`: string | null (ISO 8601 format)

**Returns**: `Promise<ApiResult<{ profile: Partial<ProfileData> }>>`

**Example**:
```typescript
const result = await updateProfile({
  full_name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
});

if (result.success) {
  console.log('Profile updated:', result.data.profile);
  // Update local state
  setProfile(prev => ({ ...prev, ...result.data.profile }));
}
```

---

### Validation Services

#### `checkUsernameAvailability(username)`

Checks if a username is available for registration.

**Parameters**:
- `username`: string - Username to check

**Returns**: `Promise<ApiResult<AvailabilityCheckResponse>>`

**Example**:
```typescript
const result = await checkUsernameAvailability('johndoe');

if (result.success) {
  if (result.data.available) {
    console.log('✓ Username is available');
  } else {
    console.log('✗ Username is already taken');
  }
}
```

**Debouncing Recommendation**:
```typescript
const debouncedCheck = useMemo(
  () => debounce(checkUsernameAvailability, 500),
  []
);

// In onChange handler
debouncedCheck(newUsername);
```

---

#### `checkWaNumberAvailability(waNumber)`

Checks if a WhatsApp number is available for registration.

**Parameters**:
- `waNumber`: string - WhatsApp number to check

**Returns**: `Promise<ApiResult<AvailabilityCheckResponse>>`

**Example**:
```typescript
const result = await checkWaNumberAvailability('081234567890');

if (result.success && result.data.available) {
  setValidationStatus('available');
} else if (result.success && !result.data.available) {
  setValidationStatus('taken');
}
```

---

### Avatar Management

#### `uploadAvatar(file)`

Uploads a new profile picture.

**Parameters**:
- `file`: File - Image file (JPEG, PNG, WebP, HEIC)

**Returns**: `Promise<ApiResult<{ profilePictureUrl: string | null }>>`

**Constraints**:
- Maximum file size: 10MB
- Allowed formats: JPEG, PNG, WebP, HEIC

**Example**:
```typescript
const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setLoading(true);
  const result = await uploadAvatar(file);
  
  if (result.success) {
    setProfile(prev => ({
      ...prev,
      profilePictureUrl: result.data.profilePictureUrl
    }));
    toast.success('Avatar updated!');
  } else {
    toast.error(result.error);
  }
  setLoading(false);
};
```

---

### Authentication Services

#### `changePin(currentPin, newPin, confirmPin)`

Changes the user's 4-digit PIN.

**Parameters**:
- `currentPin`: string - Current PIN for verification
- `newPin`: string - New 4-digit PIN
- `confirmPin`: string - Confirmation of new PIN

**Returns**: `Promise<ApiResult<SuccessResponse>>`

**Validation**:
- All PINs must be exactly 4 digits
- `newPin` must match `confirmPin`

**Example**:
```typescript
const handleChangePinSubmit = async (e: FormEvent) => {
  e.preventDefault();

  const result = await changePin(currentPin, newPin, confirmNewPin);

  if (result.success) {
    toast.success('PIN changed successfully');
    resetForm();
  } else {
    setError(result.error);
  }
};
```

---

#### `logout()`

Logs out the current user and clears session.

**Returns**: `Promise<ApiResult<void>>`

**Example**:
```typescript
const handleLogout = async () => {
  const result = await logout();
  
  // Always succeeds to ensure user can log out
  clearUser();
  router.replace('/auth/login');
};
```

---

### Appearance Management

#### `updateTheme(themeId)`

Updates the user's selected color theme.

**Parameters**:
- `themeId`: string - Theme identifier (e.g., 'green', 'blue', 'purple')

**Returns**: `Promise<ApiResult<{ profile: Partial<ProfileData> }>>`

**Example**:
```typescript
const handleThemeChange = async (id: string) => {
  const result = await updateTheme(id);

  if (result.success) {
    setThemeId(id);
    setThemeCookie(id);
    toast.success('Theme updated');
  }
};
```

---

### Family Management Services

#### `addFamilyMember(memberData)`

Adds a new family member to the household.

**Parameters**:
- `memberData`: Object
  - `fullName`: string (required)
  - `waNumber`: string (required)
  - `username?`: string (optional)
  - `houseId?`: string (optional)

**Returns**: `Promise<ApiResult<SuccessResponse>>`

**Example**:
```typescript
const result = await addFamilyMember({
  fullName: 'Jane Doe',
  waNumber: '081234567890',
  username: 'janedoe',
  houseId: currentHouseId,
});

if (result.success) {
  await refreshProfile();
  toast.success('Family member added');
}
```

---

#### `transferOwnership(houseId, newOwnerUserId)`

Transfers household ownership to another family member.

**Parameters**:
- `houseId`: string - House ID
- `newOwnerUserId`: string - User ID of the new owner

**Returns**: `Promise<ApiResult<SuccessResponse>>`

**Example**:
```typescript
const handleTransfer = async () => {
  const result = await transferOwnership(houseId, selectedUserId);

  if (result.success) {
    await refreshProfile();
    toast.success('Ownership transferred');
  } else {
    toast.error(result.error);
  }
};
```

---

#### `removeFamilyMember(houseId, memberUserId)`

Removes a family member from the household.

**Parameters**:
- `houseId`: string - House ID
- `memberUserId`: string - User ID of member to remove

**Returns**: `Promise<ApiResult<SuccessResponse>>`

**Example**:
```typescript
const handleRemove = async () => {
  const confirmed = await showConfirmDialog({
    title: 'Remove Member?',
    message: 'This member will be removed from the household.',
  });

  if (!confirmed) return;

  const result = await removeFamilyMember(houseId, memberId);

  if (result.success) {
    await refreshProfile();
  }
};
```

---

### Join Request Services

#### `respondToJoinRequest(requestId, action)`

Approves or rejects a household join request.

**Parameters**:
- `requestId`: string - Join request ID
- `action`: 'approve' | 'reject'

**Returns**: `Promise<ApiResult<SuccessResponse>>`

**Example**:
```typescript
const handleApprove = async (requestId: string) => {
  const result = await respondToJoinRequest(requestId, 'approve');

  if (result.success) {
    await refreshProfile();
    toast.success('Request approved');
  }
};

const handleReject = async (requestId: string) => {
  const result = await respondToJoinRequest(requestId, 'reject');

  if (result.success) {
    await refreshProfile();
    toast.info('Request rejected');
  }
};
```

---

### Batch Operations

#### `fetchAllProfileData()`

Fetches all profile-related data in parallel. Useful for initial page load.

**Returns**: `Promise<{ profile: ApiResult<ProfileData> }>`

**Example**:
```typescript
useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    const { profile } = await fetchAllProfileData();

    if (profile.success) {
      setProfile(profile.data);
    } else {
      setError(profile.error);
    }
    setLoading(false);
  };

  loadData();
}, []);
```

---

## Error Handling

All functions return an `ApiResult<T>` type:

```typescript
type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### Best Practices

**✅ Always check success status**:
```typescript
const result = await fetchProfile();

if (result.success) {
  // Safe to access result.data
  console.log(result.data.fullName);
} else {
  // Handle error
  console.error(result.error);
}
```

**✅ Provide user feedback**:
```typescript
const result = await updateProfile(data);

if (result.success) {
  toast.success('Profile updated');
} else {
  toast.error(result.error);
}
```

**✅ Handle loading states**:
```typescript
const [loading, setLoading] = useState(false);

const handleUpdate = async () => {
  setLoading(true);
  const result = await updateProfile(data);
  setLoading(false);

  // Handle result...
};
```

---

## Authentication

All API calls automatically handle 401 Unauthorized responses via the `apiFetch` wrapper. When a 401 is detected:

1. An `auth:unauthorized` event is dispatched
2. `AuthInterceptor` catches the event
3. User is redirected to login page
4. Session state is cleared

You don't need to manually handle 401s in most cases.

---

## Type Safety

All functions are fully typed with TypeScript:

```typescript
import type { ProfileData, ApiResult } from '@/services/profile';

const handleLoad = async () => {
  const result: ApiResult<ProfileData> = await fetchProfile();
  
  if (result.success) {
    // TypeScript knows result.data is ProfileData
    const name: string = result.data.fullName;
  }
};
```

---

## Testing

### Unit Testing

```typescript
import { fetchProfile } from '@/services/profile';
import { apiFetch } from '@/lib/api-client';

jest.mock('@/lib/api-client');

describe('fetchProfile', () => {
  it('should return profile data on success', async () => {
    const mockData = {
      id: '123',
      fullName: 'John Doe',
      // ... other fields
    };

    (apiFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await fetchProfile();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockData);
    }
  });

  it('should return error on failure', async () => {
    (apiFetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'Server error' }),
    });

    const result = await fetchProfile();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});
```

### Integration Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '@/app/profil/page';
import * as profileService from '@/services/profile';

jest.mock('@/services/profile');

describe('ProfilePage Integration', () => {
  it('should load and display profile data', async () => {
    jest.spyOn(profileService, 'fetchProfile').mockResolvedValue({
      success: true,
      data: {
        fullName: 'John Doe',
        // ... other fields
      },
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
```

---

## Migration Guide

### Before (Direct API Calls)

```typescript
const handleSave = async () => {
  try {
    const res = await apiFetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      setError(error.message);
      return;
    }

    const result = await res.json();
    setProfile(result);
  } catch (err) {
    setError('Failed to update profile');
  }
};
```

### After (Using Service Layer)

```typescript
const handleSave = async () => {
  const result = await updateProfile(data);

  if (result.success) {
    setProfile(prev => ({ ...prev, ...result.data.profile }));
  } else {
    setError(result.error);
  }
};
```

---

## Related Documentation

- [Profile Types](../../types/profile/index.ts)
- [Profile Configuration](../../config/profile.ts)
- [API Client](../../lib/api-client.ts)
- [Profile Page](../../app/profil/page.tsx)

---

## Contributing

When adding new API functions:

1. Add the endpoint to `@/config/profile`
2. Define request/response types in `@/types/profile`
3. Implement the function in `api.service.ts`
4. Export from `index.ts`
5. Add JSDoc comments with examples
6. Write unit tests
7. Update this README

---

## License

Part of the Warga Digital project.