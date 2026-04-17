"use client";

import { useState, useCallback } from "react";
import { useAppearanceStore } from "@/stores/appearance-store";
import { setThemeCookie } from "@/lib/theme-cookie";
import { updateTheme } from "@/services/profile/api.service";
import { PROFILE_ERROR_MESSAGES } from "@/config/profile";
import type { ApiResult } from "@/services/landing/api.service";

/**
 * Hook for managing theme selection functionality
 *
 * @example
 * ```tsx
 * const {
 *   themeSheetOpen,
 *   setThemeSheetOpen,
 *   appearanceSaving,
 *   handleThemeSelect,
 * } = useThemeSelection({
 *   currentThemeId: profile?.themeId ?? "green",
 *   onThemeChange: (themeId) => setProfile(prev => prev ? { ...prev, themeId } : null),
 * });
 * ```
 */
interface UseThemeSelectionOptions {
  /** Current theme ID from profile */
  currentThemeId?: string;
  /** Callback when theme is successfully changed */
  onThemeChange?: (themeId: string) => void;
}

interface UseThemeSelectionReturn {
  /** Whether the theme selection sheet is open */
  themeSheetOpen: boolean;
  /** Set theme sheet open state */
  setThemeSheetOpen: (open: boolean) => void;
  /** Open the theme sheet */
  openThemeSheet: () => void;
  /** Close the theme sheet */
  closeThemeSheet: () => void;
  /** Whether theme is being saved */
  appearanceSaving: boolean;
  /** Select and apply a theme */
  handleThemeSelect: (themeId: string) => Promise<void>;
  /** Save error if any */
  saveError: string | null;
  /** Clear save error */
  clearError: () => void;
}

/**
 * Custom hook for theme selection with persistence
 *
 * Features:
 * - Theme sheet open/close state
 * - Loading state during save
 * - Error handling
 * - Cookie and store synchronization
 */
export function useThemeSelection(
  options: UseThemeSelectionOptions = {},
): UseThemeSelectionReturn {
  const { currentThemeId = "green", onThemeChange } = options;

  // Theme sheet visibility
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);

  // Save state
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Appearance store
  const setThemeId = useAppearanceStore((s) => s.setThemeId);

  /**
   * Open theme sheet
   */
  const openThemeSheet = useCallback(() => {
    setThemeSheetOpen(true);
  }, []);

  /**
   * Close theme sheet
   */
  const closeThemeSheet = useCallback(() => {
    setThemeSheetOpen(false);
  }, []);

  /**
   * Select and save a theme
   */
  const handleThemeSelect = useCallback(
    async (themeId: string) => {
      setAppearanceSaving(true);
      setSaveError(null);

      try {
        const result = await updateTheme(themeId);

        if (!result.success) {
          const errorMsg =
            result.error ?? PROFILE_ERROR_MESSAGES.THEME_UPDATE_FAILED;
          setSaveError(errorMsg);
          return;
        }

        // Update appearance store
        setThemeId(themeId);

        // Persist to cookie
        setThemeCookie(themeId);

        // Notify parent
        onThemeChange?.(themeId);

        // Close sheet
        setThemeSheetOpen(false);
      } catch (error) {
        setSaveError(PROFILE_ERROR_MESSAGES.THEME_UPDATE_FAILED);
      } finally {
        setAppearanceSaving(false);
      }
    },
    [setThemeId, onThemeChange],
  );

  /**
   * Clear save error
   */
  const clearError = useCallback(() => {
    setSaveError(null);
  }, []);

  return {
    themeSheetOpen,
    setThemeSheetOpen,
    openThemeSheet,
    closeThemeSheet,
    appearanceSaving,
    handleThemeSelect,
    saveError,
    clearError,
  };
}
