/**
 * Profile Validation Service - Usage Examples
 *
 * Real-world examples demonstrating how to use the validation service
 * in React components. Copy and adapt these patterns for your use case.
 */

import { useState } from 'react';
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
  validateOptionalEmail,
} from '@/services/profile';
import { RelationshipType } from '@/types/profile';

// ============================================================================
// Example 1: Basic Input with Real-time Validation
// ============================================================================

export function UsernameInput() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleChange = (value: string) => {
    setUsername(value);

    // Validate only if user has typed something
    if (value.trim()) {
      const result = validateUsername(value);
      setError(result.valid ? '' : result.error);
    } else {
      setError('');
    }
  };

  return (
    <div className="form-group">
      <label htmlFor="username">Username</label>
      <input
        id="username"
        type="text"
        value={username}
        onChange={(e) => handleChange(e.target.value)}
        className={error ? 'input-error' : ''}
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}

// ============================================================================
// Example 2: Form with Multiple Fields
// ============================================================================

export function ProfileEditForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    waNumber: '',
    email: '',
    dateOfBirth: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (name: string, value: string) => {
    let result;

    switch (name) {
      case 'fullName':
        result = validateFullName(value);
        break;
      case 'username':
        result = value ? validateUsername(value) : { valid: true };
        break;
      case 'waNumber':
        result = value ? validateWaNumber(value) : { valid: true };
        break;
      case 'email':
        result = validateOptionalEmail(value);
        break;
      case 'dateOfBirth':
        result = value ? validateDateOfBirth(value) : { valid: true };
        break;
      default:
        result = { valid: true };
    }

    setErrors((prev) => ({
      ...prev,
      [name]: result.valid ? '' : (result.error ?? ''),
    }));

    return result.valid;
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate entire form
    const result = validateProfileUpdate(formData);

    if (!result.valid) {
      setErrors({ form: result.error });
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit to API
      await updateProfile(formData);
      alert('Profil berhasil diperbarui!');
    } catch (error) {
      setErrors({ form: 'Gagal memperbarui profil' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Nama Lengkap *</label>
        <input
          type="text"
          value={formData.fullName}
          onChange={(e) => handleChange('fullName', e.target.value)}
        />
        {errors.fullName && <span className="error">{errors.fullName}</span>}
      </div>

      <div className="form-group">
        <label>Username</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => handleChange('username', e.target.value)}
        />
        {errors.username && <span className="error">{errors.username}</span>}
      </div>

      <div className="form-group">
        <label>Nomor WhatsApp</label>
        <input
          type="tel"
          value={formData.waNumber}
          onChange={(e) => handleChange('waNumber', e.target.value)}
        />
        {errors.waNumber && <span className="error">{errors.waNumber}</span>}
      </div>

      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label>Tanggal Lahir</label>
        <input
          type="date"
          value={formData.dateOfBirth}
          onChange={(e) => handleChange('dateOfBirth', e.target.value)}
        />
        {errors.dateOfBirth && <span className="error">{errors.dateOfBirth}</span>}
      </div>

      {errors.form && <div className="error-banner">{errors.form}</div>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  );
}

// ============================================================================
// Example 3: PIN Change Form
// ============================================================================

export function PinChangeForm() {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate PIN change
    const result = validatePinChange(currentPin, newPin, confirmNewPin);

    if (!result.valid) {
      setError(result.error);
      return;
    }

    try {
      // Call API
      await changePin({ currentPin, newPin });
      setSuccess(true);
      // Reset form
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
    } catch (err) {
      setError('Gagal mengubah PIN. PIN saat ini mungkin salah.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="pin-change-form">
      <h2>Ubah PIN</h2>

      <div className="form-group">
        <label>PIN Saat Ini</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={currentPin}
          onChange={(e) => setCurrentPin(e.target.value)}
          placeholder="••••"
        />
      </div>

      <div className="form-group">
        <label>PIN Baru</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={newPin}
          onChange={(e) => setNewPin(e.target.value)}
          placeholder="••••"
        />
      </div>

      <div className="form-group">
        <label>Konfirmasi PIN Baru</label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={confirmNewPin}
          onChange={(e) => setConfirmNewPin(e.target.value)}
          placeholder="••••"
        />
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">PIN berhasil diubah!</div>}

      <button type="submit">Ubah PIN</button>
    </form>
  );
}

// ============================================================================
// Example 4: Add Family Member Form
// ============================================================================

export function AddFamilyMemberForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    waNumber: '',
    relationship: 'FAMILY' as const,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const result = validateAddFamilyMember({
      fullName: formData.fullName,
      username: formData.username || undefined,
      waNumber: formData.waNumber || undefined,
      relationship: formData.relationship as RelationshipType,
    });

    if (!result.valid) {
      setErrors({ form: result.error });
      return;
    }

    try {
      await addFamilyMember(formData);
      alert('Anggota keluarga berhasil ditambahkan!');
      // Reset form
      setFormData({
        fullName: '',
        username: '',
        waNumber: '',
        relationship: 'FAMILY',
      });
    } catch (error) {
      setErrors({ form: 'Gagal menambahkan anggota keluarga' });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Tambah Anggota Keluarga</h3>

      <div className="form-group">
        <label>Nama Lengkap *</label>
        <input
          type="text"
          value={formData.fullName}
          onChange={(e) => handleChange('fullName', e.target.value)}
          placeholder="Masukkan nama lengkap"
        />
      </div>

      <div className="form-group">
        <label>Username</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => handleChange('username', e.target.value)}
          placeholder="Opsional"
        />
      </div>

      <div className="form-group">
        <label>Nomor WhatsApp</label>
        <input
          type="tel"
          value={formData.waNumber}
          onChange={(e) => handleChange('waNumber', e.target.value)}
          placeholder="Opsional"
        />
        <small>Username atau nomor WhatsApp wajib diisi (minimal satu)</small>
      </div>

      <div className="form-group">
        <label>Hubungan</label>
        <select
          value={formData.relationship}
          onChange={(e) => handleChange('relationship', e.target.value)}
        >
          <option value="FAMILY">Keluarga</option>
          <option value="TENANT">Penyewa</option>
          <option value="CARETAKER">Penjaga</option>
        </select>
      </div>

      {errors.form && <div className="error-banner">{errors.form}</div>}

      <button type="submit">Tambah Anggota</button>
    </form>
  );
}

// ============================================================================
// Example 5: Custom Hook for Field Validation
// ============================================================================

export function useFieldValidation(
  validator: (value: string) => { valid: boolean; error?: string }
) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const validate = (newValue: string) => {
    const result = validator(newValue);
    setError(result.valid ? '' : result.error || '');
    return result.valid;
  };

  const handleChange = (newValue: string) => {
    setValue(newValue);
    if (touched) {
      validate(newValue);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    validate(value);
  };

  const reset = () => {
    setValue('');
    setError('');
    setTouched(false);
  };

  return {
    value,
    error,
    touched,
    isValid: !error && touched,
    setValue: handleChange,
    onBlur: handleBlur,
    validate: () => validate(value),
    reset,
  };
}

// Usage of the custom hook
export function EmailInputWithHook() {
  const email = useFieldValidation(validateOptionalEmail);

  return (
    <div className="form-group">
      <label>Email</label>
      <input
        type="email"
        value={email.value}
        onChange={(e) => email.setValue(e.target.value)}
        onBlur={email.onBlur}
        className={email.touched && email.error ? 'input-error' : ''}
      />
      {email.touched && email.error && (
        <span className="error">{email.error}</span>
      )}
    </div>
  );
}

// ============================================================================
// Example 6: Validation on Blur (Touch-based)
// ============================================================================

export function TouchBasedValidation() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const handleBlur = () => {
    setTouched(true);
    if (username) {
      const result = validateUsername(username);
      setError(result.valid ? '' : result.error);
    }
  };

  const handleChange = (value: string) => {
    setUsername(value);
    // Only validate if already touched
    if (touched && value) {
      const result = validateUsername(value);
      setError(result.valid ? '' : result.error);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={username}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Username"
      />
      {touched && error && <span className="error">{error}</span>}
    </div>
  );
}

// ============================================================================
// Example 7: Batch Validation
// ============================================================================

export function BatchValidationExample() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    waNumber: '',
  });

  const validateAllFields = () => {
    const errors: string[] = [];

    const nameResult = validateFullName(formData.fullName);
    if (!nameResult.valid) errors.push(nameResult.error);

    if (formData.username) {
      const usernameResult = validateUsername(formData.username);
      if (!usernameResult.valid) errors.push(usernameResult.error);
    }

    if (formData.waNumber) {
      const waResult = validateWaNumber(formData.waNumber);
      if (!waResult.valid) errors.push(waResult.error);
    }

    // Check if at least one identifier exists
    if (!formData.username && !formData.waNumber) {
      errors.push('Username atau nomor WhatsApp wajib diisi');
    }

    return errors;
  };

  const handleSubmit = () => {
    const errors = validateAllFields();

    if (errors.length > 0) {
      alert('Kesalahan:\n' + errors.join('\n'));
      return;
    }

    // Proceed with submission
    console.log('Form valid, submitting...');
  };

  return (
    <div>
      {/* Form fields */}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}

