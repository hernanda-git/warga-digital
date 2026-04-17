# Profile Validation Service

Centralized validation logic for all profile-related forms and data in Warga Digital.

## 📋 Overview

This service provides pure validation functions that return consistent results for easy error handling. All validators are:

- ✅ **Pure Functions** - No side effects, predictable behavior
- ✅ **Type Safe** - Full TypeScript support
- ✅ **Consistent** - Same return format across all validators
- ✅ **Testable** - Easy to unit test
- ✅ **i18n Ready** - Indonesian error messages

## 🚀 Quick Start

```typescript
import { validateUsername, validateEmail } from '@/services/profile';

// Validate a single field
const result = validateUsername('john_doe');
if (!result.valid) {
  console.error(result.error); // Display error to user
}

// Validate a complete form
const formResult = validateProfileUpdate({
  fullName: 'John Doe',
  username: 'john_doe',
  waNumber: '081234567890',
});

if (formResult.valid) {
  // Proceed with form submission
  await updateProfile(formData);
}
```

## 📦 Available Validators

### Individual Field Validators

| Validator | Purpose | Rules |
|-----------|---------|-------|
| `validateFullName()` | Validate full name | 2-100 chars |
| `validateUsername()` | Validate username | 3-30 chars, alphanumeric + `_-` |
| `validateWaNumber()` | Validate WhatsApp number | 10-15 digits |
| `validateEmail()` | Validate email | Standard email format |
| `validateDateOfBirth()` | Validate date of birth | Valid date, not future |
| `validatePin()` | Validate PIN | Exactly 4 digits |

### Composite Validators

| Validator | Purpose |
|-----------|---------|
| `validatePinChange()` | Validate PIN change (current, new, confirm) |
| `validateProfileUpdate()` | Validate profile update form |
| `validateAddFamilyMember()` | Validate add family member form |

### Optional Validators

For fields that can be empty but must be valid if filled:

- `validateOptionalFullName()`
- `validateOptionalUsername()`
- `validateOptionalWaNumber()`
- `validateOptionalEmail()`
- `validateOptionalDateOfBirth()`

## 📖 Return Format

All validators return a `ValidationResult`:

```typescript
// Success
{ valid: true }

// Error
{ valid: false, error: "Nama lengkap minimal 2 karakter" }
```

## 💡 Common Use Cases

### 1. Real-time Field Validation

```typescript
const [username, setUsername] = useState('');
const [error, setError] = useState('');

const handleChange = (value: string) => {
  setUsername(value);
  const result = validateUsername(value);
  setError(result.valid ? '' : result.error);
};
```

### 2. Form Submission Validation

```typescript
const handleSubmit = () => {
  const result = validateProfileUpdate(formData);
  
  if (!result.valid) {
    toast.error(result.error);
    return;
  }
  
  // Submit form
  await updateProfile(formData);
};
```

### 3. PIN Change

```typescript
const result = validatePinChange(currentPin, newPin, confirmNewPin);

if (!result.valid) {
  setError(result.error);
  return;
}

await changePin({ currentPin, newPin });
```

### 4. Add Family Member

```typescript
const result = validateAddFamilyMember({
  fullName: 'Jane Doe',
  username: 'jane_doe',
  relationship: 'FAMILY',
});

if (result.valid) {
  await addFamilyMember(formData);
}
```

## 🎯 Validation Rules

All validation rules are centralized in `@/config/profile`:

```typescript
import { VALIDATION_RULES } from '@/config/profile';

console.log(VALIDATION_RULES.USERNAME.MIN_LENGTH); // 3
console.log(VALIDATION_RULES.USERNAME.MAX_LENGTH); // 30
console.log(VALIDATION_RULES.USERNAME.PATTERN);     // /^[a-zA-Z0-9_-]+$/
```

## 🔤 Error Messages

Access error messages via `PROFILE_ERROR_MESSAGES`:

