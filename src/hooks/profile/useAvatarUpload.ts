"use client";

import { useState, useCallback, useRef } from "react";
import { uploadAvatar as uploadAvatarApi } from "@/services/profile/api.service";
import { AVATAR_CONFIG, PROFILE_ERROR_MESSAGES } from "@/config/profile";
import type { ApiResult } from "@/services/landing/api.service";

/**
 * Hook for handling avatar upload functionality
 *
 * @example
 * ```tsx
 * const { uploadAvatar, loading, error, fileInputRef } = useAvatarUpload({
 *   onSuccess: (url) => {
 *     setProfile(prev => prev ? { ...prev, profilePictureUrl: url } : null);
 *   }
 * });
 * ```
 */
export interface UseAvatarUploadOptions {
  /** Callback when avatar upload succeeds */
  onSuccess?: (profilePictureUrl: string) => void;
  /** Callback when avatar upload fails */
  onError?: (error: string) => void;
}

export interface UseAvatarUploadReturn {
  /** Whether an upload is in progress */
  loading: boolean;
  /** Error message if upload failed */
  error: string | null;
  /** Ref to attach to the file input element */
  fileInputRef: React.RefObject<HTMLInputElement>;
  /** Trigger file input click */
  triggerFileSelect: () => void;
  /** Handle file selection and upload */
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Clear error state */
  clearError: () => void;
}

/**
 * Custom hook for avatar upload with validation and error handling
 *
 * Features:
 * - File type validation
 * - File size validation
 * - Loading state management
 * - Error handling
 * - Cleanup on unmount
 */
export function useAvatarUpload(
  options: UseAvatarUploadOptions = {},
): UseAvatarUploadReturn {
  const { onSuccess, onError } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(
    null,
  ) as React.RefObject<HTMLInputElement>;

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    const allowedTypes = AVATAR_CONFIG.ALLOWED_TYPES as readonly string[];
    if (!allowedTypes.includes(file.type)) {
      return "Format file tidak didukung. Gunakan JPG, PNG, WebP, atau HEIC.";
    }

    // Check file size
    if (file.size > AVATAR_CONFIG.MAX_SIZE_BYTES) {
      const maxSizeMB = AVATAR_CONFIG.MAX_SIZE_MB;
      return `Ukuran file terlalu besar. Maksimal ${maxSizeMB}MB.`;
    }

    return null;
  }, []);

  /**
   * Trigger file input click
   */
  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Handle file selection and upload
   */
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = ""; // Reset input

      if (!file) return;

      // Validate
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        onError?.(validationError);
        return;
      }

      // Upload
      setLoading(true);
      setError(null);

      try {
        const result = await uploadAvatarApi(file);

        if (!result.success) {
          const errorMsg =
            result.error || PROFILE_ERROR_MESSAGES.AVATAR_UPLOAD_FAILED;
          setError(errorMsg);
          onError?.(errorMsg);
          return;
        }

        const profilePictureUrl = result.data.profilePictureUrl;
        if (profilePictureUrl) {
          onSuccess?.(profilePictureUrl);
        }
      } catch (err) {
        const errorMsg = PROFILE_ERROR_MESSAGES.AVATAR_UPLOAD_FAILED;
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [validateFile, onSuccess, onError],
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    fileInputRef,
    triggerFileSelect,
    handleFileSelect,
    clearError,
  };
}