// ============================================================================
// Example 8: Async Validation with Server Check
// ============================================================================

export function UsernameWithAvailabilityCheck() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleChange = async (value: string) => {
    setUsername(value);

    // First, validate format locally
    const formatResult = validateUsername(value);
    if (!formatResult.valid) {
      setError(formatResult.error);
      return;
    }

    // Then check availability with server
    setChecking(true);
    try {
      const available = await checkUsernameAvailability(value);
      if (!available) {
        setError('Username sudah dipakai');
      } else {
        setError('');
      }
    } catch {
      setError('Gagal memeriksa ketersediaan');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="form-group">
      <label>Username</label>
      <input
        type="text"
        value={username}
        onChange={(e) => handleChange(e.target.value)}
      />
      {checking && <span className="info">Memeriksa...</span>}
      {error && <span className="error">{error}</span>}
      {!error && !checking && username && (
        <span className="success">Username tersedia</span>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions (mock implementations)
// ============================================================================

async function updateProfile(data: any) {
  // Mock API call
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

async function changePin(data: any) {
  // Mock API call
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

async function addFamilyMember(data: any) {
  // Mock API call
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

async function checkUsernameAvailability(username: string) {
  // Mock API call
  return new Promise<boolean>((resolve) =>
    setTimeout(() => resolve(Math.random() > 0.5), 500)
  );
}
