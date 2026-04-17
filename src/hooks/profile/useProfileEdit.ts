"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { ProfileData, ProfileEditFormState, ValidationState, ValidationStatus } from "@/types/profile";
import { VALIDATION_RULES, PROFILE_ERROR_MESSAGES, DEBOUNCE_MS } from "@/config/profile";
import { updateProfile, checkUsernameAvailability, checkWaNumberAvailability } from "@/services/profile/api.service";
import { toDateInputValue } from "@/services/profile/transformers";
import { validateProfileUpdate } from "@/services/profile/validation.service";

interface UseProfileEditOptions {
  profile: ProfileData | null;
  onSaveSuccess?: (updatedProfile: ProfileData) => void;
  onError?: (error: string) => void;
}

interface UseProfileEditReturn {
  // Form state
  form: ProfileEditFormState;
  setForm: React.Dispatch<React.SetStateAction<ProfileEditFormState>>;

  // Edit mode
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  startEditing: () => void;
  cancelEditing: () => void;

  // Validation state
  validation: ValidationState;
  validationError: string | null;

  // Username check
  usernameCheckStatus: "idle" | "available" | "taken" | "error";
  usernameCheckLoading: boolean;
  checkUsername: (username: string) => void;

  // WA number check
  waNumberCheckStatus: "idle" | "available" | "taken" | "error";
  waNumberCheckLoading: boolean;
  checkWaNumber: (waNumber: string) => void;

  // Save state
  saving: boolean;
  saveError: string | null;
  handleSave: (e: React.FormEvent) => Promise<void>;

  // Reset
  resetForm: () => void;
}

/**
 * Hook for managing profile editing functionality
 * Handles form state, validation, availability checks, and save operations
 */
