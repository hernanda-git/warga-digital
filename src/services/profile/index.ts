/**
 * Profile Service Module
 *
 * Barrel export for profile-related services and utilities.
 */

// ─── API Service Exports ──────────────────────────────────────────────────────

export {
  // Result type
  type ApiResult,
  // Profile API
  fetchProfile,
  updateProfile,
  // Validation API
  checkUsernameAvailability,
  checkWaNumberAvailability,
  // Avatar API
  uploadAvatar,
  // Authentication API
  changePin,
  logout,
  // Appearance API
  updateTheme,
  // Family Management API
  addFamilyMember,
  transferOwnership,
  removeFamilyMember,
  // Join Request API
  respondToJoinRequest,
  // Batch operations
  fetchAllProfileData,
} from "./api.service";

// ─── Transformer & Helper Exports ─────────────────────────────────────────────

export {
  // Date transformers
  formatDate,
  toDateInputValue,
  // Profile transformers
  transformProfileData,
  // Relationship transformers
  getRelationshipLabel,
  // Residence helpers
  getCurrentResidence,
  isHouseholdOwner,
  // Join request helpers
  getPendingRequestsForHouse,
  // House formatting helpers
  formatBlokRumah,
  // Validation helpers
  isValidProfile,
  hasPendingJoinRequests,
  hasFamilyMembers,
  getOtherFamilyMembersCount,
  // Form helpers
  extractEditableFields,
  hasFormChanges,
} from "./transformers";

// ─── Validation Service Exports ───────────────────────────────────────────────

export {
  // Types
  type ValidationResult,
  type ValidationSuccess,
  type ValidationError,
  type PinChangeData,
  // Error messages
  PROFILE_ERROR_MESSAGES,
  // Individual field validators
  validateFullName,
  validateUsername,
  validateWaNumber,
  validateEmail,
  validateDateOfBirth,
  validatePin,
  // Composite validators
  validatePinChange,
  validateProfileUpdate,
  validateAddFamilyMember,
  // Optional field validators
  validateOptionalFullName,
  validateOptionalUsername,
  validateOptionalWaNumber,
  validateOptionalEmail,
  validateOptionalDateOfBirth,
} from "./validation.service";
