"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ProfileData, ProfileResidence } from "@/types/profile";

interface UseResidenceSelectorOptions {
  /** Current profile data */
  profile?: ProfileData | null;
  /** Callback when selected residence changes */
  onResidenceChange?: (
    residence: ProfileResidence | null,
    index: number,
  ) => void;
  /** Callback to refresh profile */
  onRefresh?: () => void;
}

interface UseResidenceSelectorReturn {
  // State
  selectedResidenceIndex: number;
  setSelectedResidenceIndex: (index: number) => void;

  // Computed values
  residences: ProfileResidence[];
  currentResidence: ProfileResidence | null;
  currentHouse: ProfileResidence["house"] | null;
  houseId: string | null;
  hasMultipleResidences: boolean;
  totalResidences: number;

  // Helpers
  selectNextResidence: () => void;
  selectPreviousResidence: () => void;
  resetToPrimaryResidence: () => void;
}

/**
 * Hook for managing residence selection in multi-residence profiles
 *
 * @example
 * ```tsx
 * const {
 *   selectedResidenceIndex,
 *   setSelectedResidenceIndex,
 *   currentResidence,
 *   currentHouse,
 *   houseId,
 *   hasMultipleResidences,
 * } = useResidenceSelector({ profile });
 *
 * // Use in component
 * {hasMultipleResidences && (
 *   <ResidenceSelector
 *     residences={residences}
 *     selectedIndex={selectedResidenceIndex}
 *     onSelect={setSelectedResidenceIndex}
 *   />
 * )}
 * ```
 */
export function useResidenceSelector(
  options: UseResidenceSelectorOptions = {},
): UseResidenceSelectorReturn {
  const { profile, onResidenceChange } = options;

  // Selected residence index
  const [selectedResidenceIndex, setSelectedResidenceIndex] = useState(0);

  // Reset index when residences change
  useEffect(() => {
    if (profile?.residences && profile.residences.length > 0) {
      if (selectedResidenceIndex >= profile.residences.length) {
        setSelectedResidenceIndex(0);
      }
    }
  }, [profile?.residences, selectedResidenceIndex]);

  // Get residences from profile
  const residences: ProfileResidence[] = useMemo(() => {
    if (!profile) return [];

    // If profile has residences array, use it
    if (profile.residences && profile.residences.length > 0) {
      return profile.residences;
    }

    // Otherwise, construct from house/tenant/community
    if (profile.house && profile.tenant) {
      return [
        {
          tenant: profile.tenant,
          community: profile.community ?? { id: "", code: "", name: null },
          house: profile.house,
          isPrimary: true,
          roles: profile.roles ?? [],
        },
      ];
    }

    return [];
  }, [profile]);

  // Get current residence
  const currentResidence: ProfileResidence | null = useMemo(() => {
    if (residences.length === 0) return null;
    return residences[selectedResidenceIndex] ?? residences[0] ?? null;
  }, [residences, selectedResidenceIndex]);

  // Get current house
  const currentHouse: ProfileResidence["house"] | null =
    currentResidence?.house ?? null;

  // Get house ID
  const houseId: string | null = currentHouse?.houseId ?? null;

  // Check if user has multiple residences
  const hasMultipleResidences: boolean = residences.length > 1;

  // Total residences count
  const totalResidences: number = residences.length;

  /**
   * Select next residence
   */
  const selectNextResidence = useCallback(() => {
    if (residences.length <= 1) return;
    setSelectedResidenceIndex((prev) => (prev + 1) % residences.length);
  }, [residences.length]);

  /**
   * Select previous residence
   */
  const selectPreviousResidence = useCallback(() => {
    if (residences.length <= 1) return;
    setSelectedResidenceIndex(
      (prev) => (prev - 1 + residences.length) % residences.length,
    );
  }, [residences.length]);

  /**
   * Reset to primary residence (first one)
   */
  const resetToPrimaryResidence = useCallback(() => {
    setSelectedResidenceIndex(0);
  }, []);

  // Notify parent of changes
  useEffect(() => {
    if (onResidenceChange) {
      onResidenceChange(currentResidence, selectedResidenceIndex);
    }
  }, [currentResidence, selectedResidenceIndex, onResidenceChange]);

  return {
    // State
    selectedResidenceIndex,
    setSelectedResidenceIndex,

    // Computed values
    residences,
    currentResidence,
    currentHouse,
    houseId,
    hasMultipleResidences,
    totalResidences,

    // Helpers
    selectNextResidence,
    selectPreviousResidence,
    resetToPrimaryResidence,
  };
}
