"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useProfileData } from "./useProfileData";
import { useProfileEdit } from "./useProfileEdit";
import { useAvatarUpload } from "./useAvatarUpload";
import { usePinChange } from "./usePinChange";
import { useFamilyManagement } from "./useFamilyManagement";
import { useThemeSelection } from "./useThemeSelection";
import { useJoinRequests } from "./useJoinRequests";
import { useResidenceSelector } from "./useResidenceSelector";
import { useConfirmDialog } from "./useConfirmDialog";
import { logout as logoutApi } from "@/services/profile/api.service";
import { ROUTES } from "@/config/profile";
import type {
  ProfileData,
  PendingJoinRequestItem,
  ConfirmDialogState,
} from "@/types/profile";

/**
 * Combined hook that provides all profile page functionality
 * Acts as a facade to simplify the profile page component
 *
 * @example
 * ```tsx
 * function ProfilePage() {
 *   const {
 *     // State
 *     profile,
 *     loading,
 *     error,
 *     hasMounted,
 *
 *     // Profile data
 *     editForm,
 *     isEditing,
 *     saving,
 *
 *     // Avatar
 *     avatarLoading,
 *     avatarError,
 *     fileInputRef,
 *     handleAvatarChange,
 *
 *     // Family
 *     familyMembers,
 *     isHouseholdOwner,
 *     handleTransferOwner,
 *     handleRemoveMember,
 *
 *     // PIN
 *     isChangingPin,
 *     handleChangePin,
 *     pinError,
 *
 *     // Theme
 *     themeSheetOpen,
 *     handleThemeSelect,
 *
 *     // Join requests
 *     pendingRequests,
 *     handleRespondToRequest,
 *
 *     // Residence
 *     residences,
 *     currentResidence,
 *     selectedResidenceIndex,
 *     setSelectedResidenceIndex,
 *
 *     // Confirm dialog
 *     confirmDialog,
 *     openConfirmDialog,
 *     closeConfirmDialog,
 *
 *     // Logout
 *     handleLogout,
 *
 *     // Refresh
 *     refreshProfile,
 *   } = useProfilePage();
 *
 *   // ... render
 * }
 * ```
 */
export interface UseProfilePageReturn {
  // ─────────────────────────────────────────────────────────────
  // Core State (from useProfileData)
  // ─────────────────────────────────────────────────────────────
  profile: ProfileData | null;
  loading: boolean;
  error: string | null;
  hasMounted: boolean;
  savedThemeId: string;
  refreshProfile: () => Promise<void>;
  clearError: () => void;

  // ─────────────────────────────────────────────────────────────
  // Edit State (from useProfileEdit)
  // ─────────────────────────────────────────────────────────────
  editForm: {
    fullName: string;
    username: string;
    waNumber: string;
    email: string;
    dateOfBirth: string;
  };
  setEditForm: React.Dispatch<
    React.SetStateAction<{
      fullName: string;
      username: string;
      waNumber: string;
      email: string;
      dateOfBirth: string;
    }>
  >;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  startEditing: () => void;
  cancelEditing: () => void;
  validationError: string | null;
  usernameCheckStatus: "idle" | "available" | "taken" | "error";
  usernameCheckLoading: boolean;
  waNumberCheckStatus: "idle" | "available" | "taken" | "error";
  waNumberCheckLoading: boolean;
  checkUsername: (username: string) => void;
  checkWaNumber: (waNumber: string) => void;
  saving: boolean;
  saveError: string | null;
  handleSave: (e: React.FormEvent) => Promise<void>;

  // ─────────────────────────────────────────────────────────────
  // Avatar State (from useAvatarUpload)
  // ─────────────────────────────────────────────────────────────
  avatarLoading: boolean;
  avatarError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  triggerAvatarSelect: () => void;
  handleAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  clearAvatarError: () => void;

  // ─────────────────────────────────────────────────────────────
  // PIN State (from usePinChange)
  // ─────────────────────────────────────────────────────────────
  currentPin: string;
  setCurrentPin: (pin: string) => void;
  newPin: string;
  setNewPin: (pin: string) => void;
  confirmNewPin: string;
  setConfirmNewPin: (pin: string) => void;
  isChangingPin: boolean;
  setIsChangingPin: (changing: boolean) => void;
  pinError: string | null;
  handlePinChange: (e: React.FormEvent) => Promise<void>;
  resetPinForm: () => void;

