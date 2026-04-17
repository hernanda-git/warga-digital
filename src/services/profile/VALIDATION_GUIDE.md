# Profile Validation Service Guide

Complete guide for using the profile validation service in the Warga Digital application.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [API Reference](#api-reference)
  - [Individual Field Validators](#individual-field-validators)
  - [Composite Validators](#composite-validators)
  - [Optional Field Validators](#optional-field-validators)
- [Error Messages](#error-messages)
- [Usage Examples](#usage-examples)
- [Integration Patterns](#integration-patterns)
- [Testing](#testing)
- [Best Practices](#best-practices)

---

## Overview

The validation service provides pure, reusable validation functions for all profile-related forms. Each validator returns a consistent result format:

```typescript
{ valid: true } | { valid: false; error: string }
```

### Key Features

✅ **Pure Functions** - No side effects, easy to test  
✅ **Consistent API** - All validators return the same format  
✅ **Type Safe** - Full TypeScript support  
✅ **Centralized Rules** - Uses `VALIDATION_RULES` from config  
✅ **i18n Ready** - All error messages in Indonesian  
✅ **Composable** - Build complex validations from simple ones

---

## Installation

```typescript
import {
  validateFullName,
  validateUsername,
  validateWaNumber,
  validateEmail,
  validateDateOfBirth,
  validatePin,
  validatePinChange,
  validateProfileUpdate,
  validateAddFamilyMember,
  PROFILE_ERROR_MESSAGES,
} from '@/services/profile';
```

---

## API Reference

### Individual Field Validators

#### `validateFullName(name: string)`

Validates a full name field.

**Rules:**
- Minimum 2 characters
- Maximum 100 characters
- Cannot be empty or whitespace only

**Example:**
```typescript
validateFullName('John Doe')        // { valid: true }
validateFullName('J')                // { valid: false, error: 'Nama lengkap minimal 2 karakter' }
validateFullName('')                 // { valid: false, error: 'Nama lengkap wajib diisi' }
validateFullName('   ')              // { valid: false, error: 'Nama lengkap wajib diisi' }
```

---

#### `validateUsername(username: string)`

Validates a username field.

**Rules:**
- 3-30 characters
- Only alphanumeric, underscore (_), and dash (-) allowed
- Cannot be empty

**Example:**
```typescript
validateUsername('john_doe')         // { valid: true }
validateUsername('user-123')         // { valid: true }
validateUsername('ab')               // { valid: false, error: 'Username minimal 3 karakter' }
validateUsername('john@doe')         // { valid: false, error: 'Username hanya boleh...' }
validateUsername('a_very_long_username_that_exceeds_limit')
                                     // { valid: false, error: 'Username maksimal 30 karakter' }
```

---

#### `validateWaNumber(waNumber: string)`

Validates a WhatsApp number.

**Rules:**
- 10-15 digits
- Only numeric characters
- Cannot be empty

**Example:**
```typescript
validateWaNumber('081234567890')     // { valid: true }
validateWaNumber('628123456789')     // { valid: true }
validateWaNumber('123')              // { valid: false, error: 'Nomor WhatsApp minimal 10 digit' }
validateWaNumber('08123abc')         // { valid: false, error: 'Nomor WhatsApp hanya boleh...' }
```

---

#### `validateEmail(email: string)`

Validates an email address.

**Rules:**
- Must match email pattern (user@domain.tld)
- Cannot be empty

**Example:**
```typescript
validateEmail('user@example.com')    // { valid: true }
validateEmail('test.user@mail.co.id') // { valid: true }
validateEmail('invalid-email')       // { valid: false, error: 'Format email tidak valid' }
validateEmail('@example.com')        // { valid: false, error: 'Format email tidak valid' }
```

---

#### `validateDateOfBirth(date: string)`

Validates a date of birth.

**Rules:**
- Must be a valid date (YYYY-MM-DD format)
- Cannot be in the future
- Cannot be empty

**Example:**
```typescript
validateDateOfBirth('1990-01-01')    // { valid: true }
validateDateOfBirth('2000-12-31')    // { valid: true }
validateDateOfBirth('invalid')       // { valid: false, error: 'Format tanggal lahir tidak valid' }
validateDateOfBirth('2099-01-01')    // { valid: false, error: 'Tanggal lahir tidak boleh...' }
```

---

#### `validatePin(pin: string)`

Validates a PIN.

**Rules:**
- Exactly 4 digits
- Only numeric characters
- Cannot be empty

**Example:**
```typescript
validatePin('1234')                  // { valid: true }
validatePin('0000')                  // { valid: true }
validatePin('123')                   // { valid: false, error: 'PIN harus tepat 4 digit' }
validatePin('abcd')                  // { valid: false, error: 'PIN hanya boleh mengandung angka' }
```

---

### Composite Validators

#### `validatePinChange(currentPin: string, newPin: string, confirmNewPin: string)`

Validates a PIN change operation.

**Rules:**
- All PINs must be valid (4 digits)
- New PIN must match confirmation
- New PIN must be different from current PIN

**Example:**
```typescript
validatePinChange('1234', '5678', '5678')
// { valid: true }

validatePinChange('1234', '5678', '9999')
// { valid: false, error: 'PIN baru dan konfirmasi PIN tidak sama' }

validatePinChange('1234', '1234', '1234')
// { valid: false, error: 'PIN baru tidak boleh sama dengan PIN saat ini' }

validatePinChange('', '5678', '5678')
// { valid: false, error: 'PIN saat ini wajib diisi' }
```

---

#### `validateProfileUpdate(data: UpdateProfileRequest)`

Validates a profile update request.

**Rules:**
- Full name must be valid if provided
- At least one identifier (username OR waNumber) must be provided
- Username must be valid if provided
- WhatsApp number must be valid if provided
- Email must be valid if provided and not empty
- Date of birth must be valid if provided and not empty

**Example:**
```typescript
// Valid: has username
validateProfileUpdate({
  fullName: 'John Doe',
  username: 'john_doe',
  waNumber: '',
})
// { valid: true }

// Valid: has waNumber
validateProfileUpdate({
  fullName: 'John Doe',
  username: '',
  waNumber: '081234567890',
})
// { valid: true }

// Invalid: no identifier
validateProfileUpdate({
  fullName: 'John Doe',
  username: '',
  waNumber: '',
})
// { valid: false, error: 'Username atau nomor WhatsApp wajib diisi...' }

// Valid: optional fields
validateProfileUpdate({
  fullName: 'John Doe',
  username: 'john_doe',
  email: 'john@example.com',
  dateOfBirth: '1990-01-01',
})
// { valid: true }

// Invalid: bad email
validateProfileUpdate({
  fullName: 'John Doe',
  username: 'john_doe',
  email: 'invalid-email',
})
// { valid: false, error: 'Format email tidak valid' }
```

---

#### `validateAddFamilyMember(data: AddFamilyMemberRequest)`

Validates an add family member request.

**Rules:**
- Full name is required and must be valid
- At least one identifier (username OR waNumber) must be provided
- Username must be valid if provided
- WhatsApp number must be valid if provided

**Example:**
```typescript
// Valid: has username
validateAddFamilyMember({
  fullName: 'Jane Doe',
  username: 'jane_doe',
  relationship: 'FAMILY',
})
// { valid: true }

// Valid: has waNumber
validateAddFamilyMember({
  fullName: 'Jane Doe',
  waNumber: '081234567890',
})
// { valid: true }

// Invalid: name too short
validateAddFamilyMember({
  fullName: 'J',
  username: 'jane_doe',
})
// { valid: false, error: 'Nama lengkap minimal 2 karakter' }

// Invalid: no identifier
validateAddFamilyMember({
  fullName: 'Jane Doe',
})
// { valid: false, error: 'Username atau nomor WhatsApp anggota baru wajib diisi...' }
```

---

### Optional Field Validators

These validators allow empty values but validate if a value is provided.

#### `validateOptionalFullName(name: string)`
#### `validateOptionalUsername(username: string)`
#### `validateOptionalWaNumber(waNumber: string)`
#### `validateOptionalEmail(email: string)`
#### `validateOptionalDateOfBirth(date: string)`

**Example:**
```typescript
validateOptionalEmail('')                    // { valid: true }
validateOptionalEmail('user@example.com')    // { valid: true }
validateOptionalEmail('invalid')             // { valid: false, error: '...' }

validateOptionalUsername('')                 // { valid: true }
validateOptionalUsername('john_doe')         // { valid: true }
validateOptionalUsername('ab')               // { valid: false, error: '...' }
```

---

## Error Messages

All error messages are available in `PROFILE_ERROR_MESSAGES`:

```typescript
import { PROFILE_ERROR_MESSAGES } from '@/services/profile';

console.log(PROFILE_ERROR_MESSAGES.FULL_NAME_REQUIRED);
// "Nama lengkap wajib diisi"

console.log(PROFILE_ERROR_MESSAGES.USERNAME_INVALID_FORMAT);
// "Username hanya boleh mengandung huruf, angka, underscore (_), dan dash (-)"
```

### Full Error Message List

```typescript
// Full Name
FULL_NAME_REQUIRED: 'Nama lengkap wajib diisi'
FULL_NAME_TOO_SHORT: 'Nama lengkap minimal 2 karakter'
FULL_NAME_TOO_LONG: 'Nama lengkap maksimal 100 karakter'

// Username
USERNAME_REQUIRED: 'Username wajib diisi'
USERNAME_TOO_SHORT: 'Username minimal 3 karakter'
USERNAME_TOO_LONG: 'Username maksimal 30 karakter'
USERNAME_INVALID_FORMAT: 'Username hanya boleh mengandung huruf, angka, underscore (_), dan dash (-)'

// WhatsApp Number
WA_NUMBER_REQUIRED: 'Nomor WhatsApp wajib diisi'
WA_NUMBER_TOO_SHORT: 'Nomor WhatsApp minimal 10 digit'
WA_NUMBER_TOO_LONG: 'Nomor WhatsApp maksimal 15 digit'
WA_NUMBER_INVALID_FORMAT: 'Nomor WhatsApp hanya boleh mengandung angka'

// Email
EMAIL_REQUIRED: 'Email wajib diisi'
EMAIL_INVALID_FORMAT: 'Format email tidak valid'

// Date of Birth
DATE_OF_BIRTH_REQUIRED: 'Tanggal lahir wajib diisi'
DATE_OF_BIRTH_INVALID_FORMAT: 'Format tanggal lahir tidak valid'
DATE_OF_BIRTH_FUTURE: 'Tanggal lahir tidak boleh di masa depan'

// PIN
PIN_REQUIRED: 'PIN wajib diisi'
PIN_INVALID_LENGTH: 'PIN harus tepat 4 digit'
PIN_INVALID_FORMAT: 'PIN hanya boleh mengandung angka'

// PIN Change
PIN_CHANGE_CURRENT_REQUIRED: 'PIN saat ini wajib diisi'
PIN_CHANGE_NEW_REQUIRED: 'PIN baru wajib diisi'
PIN_CHANGE_CONFIRM_REQUIRED: 'Konfirmasi PIN wajib diisi'
PIN_CHANGE_MISMATCH: 'PIN baru dan konfirmasi PIN tidak sama'
PIN_CHANGE_SAME_AS_CURRENT: 'PIN baru tidak boleh sama dengan PIN saat ini'

// Profile Update
PROFILE_UPDATE_IDENTITY_REQUIRED: 'Username atau nomor WhatsApp wajib diisi (minimal satu harus aktif)'

// Add Family Member
ADD_MEMBER_FULL_NAME_REQUIRED: 'Nama lengkap anggota baru wajib diisi'
ADD_MEMBER_IDENTITY_REQUIRED: 'Username atau nomor WhatsApp anggota baru wajib diisi (minimal satu harus aktif)'
```

---

## Usage Examples

### Basic Form Validation

```typescript
import { validateFullName, validateUsername } from '@/services/profile';

function handleSubmit(formData: FormData) {
  const nameResult = validateFullName(formData.fullName);
  if (!nameResult.valid) {
    setError('fullName', nameResult.error);
    return;
  }

  const usernameResult = validateUsername(formData.username);
  if (!usernameResult.valid) {
    setError('username', usernameResult.error);
    return;
  }

  // Proceed with submission
  submitForm(formData);
}
```

### Real-time Field Validation

```typescript
import { validateEmail } from '@/services/profile';

function EmailInput() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleChange = (value: string) => {
    setEmail(value);

    // Only validate if user has typed something
    if (value.trim()) {
      const result = validateEmail(value);
      setError(result.valid ? '' : result.error);
    } else {
      setError('');
    }
  };

  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => handleChange(e.target.value)}
      />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
```

### PIN Change Form

```typescript
import { validatePinChange } from '@/services/profile';

function PinChangeForm() {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const result = validatePinChange(currentPin, newPin, confirmNewPin);

    if (!result.valid) {
      setError(result.error);
      return;
    }

    // Proceed with PIN change
    await changePin({ currentPin, newPin });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={currentPin}
        onChange={(e) => setCurrentPin(e.target.value)}
        placeholder="PIN Saat Ini"
      />
      <input
        type="password"
        value={newPin}
        onChange={(e) => setNewPin(e.target.value)}
        placeholder="PIN Baru"
      />
      <input
        type="password"
        value={confirmNewPin}
        onChange={(e) => setConfirmNewPin(e.target.value)}
        placeholder="Konfirmasi PIN Baru"
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Ubah PIN</button>
    </form>
  );
}
```

### Profile Update with Optional Fields

```typescript
import { validateProfileUpdate } from '@/services/profile';

function ProfileEditForm() {
  const [formData, setFormData] = useState({
    fullName: 'John Doe',
    username: 'john_doe',
    waNumber: '081234567890',
    email: 'john@example.com',
    dateOfBirth: '1990-01-01',
  });

  const handleSubmit = async () => {
    const result = validateProfileUpdate(formData);

    if (!result.valid) {
      toast.error(result.error);
      return;
    }

    await updateProfile(formData);
  };

  return (
    // Form fields...
  );
}
```

---

## Integration Patterns

### React Hook Form Integration

```typescript
import { useForm } from 'react-hook-form';
import { validateProfileUpdate } from '@/services/profile';

function ProfileForm() {
  const { register, handleSubmit, setError } = useForm();

  const onSubmit = (data) => {
    const result = validateProfileUpdate(data);

    if (!result.valid) {
      setError('root', { message: result.error });
      return;
    }

    // Submit form
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Custom Hook Pattern

```typescript
import { useState } from 'react';
import { validateUsername } from '@/services/profile';

function useUsernameValidation() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const validate = (value: string) => {
    setUsername(value);
    const result = validateUsername(value);
    setError(result.valid ? '' : result.error);
    return result.valid;
  };

  return { username, error, validate };
}

// Usage
function MyComponent() {
  const { username, error, validate } = useUsernameValidation();

  return (
    <input
      value={username}
      onChange={(e) => validate(e.target.value)}
    />
  );
}
```

### Validation Before API Call

```typescript
import { validateAddFamilyMember } from '@/services/profile';

async function addMember(data: AddFamilyMemberRequest) {
  // Validate before making API call
  const validationResult = validateAddFamilyMember(data);

  if (!validationResult.valid) {
    throw new Error(validationResult.error);
  }

  // Make API call
  const response = await fetch('/api/family/add-member', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  return response.json();
}
```

---

## Testing

### Unit Test Examples

```typescript
import { describe, it, expect } from 'vitest';
import {
  validateFullName,
  validateUsername,
  validateWaNumber,
  validatePinChange,
} from '@/services/profile/validation.service';

describe('validateFullName', () => {
  it('should pass with valid name', () => {
    const result = validateFullName('John Doe');
    expect(result.valid).toBe(true);
  });

  it('should fail with empty name', () => {
    const result = validateFullName('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Nama lengkap wajib diisi');
  });

  it('should fail with name too short', () => {
    const result = validateFullName('J');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Nama lengkap minimal 2 karakter');
  });
});

describe('validateUsername', () => {
  it('should pass with valid username', () => {
    expect(validateUsername('john_doe').valid).toBe(true);
    expect(validateUsername('user-123').valid).toBe(true);
  });

  it('should fail with invalid characters', () => {
    const result = validateUsername('john@doe');
    expect(result.valid).toBe(false);
  });

  it('should fail with too short username', () => {
    const result = validateUsername('ab');
    expect(result.valid).toBe(false);
  });
});

describe('validatePinChange', () => {
  it('should pass with valid PIN change', () => {
    const result = validatePinChange('1234', '5678', '5678');
    expect(result.valid).toBe(true);
  });

  it('should fail when PINs do not match', () => {
    const result = validatePinChange('1234', '5678', '9999');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('tidak sama');
  });

  it('should fail when new PIN equals current PIN', () => {
    const result = validatePinChange('1234', '1234', '1234');
    expect(result.valid).toBe(false);
  });
});
```

---

## Best Practices

### ✅ DO

1. **Validate Early**
   ```typescript
   // Validate before making API calls
   const result = validateProfileUpdate(data);
   if (!result.valid) {
     return showError(result.error);
   }
   await updateProfile(data);
   ```

2. **Use Type Guards**
   ```typescript
   const result = validateUsername(username);
   if (!result.valid) {
     // TypeScript knows result.error exists
     console.error(result.error);
   }
   ```

3. **Combine Validators for Complex Logic**
   ```typescript
   function validateForm(data: FormData) {
     // Validate individual fields first
     const nameResult = validateFullName(data.name);
     if (!nameResult.valid) return nameResult;

     const usernameResult = validateUsername(data.username);
     if (!usernameResult.valid) return usernameResult;

     // Then validate composite rules
     return validateProfileUpdate(data);
   }
   ```

4. **Provide User Feedback**
   ```typescript
   const result = validateEmail(email);
   if (!result.valid) {
     toast.error(result.error);
   }
   ```

### ❌ DON'T

1. **Don't Skip Validation**
   ```typescript
   // ❌ Bad
   await updateProfile(data); // No validation

   // ✅ Good
   const result = validateProfileUpdate(data);
   if (result.valid) {
     await updateProfile(data);
   }
   ```

2. **Don't Hardcode Error Messages**
   ```typescript
   // ❌ Bad
   if (!username) {
     setError('Username required');
   }

   // ✅ Good
   const result = validateUsername(username);
   if (!result.valid) {
     setError(result.error);
   }
   ```

3. **Don't Ignore Validation Results**
   ```typescript
   // ❌ Bad
   validateUsername(username); // Result not used
   submitForm();

   // ✅ Good
   const result = validateUsername(username);
   if (result.valid) {
     submitForm();
   }
   ```

---

## Summary

The validation service provides:

- ✅ **9 Core Validators** for all profile fields
- ✅ **3 Composite Validators** for complex forms
- ✅ **5 Optional Validators** for flexible validation
- ✅ **Pure Functions** - predictable and testable
- ✅ **Consistent API** - same return format
- ✅ **Type Safe** - full TypeScript support
- ✅ **i18n Ready** - Indonesian error messages

Use these validators throughout your application to ensure data integrity and provide clear user feedback.

For more information, see:
- `src/config/profile.ts` - Validation rules and configuration
- `src/services/profile/validation.service.ts` - Implementation
- `src/types/profile/index.ts` - Type definitions