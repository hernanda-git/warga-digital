"use client";

import { useState, useCallback } from "react";
import {
  addFamilyMember as addFamilyMemberApi,
  removeFamilyMember as removeFamilyMemberApi,
  transferOwnership as transferOwnershipApi,
} from "@/services/profile/api.service";
import {
  PROFILE_ERROR_MESSAGES,
  FAMILY_MEMBER_LABELS,
} from "@/config/profile";
import type {
  ProfileData,
  FamilyMember,
  AddFamilyMemberFormState,
  ConfirmDialogState,
  HouseId,
  UserId,
} from "@/types/profile";

interface UseFamilyManagementOptions {
  profile: ProfileData | null;
  houseId: string | null;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UseFamilyManagementReturn {
  // State
  isManagingFamily: boolean;
  showAddMemberForm: boolean;
  addMemberForm: AddFamilyMemberFormState;
  addMemberError: string | null;
  addMemberLoading: boolean;
  transferLoadingId: string | null;
  removeLoadingId: string | null;
  familyActionError: string | null;
  confirmDialog: ConfirmDialogState | null;

  // Actions
  setIsManagingFamily: (managing: boolean) => void;
  setShowAddMemberForm: (show: boolean) => void;
  updateAddMemberForm: (field: keyof AddFamilyMemberFormState, value: string) => void;
  resetAddMemberForm: () => void;
  handleAddMemberSubmit: (e: React.FormEvent) => Promise<void>;
  handleTransferOwner: (newOwnerUserId: string) => void;
  handleRemoveMember: (memberUserId: string) => void;
  handleConfirmAction: () => Promise<void>;
  closeConfirmDialog: () => void;
  clearFamilyActionError: () => void;

  // Computed
  familyMembers: FamilyMember[];
  isHouseholdOwner: boolean;
}

/**
 * Hook for managing family/household members
 * Handles adding, removing, and transferring ownership
 */
export function useFamilyManagement(
  options: UseFamilyManagementOptions
): UseFamilyManagementReturn {
  const { profile, houseId, onSuccess, onError } = options;

  // Family management state
  const [isManagingFamily, setIsManagingFamily] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState<AddFamilyMemberFormState>({
    fullName: "",
    username: "",
    waNumber: "",
  });
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  // Action loading states
  const [transferLoadingId, setTransferLoadingId] = useState<string | null>(null);
  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);
  const [familyActionError, setFamilyActionError] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  // Get current residence
  const getCurrentResidence = useCallback(() => {
    if (!profile) return null;
    if (profile.residences && profile.residences.length > 0) {
      return profile.residences[0];
    }
    if (profile.house) {
      return {
        house: profile.house,
        tenant: profile.tenant,
        community: profile.community ?? { id: "", code: "", name: null },
        isPrimary: true,
        roles: profile.roles ?? [],
      };
    }
    return null;
  }, [profile]);

  const currentResidence = getCurrentResidence();
  const currentHouse = currentResidence?.house ?? null;

  // Check if current user is the household owner
  const isHouseholdOwner = Boolean(
    currentHouse?.members?.some(
      (m) => m.userId === profile?.id && m.relationship === "OWNER"
    )
  );

  // Get family members (excluding self)
  const familyMembers: FamilyMember[] = currentHouse?.members?.filter(
    (m) => m.userId !== profile?.id
  ) ?? [];

  /**
   * Update add member form field
   */
  const updateAddMemberForm = useCallback(
    (field: keyof AddFamilyMemberFormState, value: string) => {
      setAddMemberForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  /**
   * Reset add member form
   */
  const resetAddMemberForm = useCallback(() => {
    setAddMemberForm({ fullName: "", username: "", waNumber: "" });
    setAddMemberError(null);
  }, []);

  /**
   * Handle add member form submission
   */
  const handleAddMemberSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAddMemberError(null);

      // Validate
      if (!addMemberForm.fullName.trim()) {
        setAddMemberError(FAMILY_MEMBER_LABELS.FULL_NAME_REQUIRED);
        return;
      }
      if (addMemberForm.fullName.trim().length < 2) {
        setAddMemberError(FAMILY_MEMBER_LABELS.FULL_NAME_MIN_LENGTH);
        return;
      }
      if (!addMemberForm.waNumber.trim()) {
        setAddMemberError(FAMILY_MEMBER_LABELS.WA_NUMBER_REQUIRED);
        return;
      }

      setAddMemberLoading(true);

      try {
        const result = await addFamilyMemberApi({
          fullName: addMemberForm.fullName.trim(),
          username: addMemberForm.username.trim() || undefined,
          waNumber: addMemberForm.waNumber.trim(),
          ...(houseId && { houseId }),
        });

        if (!result.success) {
          const errorMsg = result.error ?? PROFILE_ERROR_MESSAGES.ADD_MEMBER_FAILED;
          setAddMemberError(errorMsg);
          onError?.(errorMsg);
          return;
        }

        // Success - reset form and close
        resetAddMemberForm();
        setShowAddMemberForm(false);
        onSuccess?.();
      } catch (error) {
        const errorMsg = PROFILE_ERROR_MESSAGES.ADD_MEMBER_FAILED;
        setAddMemberError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setAddMemberLoading(false);
      }
    },
    [addMemberForm, houseId, onSuccess, onError, resetAddMemberForm]
  );

