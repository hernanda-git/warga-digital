/**
 * Profile Validation Service
 *
 * Provides pure validation functions for profile-related forms and data.
 * All validators return a consistent result format for easy error handling.
 *
 * @module services/profile/validation
 */

import { VALIDATION_RULES } from '@/config/profile';
import type {
  UpdateProfileRequest,
  AddFamilyMemberRequest,
} from '@/types/profile';

// ============================================================================
// Types
// ============================================================================

/**
 * Validation result for successful validation
 */
export interface ValidationSuccess {
  valid: true;
}

/**
 * Validation result for failed validation
 */
export interface ValidationError {
  valid: false;
  error: string;
}

/**
 * Union type for validation results
 */
export type ValidationResult = ValidationSuccess | ValidationError;

/**
 * PIN change validation data
 */
export interface PinChangeData {
  currentPin: string;
  newPin: string;
  confirmNewPin: string;
}

// ============================================================================
// Error Messages
// ============================================================================

/**
 * Centralized error messages for profile validation
 */
export const PROFILE_ERROR_MESSAGES = {
  // Full Name
  FULL_NAME_REQUIRED: 'Nama lengkap wajib diisi',
  FULL_NAME_TOO_SHORT: `Nama lengkap minimal ${VALIDATION_RULES.FULL_NAME.MIN_LENGTH} karakter`,
  FULL_NAME_TOO_LONG: `Nama lengkap maksimal ${VALIDATION_RULES.FULL_NAME.MAX_LENGTH} karakter`,

  // Username
  USERNAME_REQUIRED: 'Username wajib diisi',
  USERNAME_TOO_SHORT: `Username minimal ${VALIDATION_RULES.USERNAME.MIN_LENGTH} karakter`,
  USERNAME_TOO_LONG: `Username maksimal ${VALIDATION_RULES.USERNAME.MAX_LENGTH} karakter`,
  USERNAME_INVALID_FORMAT: 'Username hanya boleh mengandung huruf, angka, underscore (_), dan dash (-)',

  // WhatsApp Number
  WA_NUMBER_REQUIRED: 'Nomor WhatsApp wajib diisi',
  WA_NUMBER_TOO_SHORT: `Nomor WhatsApp minimal ${VALIDATION_RULES.WA_NUMBER.MIN_LENGTH} digit`,
  WA_NUMBER_TOO_LONG: `Nomor WhatsApp maksimal ${VALIDATION_RULES.WA_NUMBER.MAX_LENGTH} digit`,
  WA_NUMBER_INVALID_FORMAT: 'Nomor WhatsApp hanya boleh mengandung angka',

  // Email
  EMAIL_REQUIRED: 'Email wajib diisi',
  EMAIL_INVALID_FORMAT: 'Format email tidak valid',

  // Date of Birth
  DATE_OF_BIRTH_REQUIRED: 'Tanggal lahir wajib diisi',
  DATE_OF_BIRTH_INVALID_FORMAT: 'Format tanggal lahir tidak valid',
  DATE_OF_BIRTH_FUTURE: 'Tanggal lahir tidak boleh di masa depan',

  // PIN
  PIN_REQUIRED: 'PIN wajib diisi',
  PIN_INVALID_LENGTH: 'PIN harus tepat 4 digit',
  PIN_INVALID_FORMAT: 'PIN hanya boleh mengandung angka',

  // PIN Change
  PIN_CHANGE_CURRENT_REQUIRED: 'PIN saat ini wajib diisi',
  PIN_CHANGE_NEW_REQUIRED: 'PIN baru wajib diisi',
  PIN_CHANGE_CONFIRM_REQUIRED: 'Konfirmasi PIN wajib diisi',
  PIN_CHANGE_MISMATCH: 'PIN baru dan konfirmasi PIN tidak sama',
  PIN_CHANGE_SAME_AS_CURRENT: 'PIN baru tidak boleh sama dengan PIN saat ini',

  // Profile Update
  PROFILE_UPDATE_IDENTITY_REQUIRED: 'Username atau nomor WhatsApp wajib diisi (minimal satu harus aktif)',

  // Add Family Member
  ADD_MEMBER_FULL_NAME_REQUIRED: 'Nama lengkap anggota baru wajib diisi',
  ADD_MEMBER_IDENTITY_REQUIRED: 'Username atau nomor WhatsApp anggota baru wajib diisi (minimal satu harus aktif)',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a success validation result
 */
const success = (): ValidationSuccess => ({ valid: true });

/**
 * Creates an error validation result
 */
const error = (message: string): ValidationError => ({
  valid: false,
  error: message,
});

/**
 * Checks if a string is empty or only whitespace
 */
const isEmpty = (value: string | null | undefined): boolean => {
  return !value || value.trim().length === 0;
};

/**
 * Checks if a date string is valid and not in the future
 */
const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date <= new Date();
};

