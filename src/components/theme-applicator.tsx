"use client";

import { useEffect } from "react";

import {
  applyThemeToDocument,
  useAppearanceStore,
} from "@/stores/appearance-store";
import { getThemeCookie } from "@/lib/theme-cookie";

/**
 * ThemeApplicator
 *
 * Applies the user's selected theme to the document whenever `themeId` changes.
 *
 * HYDRATION STRATEGY
 * ────────────────────
 * The initial theme application is handled by the Zustand store's
 * `onRehydrateStorage` callback (see `src/stores/appearance-store.ts`).
 * This component does NOT read from localStorage directly — that would
 * cause a race condition where the theme is applied twice:
 *   1. Store's onRehydrateStorage fires → applies theme
 *   2. Component's useEffect fires → reads localStorage → applies theme again
 *
 * Instead, this component only reacts to changes in the store's `themeId`
 * state, which is already populated correctly by the store's persist middleware.
 */

export function ThemeApplicator() {
  const themeId = useAppearanceStore((s) => s.themeId);

  useEffect(() => {
    // Apply theme whenever themeId changes (including after store hydration).

    // The store's onRehydrateStorage handles the very first application,

    // but this effect ensures consistency if the store rehydrates after

    // the component mounts.

    applyThemeToDocument(themeId);
  }, [themeId]);

  useEffect(() => {
    // On first mount (before Zustand hydrates), check cookie for immediate theme.

    // This ensures the theme is applied instantly on first visit from a link
    // or bookmark, even before localStorage hydration completes.
    const cookieThemeId = getThemeCookie();

    if (cookieThemeId) {
      applyThemeToDocument(cookieThemeId);
    }
  }, []);

  // This component renders nothing — it exists purely for its side-effect.

  return null;
}