  /**
   * Initiate ownership transfer
   */
  const handleTransferOwner = useCallback(
    (newOwnerUserId: string) => {
      if (!houseId) return;

      const member = currentHouse?.members.find((m) => m.userId === newOwnerUserId);
      const memberName = member?.fullName ?? "Anggota ini";

      setConfirmDialog({
        title: FAMILY_MEMBER_LABELS.TRANSFER_OWNER_TITLE,
        message: `${memberName} akan menjadi Kepala Rumah Tangga. Anda akan menjadi anggota keluarga biasa.`,
        confirmLabel: FAMILY_MEMBER_LABELS.TRANSFER_OWNER_CONFIRM,
        onConfirm: async () => {
          setFamilyActionError(null);
          setTransferLoadingId(newOwnerUserId);

          try {
            const result = await transferOwnershipApi(
              houseId as HouseId,
              newOwnerUserId as UserId
            );

            if (!result.success) {
              const errorMsg = result.error ?? PROFILE_ERROR_MESSAGES.TRANSFER_OWNER_FAILED;
              setFamilyActionError(errorMsg);
              onError?.(errorMsg);
            } else {
              setConfirmDialog(null);
              onSuccess?.();
            }
          } catch (error) {
            const errorMsg = PROFILE_ERROR_MESSAGES.TRANSFER_OWNER_FAILED;
            setFamilyActionError(errorMsg);
            onError?.(errorMsg);
          } finally {
            setTransferLoadingId(null);
          }
        },
      });
    },
    [houseId, currentHouse, onSuccess, onError]
  );

  /**
   * Initiate member removal
   */
  const handleRemoveMember = useCallback(
    (memberUserId: string) => {
      if (!houseId) return;

      const member = currentHouse?.members.find((m) => m.userId === memberUserId);
      const memberName = member?.fullName ?? "Anggota ini";

      setConfirmDialog({
        title: FAMILY_MEMBER_LABELS.REMOVE_MEMBER_TITLE,
        message: `${memberName} akan dikeluarkan dan tidak lagi terhubung dengan rumah ini.`,
        confirmLabel: FAMILY_MEMBER_LABELS.REMOVE_MEMBER_CONFIRM,
        danger: true,
        onConfirm: async () => {
          setFamilyActionError(null);
          setRemoveLoadingId(memberUserId);

          try {
            const result = await removeFamilyMemberApi(
              houseId as HouseId,
              memberUserId as UserId
            );

            if (!result.success) {
              const errorMsg = result.error ?? PROFILE_ERROR_MESSAGES.REMOVE_MEMBER_FAILED;
              setFamilyActionError(errorMsg);
              onError?.(errorMsg);
            } else {
              setConfirmDialog(null);
              onSuccess?.();
            }
          } catch (error) {
            const errorMsg = PROFILE_ERROR_MESSAGES.REMOVE_MEMBER_FAILED;
            setFamilyActionError(errorMsg);
            onError?.(errorMsg);
          } finally {
            setRemoveLoadingId(null);
          }
        },
      });
    },
    [houseId, currentHouse, onSuccess, onError]
  );

  /**
   * Execute confirmed action
   */
  const handleConfirmAction = useCallback(async () => {
    if (confirmDialog?.onConfirm) {
      await confirmDialog.onConfirm();
    }
  }, [confirmDialog]);

  /**
   * Close confirmation dialog
   */
  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  /**
   * Clear family action error
   */
  const clearFamilyActionError = useCallback(() => {
    setFamilyActionError(null);
  }, []);

  return {
    // State
    isManagingFamily,
    showAddMemberForm,
    addMemberForm,
    addMemberError,
    addMemberLoading,
    transferLoadingId,
    removeLoadingId,
    familyActionError,
    confirmDialog,

    // Actions
    setIsManagingFamily,
    setShowAddMemberForm,
    updateAddMemberForm,
    resetAddMemberForm,
    handleAddMemberSubmit,
    handleTransferOwner,
    handleRemoveMember,
    handleConfirmAction,
    closeConfirmDialog,
    clearFamilyActionError,

    // Computed
    familyMembers,
    isHouseholdOwner,
  };
}