// ============================================================================
// Individual Field Validators
// ============================================================================

/**
 * Validates full name
 *
 * @param name - Full name to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateFullName('John Doe') // { valid: true }
 * validateFullName('J') // { valid: false, error: '...' }
 * ```
 */
export function validateFullName(name: string): ValidationResult {
  if (isEmpty(name)) {
    return error(PROFILE_ERROR_MESSAGES.FULL_NAME_REQUIRED);
  }

  const trimmedName = name.trim();

  if (trimmedName.length < VALIDATION_RULES.FULL_NAME.MIN_LENGTH) {
    return error(PROFILE_ERROR_MESSAGES.FULL_NAME_TOO_SHORT);
  }

  if (trimmedName.length > VALIDATION_RULES.FULL_NAME.MAX_LENGTH) {
    return error(PROFILE_ERROR_MESSAGES.FULL_NAME_TOO_LONG);
  }

  return success();
}

/**
 * Validates username format
 *
 * Rules:
 * - 3-30 characters
 * - Only alphanumeric, underscore, and dash allowed
 *
 * @param username - Username to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateUsername('john_doe') // { valid: true }
 * validateUsername('ab') // { valid: false, error: '...' }
 * validateUsername('john@doe') // { valid: false, error: '...' }
 * ```
 */
export function validateUsername(username: string): ValidationResult {
  if (isEmpty(username)) {
    return error(PROFILE_ERROR_MESSAGES.USERNAME_REQUIRED);
  }

  const trimmedUsername = username.trim();

  if (trimmedUsername.length < VALIDATION_RULES.USERNAME.MIN_LENGTH) {
    return error(PROFILE_ERROR_MESSAGES.USERNAME_TOO_SHORT);
  }

  if (trimmedUsername.length > VALIDATION_RULES.USERNAME.MAX_LENGTH) {
    return error(PROFILE_ERROR_MESSAGES.USERNAME_TOO_LONG);
  }

  if (!VALIDATION_RULES.USERNAME.PATTERN.test(trimmedUsername)) {
    return error(PROFILE_ERROR_MESSAGES.USERNAME_INVALID_FORMAT);
  }

  return success();
}

/**
 * Validates WhatsApp number format
 *
 * Rules:
 * - 10-15 digits
 * - Only numeric characters allowed
 *
 * @param waNumber - WhatsApp number to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateWaNumber('081234567890') // { valid: true }
 * validateWaNumber('123') // { valid: false, error: '...' }
 * validateWaNumber('08123abc') // { valid: false, error: '...' }
 * ```
 */
export function validateWaNumber(waNumber: string): ValidationResult {
  if (isEmpty(waNumber)) {
    return error(PROFILE_ERROR_MESSAGES.WA_NUMBER_REQUIRED);
  }

  const trimmedNumber = waNumber.trim();

  if (trimmedNumber.length < VALIDATION_RULES.WA_NUMBER.MIN_LENGTH) {
    return error(PROFILE_ERROR_MESSAGES.WA_NUMBER_TOO_SHORT);
  }

  if (trimmedNumber.length > VALIDATION_RULES.WA_NUMBER.MAX_LENGTH) {
    return error(PROFILE_ERROR_MESSAGES.WA_NUMBER_TOO_LONG);
  }

  if (!VALIDATION_RULES.WA_NUMBER.PATTERN.test(trimmedNumber)) {
    return error(PROFILE_ERROR_MESSAGES.WA_NUMBER_INVALID_FORMAT);
  }

  return success();
}

/**
 * Validates email format
 *
 * @param email - Email address to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateEmail('user@example.com') // { valid: true }
 * validateEmail('invalid-email') // { valid: false, error: '...' }
 * ```
 */
export function validateEmail(email: string): ValidationResult {
  if (isEmpty(email)) {
    return error(PROFILE_ERROR_MESSAGES.EMAIL_REQUIRED);
  }

  const trimmedEmail = email.trim();

  if (!VALIDATION_RULES.EMAIL.PATTERN.test(trimmedEmail)) {
    return error(PROFILE_ERROR_MESSAGES.EMAIL_INVALID_FORMAT);
  }

  return success();
}

/**
 * Validates date of birth
 *
 * Rules:
 * - Must be a valid date
 * - Cannot be in the future
 *
 * @param date - Date string (YYYY-MM-DD format)
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateDateOfBirth('1990-01-01') // { valid: true }
 * validateDateOfBirth('invalid') // { valid: false, error: '...' }
 * validateDateOfBirth('2099-01-01') // { valid: false, error: '...' }
 * ```
 */
