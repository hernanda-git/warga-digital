"use client";

import { useState, useCallback } from "react";
import { changePin as changePinApi } from "@/services/profile/api.service";
import { PIN_CONFIG, PROFILE_ERROR_MESSAGES } from "@/config/profile";
import type { PinChangeFormState } from "@/types/profile";

// Validation result type
interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface UsePinChangeOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UsePinChangeReturn {
  // Form state
  currentPin: string;
  setCurrentPin: (pin: string) => void;
  newPin: string;
  setNewPin: (pin: string) => void;
  confirmNewPin: string;
  setConfirmNewPin: (pin: string) => void;

  // UI state
  isChangingPin: boolean;
  setIsChangingPin: (changing: boolean) => void;

  // Validation
  pinError: string | null;
  validatePins: () => ValidationResult;

  // Actions
  handlePinChange: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
  clearError: () => void;

  // State
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing PIN change functionality
 *
 * @example
 * ```tsx
 * const { handlePinChange, loading, error } = usePinChange({
 *   onSuccess: () => {
 *     setIsChangingPin(false);
 *     showToast('PIN berhasil diubah');
 *   }
 * });
 * ```
 */
export function usePinChange(
  options: UsePinChangeOptions = {}
): UsePinChangeReturn {
  const { onSuccess, onError } = options;

  // Form state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");

  // UI state
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate PIN inputs
   * - All PINs must be exactly 4 digits
   * - newPIN and confirmNewPIN must match
   */
  const validatePins = useCallback((): ValidationResult => {
    // Check PIN lengths
    if (
      currentPin.length !== PIN_CONFIG.LENGTH ||
      newPin.length !== PIN_CONFIG.LENGTH ||
      confirmNewPin.length !== PIN_CONFIG.LENGTH
    ) {
      return {
        valid: false,
        error: `Semua PIN harus ${PIN_CONFIG.LENGTH} digit.`,
      };
    }

    // Check if new PIN and confirm match
    if (newPin !== confirmNewPin) {
      return {
        valid: false,
        error: "PIN baru dan konfirmasi PIN tidak sama.",
      };
    }

    return { valid: true };
  }, [currentPin, newPin, confirmNewPin]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setPinError(null);
    setError(null);
  }, []);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setCurrentPin("");
    setNewPin("");
    setConfirmNewPin("");
    setPinError(null);
    setError(null);
  }, []);

  /**
   * Handle PIN change form submission
   */
  const handlePinChange = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      clearError();

      // Validate
      const validation = validatePins();
      if (!validation.valid) {
        setPinError(validation.error ?? PROFILE_ERROR_MESSAGES.PIN_VALIDATION_FAILED);
        return;
      }

      setLoading(true);

      try {
        const result = await changePinApi(
          currentPin,
          newPin,
          confirmNewPin
        );

        if (!result.success) {
          const errorMsg = result.error ?? PROFILE_ERROR_MESSAGES.PIN_CHANGE_FAILED;
          setPinError(errorMsg);
          onError?.(errorMsg);
          return;
        }

        // Success - reset form and close modal
        resetForm();
        setIsChangingPin(false);
        onSuccess?.();
      } catch (err) {
        const errorMsg = PROFILE_ERROR_MESSAGES.PIN_CHANGE_FAILED;
        setPinError(errorMsg);
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [currentPin, newPin, confirmNewPin, validatePins, clearError, resetForm, onSuccess, onError]
  );

  return {
    // Form state
    currentPin,
    setCurrentPin,
    newPin,
    setNewPin,
    confirmNewPin,
    setConfirmNewPin,

    // UI state
    isChangingPin,
    setIsChangingPin,

    // Validation
    pinError,
    validatePins,

    // Actions
    handlePinChange,
    resetForm,
    clearError,

    // State
    loading,
    error,
  };
}
