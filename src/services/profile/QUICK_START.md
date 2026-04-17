# Quick Start Guide - Profile API Service

Get up and running with the Profile API Service in 5 minutes.

## Installation

```typescript
import {
  fetchProfile,
  updateProfile,
  checkUsernameAvailability,
  uploadAvatar,
  changePin,
  logout,
} from '@/services/profile';
```

## Basic Usage

### 1. Load Profile Data

```typescript
const [profile, setProfile] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadProfile = async () => {
    const result = await fetchProfile();
    
    if (result.success) {
      setProfile(result.data);
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };
  
  loadProfile();
}, []);
```

### 2. Update Profile

```typescript
const handleSave = async () => {
  const result = await updateProfile({
    full_name: name,
    username: username || null,
    email: email || null,
  });

  if (result.success) {
    setProfile(prev => ({ ...prev, ...result.data.profile }));
    toast.success('Profile updated!');
  } else {
    toast.error(result.error);
  }
};
```

### 3. Check Username Availability

```typescript
const [status, setStatus] = useState('idle');

const checkUsername = async (value: string) => {
  if (!value.trim()) {
    setStatus('idle');
    return;
  }

  const result = await checkUsernameAvailability(value);
  
  if (result.success) {
    setStatus(result.data.available ? 'available' : 'taken');
  } else {
    setStatus('error');
  }
};

// With debouncing
const debouncedCheck = useMemo(
  () => debounce(checkUsername, 500),
  []
);
```

### 4. Upload Avatar

```typescript
const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setUploading(true);
  
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
  
  setUploading(false);
};
```

### 5. Change PIN

```typescript
const handleChangePIN = async (e: FormEvent) => {
  e.preventDefault();

  const result = await changePin(currentPin, newPin, confirmPin);

  if (result.success) {
    toast.success('PIN changed successfully');
    resetForm();
  } else {
    setError(result.error);
  }
};
```

### 6. Logout

```typescript
const handleLogout = async () => {
  await logout();
  clearUser();
  router.push('/auth/login');
};
```

## Common Patterns

### Pattern 1: Loading State

```typescript
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  const result = await someApiFunction();
  setLoading(false);

  if (result.success) {
    // Handle success
  } else {
    // Handle error
  }
};
```

### Pattern 2: Form Submission

```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setError(null);
  setSaving(true);

  const result = await updateProfile(formData);

  if (result.success) {
    onSuccess(result.data);
  } else {
    setError(result.error);
  }

  setSaving(false);
};
```

### Pattern 3: Optimistic Update

```typescript
const handleUpdate = async (data) => {
  // Optimistic update
  setProfile(prev => ({ ...prev, ...data }));

  const result = await updateProfile(data);

  if (!result.success) {
    // Revert on error
    setProfile(originalProfile);
    toast.error(result.error);
  }
};
```

### Pattern 4: Confirmation Dialog

```typescript
const handleDelete = async (memberId: string) => {
  const confirmed = await showConfirmDialog({
    title: 'Remove Member?',
    message: 'This action cannot be undone.',
  });

  if (!confirmed) return;

  const result = await removeFamilyMember(houseId, memberId);

  if (result.success) {
    await refreshProfile();
  }
};
```

## Quick Reference

| Function | Purpose | Returns |
|----------|---------|---------|
| `fetchProfile()` | Get user profile | `ApiResult<ProfileData>` |
| `updateProfile(data)` | Update profile | `ApiResult<{profile}>` |
| `checkUsernameAvailability(username)` | Check username | `ApiResult<{available}>` |
| `checkWaNumberAvailability(waNumber)` | Check WA number | `ApiResult<{available}>` |
| `uploadAvatar(file)` | Upload avatar | `ApiResult<{profilePictureUrl}>` |
| `changePin(current, new, confirm)` | Change PIN | `ApiResult<SuccessResponse>` |
| `logout()` | Logout user | `ApiResult<void>` |
| `updateTheme(themeId)` | Update theme | `ApiResult<{profile}>` |
| `addFamilyMember(data)` | Add member | `ApiResult<SuccessResponse>` |
| `transferOwnership(house, user)` | Transfer ownership | `ApiResult<SuccessResponse>` |
| `removeFamilyMember(house, user)` | Remove member | `ApiResult<SuccessResponse>` |
| `respondToJoinRequest(id, action)` | Approve/reject | `ApiResult<SuccessResponse>` |

## Error Handling

### Basic Error Handling

```typescript
const result = await fetchProfile();

if (!result.success) {
  console.error(result.error);
  toast.error(result.error);
  return;
}

// Use result.data safely
```

### With Try-Catch (Optional)

```typescript
try {
  const result = await fetchProfile();
  
  if (result.success) {
    setProfile(result.data);
  } else {
    setError(result.error);
  }
} catch (err) {
  // This catches unexpected errors
  setError('Unexpected error occurred');
}
```

## TypeScript Tips

### Type the Result

```typescript
import type { ApiResult, ProfileData } from '@/services/profile';

const result: ApiResult<ProfileData> = await fetchProfile();
```

### Type Guards

```typescript
if (result.success) {
  // TypeScript knows result.data exists
  const name: string = result.data.fullName;
} else {
  // TypeScript knows result.error exists
  const error: string = result.error;
}
```

## Best Practices

### ✅ DO

```typescript
// Always check success before accessing data
if (result.success) {
  console.log(result.data);
}

// Provide user feedback
if (result.success) {
  toast.success('Updated!');
} else {
  toast.error(result.error);
}

// Handle loading states
setLoading(true);
await someFunction();
setLoading(false);
```

### ❌ DON'T

```typescript
// Don't access data without checking
const data = result.data; // TypeScript error!

// Don't ignore errors
await updateProfile(data); // Missing error handling

// Don't forget loading states
await someFunction(); // User sees no feedback
```

## Complete Example

```typescript
import { useState, useEffect } from 'react';
import { 
  fetchProfile, 
  updateProfile,
  type ApiResult,
  type ProfileData 
} from '@/services/profile';
import { toast } from 'sonner';

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      const result = await fetchProfile();
      
      if (result.success) {
        setProfile(result.data);
        setName(result.data.fullName);
      } else {
        toast.error(result.error);
      }
      
      setLoading(false);
    };

    loadProfile();
  }, []);

  // Update profile
  const handleSave = async () => {
    setSaving(true);
    
    const result = await updateProfile({ full_name: name });
    
    if (result.success) {
      setProfile(prev => prev ? { ...prev, ...result.data.profile } : null);
      toast.success('Profile updated!');
    } else {
      toast.error(result.error);
    }
    
    setSaving(false);
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Failed to load profile</div>;

  return (
    <div>
      <h1>{profile.fullName}</h1>
      <input 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
      />
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}
```

## Next Steps

1. Read the [full API documentation](./README.md)
2. Check [migration examples](./MIGRATION_EXAMPLE.md)
3. Review [implementation details](./IMPLEMENTATION.md)
4. Explore the [source code](./api.service.ts)

## Need Help?

- Check the [README.md](./README.md) for detailed API reference
- See [MIGRATION_EXAMPLE.md](./MIGRATION_EXAMPLE.md) for before/after comparisons
- Review the types in `@/types/profile`
- Look at configuration in `@/config/profile`

---

**Happy coding! 🚀**