```typescript
import { PROFILE_ERROR_MESSAGES } from '@/services/profile';

console.log(PROFILE_ERROR_MESSAGES.USERNAME_REQUIRED);
// "Username wajib diisi"

console.log(PROFILE_ERROR_MESSAGES.PIN_CHANGE_MISMATCH);
// "PIN baru dan konfirmasi PIN tidak sama"
```

## 🧪 Testing

All validators are pure functions, making them easy to test:

```typescript
import { validateUsername } from '@/services/profile/validation.service';

describe('validateUsername', () => {
  it('should pass with valid username', () => {
    expect(validateUsername('john_doe').valid).toBe(true);
  });

  it('should fail with invalid characters', () => {
    const result = validateUsername('john@doe');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('hanya boleh');
  });
});
```

## 📚 Documentation

- **[VALIDATION_GUIDE.md](./VALIDATION_GUIDE.md)** - Complete API reference and best practices
- **[VALIDATION_EXAMPLES.tsx](./VALIDATION_EXAMPLES.tsx)** - Real-world usage examples
- **[validation.service.ts](./validation.service.ts)** - Source code

## ✨ Key Features

### Profile Update Validation

The `validateProfileUpdate()` validator ensures:
- Full name is valid
- **At least one identifier** (username OR waNumber) is provided
- Each provided field is valid
- Optional fields (email, dateOfBirth) are validated if filled

```typescript
// ✅ Valid - has username
validateProfileUpdate({
  fullName: 'John Doe',
  username: 'john_doe',
  waNumber: '',
})

// ✅ Valid - has waNumber
validateProfileUpdate({
  fullName: 'John Doe',
  username: '',
  waNumber: '081234567890',
})

// ❌ Invalid - no identifier
validateProfileUpdate({
  fullName: 'John Doe',
  username: '',
  waNumber: '',
})
// { valid: false, error: "Username atau nomor WhatsApp wajib diisi..." }
```

### PIN Change Validation

The `validatePinChange()` validator ensures:
- All PINs are exactly 4 digits
- New PIN matches confirmation
- New PIN is different from current PIN

```typescript
validatePinChange('1234', '5678', '5678')
// ✅ Valid

validatePinChange('1234', '1234', '1234')
// ❌ Invalid - new PIN same as current
```

## 🔗 Integration

### With React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { validateProfileUpdate } from '@/services/profile';

const { handleSubmit } = useForm();

const onSubmit = (data) => {
  const result = validateProfileUpdate(data);
  if (!result.valid) {
    toast.error(result.error);
    return;
  }
  // Submit...
};
```

### With Custom Hooks

```typescript
import { useFieldValidation } from './hooks';
import { validateEmail } from '@/services/profile';

const email = useFieldValidation(validateEmail);

<input
  value={email.value}
  onChange={e => email.setValue(e.target.value)}
  onBlur={email.onBlur}
/>
```

## 🎨 Best Practices

### ✅ DO

```typescript
// Validate before API calls
const result = validateProfileUpdate(data);
if (!result.valid) {
  return showError(result.error);
}
await updateProfile(data);

// Use type guards
if (!result.valid) {
  console.error(result.error); // TypeScript knows error exists
}

// Provide immediate feedback
const result = validateUsername(username);
if (!result.valid) {
  toast.error(result.error);
}
```

### ❌ DON'T

```typescript
// Don't skip validation
await updateProfile(data); // No validation!

// Don't hardcode error messages
if (!username) {
  setError('Username required'); // Use validator instead
}

// Don't ignore results
validateUsername(username); // Result not used
submitForm(); // Submitted anyway
```

## 📞 Support

For questions or issues:
1. Check [VALIDATION_GUIDE.md](./VALIDATION_GUIDE.md) for detailed API reference
2. Review [VALIDATION_EXAMPLES.tsx](./VALIDATION_EXAMPLES.tsx) for usage patterns
3. See source code in [validation.service.ts](./validation.service.ts)

---

**Last Updated:** 2024  
**Version:** 1.0.0  
**Maintained by:** Warga Digital Team