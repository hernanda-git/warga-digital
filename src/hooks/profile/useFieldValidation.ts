
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ValidationStatus } from "@/types/profile";
import { DEBOUNCE_MS } from "@/config/profile";
import {
  checkUsernameAvailability,
  checkWaNumberAvailability,
} from "@/services/profile/api.service";

interface UseFieldValidationOptions {
  /** Debounce delay in milliseconds */
  debounceMs?: number;
}

interface UseFieldValidationReturn {
  // Username validation
  usernameStatus: ValidationStatus;
  usernameLoading: boolean;
  usernameError: string | null;
  validateUsername: (username: string) => void;
  resetUsername: () => void;

  // WA number validation
  waNumberStatus: ValidationStatus;
  waNumberLoading: boolean;
  waNumberError: string | null;
  validateWaNumber: (waNumber: string) => void;
  resetWaNumber: () => void;

  // Bulk reset
  resetAll: () => void;
}

/**
 * Hook for field-level validation with debounced availability checks
 *
 * @example
 * ```tsx
 * const {
 *   usernameStatus,
 *   usernameLoading,
 *   validateUsername,
 *   waNumberStatus,
 *   waNumberLoading,
 *   validateWaNumber,
 * } = useFieldValidation();
 *
 * // In your input onChange:
 * validateUsername(value);
 * validateWaNumber(value);
 * ```
 */
export function useFieldValidation(
  options: UseFieldValidationOptions = {}
): UseFieldValidationReturn {
  const debounceMs = options.debounceMs ?? DEBOUNCE_MS;

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<ValidationStatus>(ValidationStatus.IDLE);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // WA number validation state
  const [waNumberStatus, setWaNumberStatus] = useState<ValidationStatus>(ValidationStatus.IDLE);
  const [waNumberLoading, setWaNumberLoading] = useState(false);
  const [waNumberError, setWaNumberError] = useState<string | null>(null);

  // Debounce timers
  const usernameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const waNumberTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current);
      if (waNumberTimerRef.current) clearTimeout(waNumberTimerRef.current);
    };
  }, []);

  /**
   * Validate username with debounce
   */
  const validateUsername = useCallback(
    (username: string) => {
      // Clear previous timer
      if (usernameTimerRef.current) {
        clearTimeout(usernameTimerRef.current);
      }

      // Reset if empty
      if (!username.trim()) {
        setUsernameStatus(ValidationStatus.IDLE);
        setUsernameError(null);
        return;
      }

      // Debounce the check
      usernameTimerRef.current = setTimeout(async () => {
        setUsernameLoading(true);
        setUsernameError(null);

        try {
          const result = await checkUsernameAvailability(username.trim());

          if (result.success) {
            setUsernameStatus(result.data.available ? ValidationStatus.AVAILABLE : ValidationStatus.TAKEN);
          } else {
            setUsernameStatus(ValidationStatus.ERROR);
            setUsernameError(result.error ?? "Gagal memeriksa username");
          }
        } catch {
          setUsernameStatus(ValidationStatus.ERROR);
          setUsernameError("Terjadi kesalahan saat memeriksa username");
        } finally {
          setUsernameLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  /**
   * Validate WA number with debounce
   */
  const validateWaNumber = useCallback(
    (waNumber: string) => {
      // Clear previous timer
      if (waNumberTimerRef.current) {
        clearTimeout(waNumberTimerRef.current);
      }

      // Reset if empty
      if (!waNumber.trim()) {
        setWaNumberStatus(ValidationStatus.IDLE);
        setWaNumberError(null);
        return;
      }

      // Debounce the check
      waNumberTimerRef.current = setTimeout(async () => {
        setWaNumberLoading(true);
        setWaNumberError(null);

        try {
          const result = await checkWaNumberAvailability(waNumber.trim());

          if (result.success) {
            setWaNumberStatus(result.data.available ? ValidationStatus.AVAILABLE : ValidationStatus.TAKEN);
          } else {
            setWaNumberStatus(ValidationStatus.ERROR);
            setWaNumberError(result.error ?? "Gagal memeriksa nomor WhatsApp");
          }
        } catch {
          setWaNumberStatus(ValidationStatus.ERROR);
          setWaNumberError("Terjadi kesalahan saat memeriksa nomor WhatsApp");
        } finally {
          setWaNumberLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs]
  );

  /**
   * Reset username validation state
   */
  const resetUsername = useCallback(() => {
    if (usernameTimerRef.current) {
      clearTimeout(usernameTimerRef.current);
    }
    setUsernameStatus(ValidationStatus.IDLE);
    setUsernameLoading(false);
    setUsernameError(null);
  }, []);

  /**
   * Reset WA number validation state
   */
  const resetWaNumber = useCallback(() => {
    if (waNumberTimerRef.current) {
      clearTimeout(waNumberTimerRef.current);
    }
    setWaNumberStatus(ValidationStatus.IDLE);
    setWaNumberLoading(false);
    setWaNumberError(null);
  }, []);

  /**
   * Reset all validation state
   */
  const resetAll = useCallback(() => {
    resetUsername();
    resetWaNumber();
  }, [resetUsername, resetWaNumber]);

  return {
    // Username
    usernameStatus,
    usernameLoading,
    usernameError,
    validateUsername,
    resetUsername,
    // WA Number
    waNumberStatus,
    waNumberLoading,
    waNumberError,
    validateWaNumber,
    resetWaNumber,
    // Bulk
    resetAll,
  };
}