  // ─────────────────────────────────────────────────────────────
  // Family Management State (from useFamilyManagement)
  // ─────────────────────────────────────────────────────────────
  isManagingFamily: boolean;
  setIsManagingFamily: (managing: boolean) => void;
  showAddMemberForm: boolean;
  setShowAddMemberForm: (show: boolean) => void;
  addMemberForm: {
    fullName: string;
    username: string;
    waNumber: string;
  };
  updateAddMemberForm: (
    field: "fullName" | "username" | "waNumber",
    value: string,
  ) => void;
  addMemberError: string | null;
  addMemberLoading: boolean;
  familyMembers: Array<{
    userId: string;
    fullName: string;
    username: string | null;
    relationship: string;
    isPrimary: boolean;
  }>;
  isHouseholdOwner: boolean;
  familyActionError: string | null;
  handleAddMemberSubmit: (e: React.FormEvent) => Promise<void>;
  handleTransferOwner: (newOwnerUserId: string) => void;
  handleRemoveMember: (memberUserId: string) => void;

  // ─────────────────────────────────────────────────────────────
  // Theme State (from useThemeSelection)
  // ─────────────────────────────────────────────────────────────
  themeSheetOpen: boolean;
  setThemeSheetOpen: (open: boolean) => void;
  openThemeSheet: () => void;
  closeThemeSheet: () => void;
  appearanceSaving: boolean;
  themeSaveError: string | null;
  handleThemeSelect: (themeId: string) => Promise<void>;

  // ─────────────────────────────────────────────────────────────
  // Join Requests State (from useJoinRequests)
  // ─────────────────────────────────────────────────────────────
  pendingForCurrentHouse: PendingJoinRequestItem[];
  respondingRequestId: string | null;
  respondError: string | null;
  handleRespondToJoinRequest: (
    requestId: string,
    action: "approve" | "reject",
  ) => Promise<void>;

  // ─────────────────────────────────────────────────────────────
  // Residence State (from useResidenceSelector)
  // ─────────────────────────────────────────────────────────────
  residences: Array<unknown>;
  currentResidence: unknown;
  selectedResidenceIndex: number;
  setSelectedResidenceIndex: (index: number) => void;
  houseId: string | null;

  // ─────────────────────────────────────────────────────────────
  // Confirm Dialog State (from useConfirmDialog)
  // ─────────────────────────────────────────────────────────────
  confirmDialog: ConfirmDialogState | null;
  openConfirmDialog: (state: any) => void;
  closeConfirmDialog: () => void;

  // ─────────────────────────────────────────────────────────────
  // Auth Actions
  // ─────────────────────────────────────────────────────────────
  handleLogout: () => Promise<void>;
}