export function useProfileEdit({
  profile,
  onSaveSuccess,
  onError,
}: UseProfileEditOptions): UseProfileEditReturn {
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [form, setForm] = useState<ProfileEditFormState>({
    fullName: "",
    username: "",
    waNumber: "",
    email: "",
    dateOfBirth: "",
  });

  // Validation state
  const [validation, setValidation] = useState<ValidationState>({
    username: { isLoading: false, status: ValidationStatus.IDLE },
    waNumber: { isLoading: false, status: ValidationStatus.IDLE },
    error: null,
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  // Username check
  const [usernameCheckStatus, setUsernameCheckStatus] = useState<"idle" | "available" | "taken" | "error">("idle");
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);

  // WA number check
  const [waNumberCheckStatus, setWaNumberCheckStatus] = useState<"idle" | "available" | "taken" | "error">("idle");
  const [waNumberCheckLoading, setWaNumberCheckLoading] = useState(false);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Debounce timers
  const [usernameDebounce, setUsernameDebounce] = useState<NodeJS.Timeout | null>(null);
  const [waNumberDebounce, setWaNumberDebounce] = useState<NodeJS.Timeout | null>(null);

  // Set user in auth store
  const setUser = useAuthStore((s) => s.setUser);

  // Initialize form when profile changes
  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName ?? "",
        username: profile.username ?? "",
        waNumber: profile.waNumber ?? "",
        email: profile.email ?? "",
        dateOfBirth: toDateInputValue(profile.dateOfBirth),
      });
    }
  }, [profile]);

  // Start editing - populate form with current profile data
  const startEditing = useCallback(() => {
    if (!profile) return;
    setForm({
      fullName: profile.fullName ?? "",
      username: profile.username ?? "",
      waNumber: profile.waNumber ?? "",
      email: profile.email ?? "",
      dateOfBirth: toDateInputValue(profile.dateOfBirth),
    });
    setValidation({
      username: { isLoading: false, status: ValidationStatus.IDLE },
      waNumber: { isLoading: false, status: ValidationStatus.IDLE },
      error: null,
    });
    setValidationError(null);
    setUsernameCheckStatus("idle");
    setWaNumberCheckStatus("idle");
    setIsEditing(true);
  }, [profile]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setValidationError(null);
    if (profile) {
      setForm({
        fullName: profile.fullName ?? "",
        username: profile.username ?? "",
        waNumber: profile.waNumber ?? "",
        email: profile.email ?? "",
        dateOfBirth: toDateInputValue(profile.dateOfBirth),
      });
    }
  }, [profile]);

  // Check username availability with debounce
  const checkUsername = useCallback((username: string) => {
    if (usernameDebounce) clearTimeout(usernameDebounce);

    if (!username.trim()) {
      setUsernameCheckStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameCheckLoading(true);
      setUsernameCheckStatus("idle");

      try {
        const result = await checkUsernameAvailability(username.trim());
        if (result.success) {
          setUsernameCheckStatus(result.data.available ? "available" : "taken");
        } else {
          setUsernameCheckStatus("error");
        }
      } catch {
        setUsernameCheckStatus("error");
      } finally {
        setUsernameCheckLoading(false);
      }
    }, DEBOUNCE_MS);

    setUsernameDebounce(timer);
  }, [usernameDebounce]);

  // Check WA number availability with debounce
  const checkWaNumber = useCallback((waNumber: string) => {
    if (waNumberDebounce) clearTimeout(waNumberDebounce);

    if (!waNumber.trim()) {
      setWaNumberCheckStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      setWaNumberCheckLoading(true);
      setWaNumberCheckStatus("idle");

      try {
        const result = await checkWaNumberAvailability(waNumber.trim());
        if (result.success) {
          setWaNumberCheckStatus(result.data.available ? "available" : "taken");
        } else {
          setWaNumberCheckStatus("error");
        }
      } catch {
        setWaNumberCheckStatus("error");
      } finally {
        setWaNumberCheckLoading(false);
      }
    }, DEBOUNCE_MS);

    setWaNumberDebounce(timer);
  }, [waNumberDebounce]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName ?? "",
        username: profile.username ?? "",
        waNumber: profile.waNumber ?? "",
        email: profile.email ?? "",
        dateOfBirth: toDateInputValue(profile.dateOfBirth),
      });
    }
    setValidation({
      username: { isLoading: false, status: ValidationStatus.IDLE },
      waNumber: { isLoading: false, status: ValidationStatus.IDLE },
      error: null,
    });
    setValidationError(null);
    setSaveError(null);
  }, [profile]);

  // Handle save
  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setValidationError(null);

    // Validate form
    const validationResult = validateProfileUpdate({
      fullName: form.fullName,
      username: form.username,
      waNumber: form.waNumber,
      email: form.email,
      dateOfBirth: form.dateOfBirth,
    });

    if (!validationResult.valid) {
      setValidationError(validationResult.error ?? PROFILE_ERROR_MESSAGES.VALIDATION_FAILED);
      return;
    }

    // Check availability if changed
    const hasUsername = form.username.trim().length > 0;
    const hasWaNumber = form.waNumber.trim().length > 0;

    if (hasUsername && form.username !== profile?.username && usernameCheckStatus === "taken") {
      setValidationError(PROFILE_ERROR_MESSAGES.VALIDATION_USERNAME_TAKEN);
      return;
    }

    if (hasWaNumber && form.waNumber !== profile?.waNumber && waNumberCheckStatus === "taken") {
      setValidationError(PROFILE_ERROR_MESSAGES.VALIDATION_WA_NUMBER_TAKEN);
      return;
    }

    setSaving(true);

    try {
      const result = await updateProfile({
        full_name: form.fullName.trim(),
        username: form.username.trim() || null,
        wa_number: form.waNumber.trim() || null,
        email: form.email.trim() || null,
        date_of_birth: form.dateOfBirth || null,
      });

      if (!result.success) {
        const errorMsg = result.error ?? PROFILE_ERROR_MESSAGES.SAVE_FAILED;
        setSaveError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      // Update auth store
      if (profile && result.data.profile.fullName) {
        setUser({ id: profile.id, fullName: result.data.profile.fullName });
      }

      // Update profile state with new data
      const updatedProfile: ProfileData = {
        ...(profile ?? {}),
        fullName: result.data.profile.fullName,
        username: result.data.profile.username,
        waNumber: result.data.profile.waNumber,
        waNumberMasked: result.data.profile.waNumber,
        email: result.data.profile.email,
        dateOfBirth: result.data.profile.dateOfBirth,
      } as ProfileData;

      onSaveSuccess?.(updatedProfile);
      setIsEditing(false);
    } catch (error) {
      const errorMsg = PROFILE_ERROR_MESSAGES.SAVE_FAILED;
      setSaveError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setSaving(false);
    }
  }, [form, profile, usernameCheckStatus, waNumberCheckStatus, setUser, onSaveSuccess, onError]);

  // Cleanup debounce timers
  useEffect(() => {
    return () => {
      if (usernameDebounce) clearTimeout(usernameDebounce);
      if (waNumberDebounce) clearTimeout(waNumberDebounce);
    };
  }, [usernameDebounce, waNumberDebounce]);

  return {
    form,
    setForm,
    isEditing,
    setIsEditing,
    startEditing,
    cancelEditing,
    validation,
    validationError,
    usernameCheckStatus,
    usernameCheckLoading,
    checkUsername,
    waNumberCheckStatus,
    waNumberCheckLoading,
    checkWaNumber,
    saving,
    saveError,
    handleSave,
    resetForm,
  };
}