export function validateDateOfBirth(date: string): ValidationResult {
  if (isEmpty(date)) {
    return error(PROFILE_ERROR_MESSAGES.DATE_OF_BIRTH_REQUIRED);
  }

  const trimmedDate = date.trim();

  if (!isValidDate(trimmedDate)) {
    return error(PROFILE_ERROR_MESSAGES.DATE_OF_BIRTH_INVALID_FORMAT);
  }

  const birthDate = new Date(trimmedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (birthDate > today) {
    return error(PROFILE_ERROR_MESSAGES.DATE_OF_BIRTH_FUTURE);
  }

  return success();
}

/**
 * Validates PIN format
 *
 * Rules:
 * - Exactly 4 digits
 * - Only numeric characters
 *
 * @param pin - PIN to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validatePin('1234') // { valid: true }
 * validatePin('123') // { valid: false, error: '...' }
 * validatePin('abcd') // { valid: false, error: '...' }
 * ```
 */
export function validatePin(pin: string): ValidationResult {
  if (isEmpty(pin)) {
    return error(PROFILE_ERROR_MESSAGES.PIN_REQUIRED);
  }

  const trimmedPin = pin.trim();

  if (trimmedPin.length !== VALIDATION_RULES.PIN.LENGTH) {
    return error(PROFILE_ERROR_MESSAGES.PIN_INVALID_LENGTH);
  }

  if (!VALIDATION_RULES.PIN.PATTERN.test(trimmedPin)) {
    return error(PROFILE_ERROR_MESSAGES.PIN_INVALID_FORMAT);
  }

  return success();
}

// ============================================================================
// Composite Validators
// ============================================================================

/**
 * Validates PIN change data
 *
 * Rules:
 * - All PINs must be valid (4 digits)
 * - New PIN must match confirmation
 * - New PIN must be different from current PIN
 *
 * @param currentPin - Current PIN
 * @param newPin - New PIN
 * @param confirmNewPin - Confirmation of new PIN
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validatePinChange('1234', '5678', '5678') // { valid: true }
 * validatePinChange('1234', '5678', '9999') // { valid: false, error: '...' }
 * validatePinChange('1234', '1234', '1234') // { valid: false, error: '...' }
 * ```
 */
export function validatePinChange(
  currentPin: string,
  newPin: string,
  confirmNewPin: string
): ValidationResult {
  // Validate current PIN
  if (isEmpty(currentPin)) {
    return error(PROFILE_ERROR_MESSAGES.PIN_CHANGE_CURRENT_REQUIRED);
  }

  const currentPinResult = validatePin(currentPin);
  if (!currentPinResult.valid) {
    return currentPinResult;
  }

  // Validate new PIN
  if (isEmpty(newPin)) {
    return error(PROFILE_ERROR_MESSAGES.PIN_CHANGE_NEW_REQUIRED);
  }

  const newPinResult = validatePin(newPin);
  if (!newPinResult.valid) {
    return newPinResult;
  }

  // Validate confirm PIN
  if (isEmpty(confirmNewPin)) {
    return error(PROFILE_ERROR_MESSAGES.PIN_CHANGE_CONFIRM_REQUIRED);
  }

  const confirmPinResult = validatePin(confirmNewPin);
  if (!confirmPinResult.valid) {
    return confirmPinResult;
  }

  // Check if new PIN matches confirmation
  if (newPin.trim() !== confirmNewPin.trim()) {
    return error(PROFILE_ERROR_MESSAGES.PIN_CHANGE_MISMATCH);
  }

  // Check if new PIN is different from current PIN
  if (newPin.trim() === currentPin.trim()) {
    return error(PROFILE_ERROR_MESSAGES.PIN_CHANGE_SAME_AS_CURRENT);
  }

  return success();
}

/**
 * Validates profile update data
 *
 * Rules:
 * - Full name is required and must be valid
 * - At least one identifier (username OR waNumber) must be provided and valid
 * - Email is optional but must be valid if provided
 * - Date of birth is optional but must be valid if provided
 *
 * @param data - Profile update data
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateProfileUpdate({
 *   fullName: 'John Doe',
 *   username: 'john_doe',
 *   waNumber: ''
 * }) // { valid: true }
 *
 * validateProfileUpdate({
 *   fullName: 'John Doe',
 *   username: '',
 *   waNumber: ''
 * }) // { valid: false, error: 'Username atau nomor WhatsApp wajib diisi...' }
 * ```
 */
export function validateProfileUpdate(
  data: UpdateProfileRequest
): ValidationResult {
  // Validate full name if provided
  if (data.fullName !== undefined) {
    const fullNameResult = validateFullName(data.fullName);
    if (!fullNameResult.valid) {
      return fullNameResult;
    }
  }

  // Check if at least one identifier is provided
  const hasUsername = !isEmpty(data.username);
  const hasWaNumber = !isEmpty(data.waNumber);

  if (!hasUsername && !hasWaNumber) {
    return error(PROFILE_ERROR_MESSAGES.PROFILE_UPDATE_IDENTITY_REQUIRED);
  }

  // Validate username if provided
  if (hasUsername && data.username) {
    const usernameResult = validateUsername(data.username);
    if (!usernameResult.valid) {
      return usernameResult;
    }
  }

  // Validate WhatsApp number if provided
  if (hasWaNumber && data.waNumber) {
    const waNumberResult = validateWaNumber(data.waNumber);
    if (!waNumberResult.valid) {
      return waNumberResult;
    }
  }

  // Validate email if provided and not empty
  if (data.email && !isEmpty(data.email)) {
    const emailResult = validateEmail(data.email);
    if (!emailResult.valid) {
      return emailResult;
    }
  }

  // Validate date of birth if provided and not empty
  if (data.dateOfBirth && !isEmpty(data.dateOfBirth)) {
    const dateResult = validateDateOfBirth(data.dateOfBirth);
    if (!dateResult.valid) {
      return dateResult;
    }
  }

  return success();
}

/**
 * Validates add family member data
 *
 * Rules:
 * - Full name is required and must be valid
 * - At least one identifier (username OR waNumber) must be provided and valid
 *
 * @param data - Add family member data
 * @returns Validation result
 *
 * @example
 * ```typescript
 * validateAddFamilyMember({
 *   fullName: 'Jane Doe',
 *   username: 'jane_doe',
 *   relationship: 'FAMILY'
 * }) // { valid: true }
 *
 * validateAddFamilyMember({
 *   fullName: 'J',
 *   username: 'jane_doe'
 * }) // { valid: false, error: 'Nama lengkap minimal 2 karakter' }
 * ```
 */
export function validateAddFamilyMember(
  data: AddFamilyMemberRequest
): ValidationResult {
  // Validate full name
  if (isEmpty(data.fullName)) {
    return error(PROFILE_ERROR_MESSAGES.ADD_MEMBER_FULL_NAME_REQUIRED);
  }

  const fullNameResult = validateFullName(data.fullName);
  if (!fullNameResult.valid) {
    return fullNameResult;
  }

  // Check if at least one identifier is provided
  const hasUsername = !isEmpty(data.username);
  const hasWaNumber = !isEmpty(data.waNumber);

  if (!hasUsername && !hasWaNumber) {
    return error(PROFILE_ERROR_MESSAGES.ADD_MEMBER_IDENTITY_REQUIRED);
  }

  // Validate username if provided
  if (hasUsername && data.username) {
    const usernameResult = validateUsername(data.username);
    if (!usernameResult.valid) {
      return usernameResult;
    }
  }

  // Validate WhatsApp number if provided
  if (hasWaNumber && data.waNumber) {
    const waNumberResult = validateWaNumber(data.waNumber);
    if (!waNumberResult.valid) {
      return waNumberResult;
    }
  }

  return success();
}

// ============================================================================
// Optional Field Validators
// ============================================================================

/**
 * Validates an optional full name (allows empty, but validates if provided)
 *
 * @param name - Full name to validate
 * @returns Validation result
 */
export function validateOptionalFullName(name: string): ValidationResult {
  if (isEmpty(name)) {
    return success();
  }
  return validateFullName(name);
}

/**
 * Validates an optional username (allows empty, but validates if provided)
 *
 * @param username - Username to validate
 * @returns Validation result
 */
export function validateOptionalUsername(username: string): ValidationResult {
  if (isEmpty(username)) {
    return success();
  }
  return validateUsername(username);
}

/**
 * Validates an optional WhatsApp number (allows empty, but validates if provided)
 *
 * @param waNumber - WhatsApp number to validate
 * @returns Validation result
 */
export function validateOptionalWaNumber(waNumber: string): ValidationResult {
  if (isEmpty(waNumber)) {
    return success();
  }
  return validateWaNumber(waNumber);
}

/**
 * Validates an optional email (allows empty, but validates if provided)
 *
 * @param email - Email to validate
 * @returns Validation result
 */
export function validateOptionalEmail(email: string): ValidationResult {
  if (isEmpty(email)) {
    return success();
  }
  return validateEmail(email);
}

/**
 * Validates an optional date of birth (allows empty, but validates if provided)
 *
 * @param date - Date to validate
 * @returns Validation result
 */
export function validateOptionalDateOfBirth(date: string): ValidationResult {
  if (isEmpty(date)) {
    return success();
  }
  return validateDateOfBirth(date);
}