export function useProfilePage(): UseProfilePageReturn {
  const router = useRouter();
  const clearUser = useAuthStore((s) => s.clearUser);

  // ─────────────────────────────────────────────────────────────
  // Individual Hooks
  // ─────────────────────────────────────────────────────────────

  // Core profile data
  const profileData = useProfileData();
  const {
    profile,
    loading,
    error,
    hasMounted,
    savedThemeId,
    refreshProfile,
    clearError: clearProfileError,
  } = profileData;

  // Profile editing
  const profileEdit = useProfileEdit({
    profile,
    onSaveSuccess: (updatedProfile) => {
      // Optionally handle save success
    },
  });
  const {
    form: editForm,
    setForm: setEditForm,
    isEditing,
    setIsEditing,
    startEditing,
    cancelEditing,
    validationError,
    usernameCheckStatus,
    usernameCheckLoading,
    waNumberCheckStatus,
    waNumberCheckLoading,
    checkUsername,
    checkWaNumber,
    saving,
    saveError,
    handleSave,
  } = profileEdit;

  // Avatar upload
  const avatarUpload = useAvatarUpload({
    onSuccess: async () => {
      await refreshProfile();
    },
  });
  const {
    loading: avatarLoading,
    error: avatarError,
    fileInputRef,
    triggerFileSelect: triggerAvatarSelect,
    handleFileSelect: handleAvatarChange,
    clearError: clearAvatarError,
  } = avatarUpload;

  // PIN change
  const pinChange = usePinChange({});
  const {
    currentPin,
    setCurrentPin,
    newPin,
    setNewPin,
    confirmNewPin,
    setConfirmNewPin,
    isChangingPin,
    setIsChangingPin,
    pinError,
    handlePinChange,
    resetForm: resetPinForm,
  } = pinChange;

  // Theme selection
  const themeSelection = useThemeSelection({
    currentThemeId: savedThemeId,
    onThemeChange: () => {},
  });
  const {
    themeSheetOpen,
    setThemeSheetOpen,
    openThemeSheet,
    closeThemeSheet,
    appearanceSaving,
    saveError: themeSaveError,
    handleThemeSelect,
  } = themeSelection;

  // Residence selector
  const residenceSelector = useResidenceSelector({
    profile,
    onRefresh: refreshProfile,
  });
  const {
    residences,
    currentResidence,
    selectedResidenceIndex,
    setSelectedResidenceIndex,
    houseId,
  } = residenceSelector;

  // Family management
  const familyManagement = useFamilyManagement({
    profile,
    houseId,
    onSuccess: refreshProfile,
  });
  const {
    isManagingFamily,
    setIsManagingFamily,
    showAddMemberForm,
    setShowAddMemberForm,
    addMemberForm,
    updateAddMemberForm,
    addMemberError,
    addMemberLoading,
    familyMembers,
    isHouseholdOwner,
    familyActionError,
    handleAddMemberSubmit,
    handleTransferOwner,
    handleRemoveMember,
  } = familyManagement;

  // Join requests
  const joinRequests = useJoinRequests({
    profile,
    houseId,
    onSuccess: refreshProfile,
  });
  const {
    pendingForCurrentHouse,
    respondingRequestId,
    respondError,
    handleRespondToJoinRequest,
  } = joinRequests;

  // Confirm dialog
  const confirmDialog = useConfirmDialog();
  const {
    confirmDialog: dialogState,
    openConfirmDialog,
    closeConfirmDialog,
  } = confirmDialog;

  // ─────────────────────────────────────────────────────────────
  // Auth Action
  // ─────────────────────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      clearUser();
      router.replace(ROUTES.LOGIN);
    }
  }, [clearUser, router]);

  // ─────────────────────────────────────────────────────────────
  // Combined Return
  // ─────────────────────────────────────────────────────────────

  return {
    // Core State
    profile,
    loading,
    error,
    hasMounted,
    savedThemeId,
    refreshProfile,
    clearError: clearProfileError,

    // Edit State
    editForm,
    setEditForm,
    isEditing,
    setIsEditing,
    startEditing,
    cancelEditing,
    validationError,
    usernameCheckStatus,
    usernameCheckLoading,
    waNumberCheckStatus,
    waNumberCheckLoading,
    checkUsername,
    checkWaNumber,
    saving,
    saveError,
    handleSave,

    // Avatar State
    avatarLoading,
    avatarError,
    fileInputRef,
    triggerAvatarSelect,
    handleAvatarChange,
    clearAvatarError,

    // PIN State
    currentPin,
    setCurrentPin,
    newPin,
    setNewPin,
    confirmNewPin,
    setConfirmNewPin,
    isChangingPin,
    setIsChangingPin,
    pinError,
    handlePinChange,
    resetPinForm,

    // Theme State
    themeSheetOpen,
    setThemeSheetOpen,
    openThemeSheet,
    closeThemeSheet,
    appearanceSaving,
    themeSaveError,
    handleThemeSelect,

    // Residence State
    residences,
    currentResidence,
    selectedResidenceIndex,
    setSelectedResidenceIndex,
    houseId,

    // Family State
    isManagingFamily,
    setIsManagingFamily,
    showAddMemberForm,
    setShowAddMemberForm,
    addMemberForm,
    updateAddMemberForm,
    addMemberError,
    addMemberLoading,
    familyMembers,
    isHouseholdOwner,
    familyActionError,
    handleAddMemberSubmit,
    handleTransferOwner,
    handleRemoveMember,

    // Join Requests State
    pendingForCurrentHouse,
    respondingRequestId,
    respondError,
    handleRespondToJoinRequest,

    // Confirm Dialog State
    confirmDialog: dialogState,
    openConfirmDialog,
    closeConfirmDialog,

    // Auth
    handleLogout,
  };
}
