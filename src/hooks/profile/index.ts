/**
 * Profile Hooks - Barrel Export
 *
 * Provides centralized access to all profile-related custom hooks.
 * Import from here to ensure consistent imports across the application.
 */

// Core Data Hooks
export { useProfileData } from "./useProfileData";
export { useProfileEdit } from "./useProfileEdit";

// Field Validation Hooks
export { useFieldValidation } from "./useFieldValidation";

// Avatar Hooks
export { useAvatarUpload } from "./useAvatarUpload";

// PIN Management Hooks
export { usePinChange } from "./usePinChange";

// Family Management Hooks
export { useFamilyManagement } from "./useFamilyManagement";
export { useJoinRequests } from "./useJoinRequests";

// Theme Hooks
export { useThemeSelection } from "./useThemeSelection";

// Residence Hooks
export { useResidenceSelector } from "./useResidenceSelector";

// UI State Hooks
export { useConfirmDialog } from "./useConfirmDialog";

// Combined hook for easy access
export { useProfilePage } from "./useProfilePage";
