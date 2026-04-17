/**
 * useProfileData Hook
 *
 * Custom hook for managing user profile data on the landing page.
 * Following SOLID principles:
 * - Single Responsibility: Only handles profile data fetching and state
 * - Dependency Inversion: Uses service layer instead of direct API calls
 * - Interface Segregation: Returns only what consumers need
 *
 * Features:
 * - Fetches profile data from API
 * - Caches header profile in cookies for faster initial render
 * - Manages wallet balance separately (not cached)
 * - Handles community info and cookie updates
 * - Provides loading and error states
 */

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { fetchProfile } from "@/services/landing/api.service";
import {
  transformProfileToHeader,
  extractWalletBalance,
  extractCommunityInfo,
  isValidProfile,
} from "@/services/landing/transformers";
import { updateCommunityCookies } from "@/services/landing/cookie.service";
import {
  getHeaderProfileCookie,
  setHeaderProfileCookie,
} from "@/lib/header-profile-cookie";
import { FEATURE_FLAGS, UI_CONFIG } from "@/config/landing";
import type { HeaderProfile } from "@/types/landing";

// ─── Hook Return Type ─────────────────────────────────────────────────────────

export interface UseProfileDataReturn {
  /** Header profile display data (name, avatar, blok) */
  headerProfile: HeaderProfile | null;
  /** Formatted wallet balance string */
  walletBalance: string;
  /** Whether profile data is currently loading */
  isLoading: boolean;
  /** Whether initial profile is ready (either from cache or API) */
  isReady: boolean;
  /** Error message if profile fetch failed */
  error: string | null;
  /** Function to manually refresh profile data */
  refresh: () => Promise<void>;
}

// ─── Hook Implementation ──────────────────────────────────────────────────────

/**
 * Hook for managing profile data on landing page
 *
 * @returns Profile state and operations
 *
 * @example
 * function LandingPage() {
 *   const { headerProfile, walletBalance, isReady } = useProfileData();
 *
 *   if (!isReady) {
 *     return <PageLoader />;
 *   }
 *
 *   return <LandingHeader {...headerProfile} saldo={walletBalance} />;
 * }
 */
export function useProfileData(): UseProfileDataReturn {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // ── State ──────────────────────────────────────────────────────────────────
  const [headerProfile, setHeaderProfile] = useState<HeaderProfile | null>(
    null,
  );
  const [walletBalance, setWalletBalance] = useState<string>(
    UI_CONFIG.DEFAULT_WALLET_BALANCE,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch Profile ─────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await fetchProfile();

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      // If we already have cached data, keep isReady true
      if (isValidProfile(headerProfile)) {
        setIsReady(true);
      }
      return;
    }

    const profile = result.data;

    // Transform API response to UI model
    const transformedProfile = transformProfileToHeader(
      profile,
      user?.fullName,
    );

    // Update state
    setHeaderProfile(transformedProfile);
    setIsReady(true);

    // Cache header profile for faster subsequent loads
    if (FEATURE_FLAGS.ENABLE_PROFILE_CACHE) {
      setHeaderProfileCookie(transformedProfile);
    }

    // Update wallet balance (always from fresh API response, never cached)
    const balance = extractWalletBalance(profile);
    setWalletBalance(balance);

    // Handle community cookies
    if (FEATURE_FLAGS.ENABLE_COMMUNITY_COOKIES) {
      const communityInfo = extractCommunityInfo(profile);
      updateCommunityCookies(communityInfo);
    }

    setIsLoading(false);
  }, [headerProfile, user?.fullName]);

  // ── Load Cached Profile on Mount ──────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !FEATURE_FLAGS.ENABLE_PROFILE_CACHE) {
      return;
    }

    // Try to load from cookie for instant display
    const cachedProfile = getHeaderProfileCookie();
    if (cachedProfile && isValidProfile(cachedProfile)) {
      setHeaderProfile(cachedProfile);
      setIsReady(true);
    }
  }, [isAuthenticated]);

  // ── Fetch Fresh Profile ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      // Reset state when not authenticated
      setHeaderProfile(null);
      setWalletBalance(UI_CONFIG.DEFAULT_WALLET_BALANCE);
      setIsReady(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const result = await fetchProfile();

      if (cancelled) {
        return;
      }

      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        // Keep cached data if available
        return;
      }

      const profile = result.data;

      // Transform and update state
      const transformedProfile = transformProfileToHeader(
        profile,
        user?.fullName,
      );

      setHeaderProfile(transformedProfile);
      setIsReady(true);

      // Cache for next time
      if (FEATURE_FLAGS.ENABLE_PROFILE_CACHE) {
        setHeaderProfileCookie(transformedProfile);
      }

      // Update wallet balance (not cached)
      const balance = extractWalletBalance(profile);
      setWalletBalance(balance);

      // Update community cookies
      if (FEATURE_FLAGS.ENABLE_COMMUNITY_COOKIES) {
        const communityInfo = extractCommunityInfo(profile);
        updateCommunityCookies(communityInfo);
      }

      setIsLoading(false);
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.fullName]);

  // ── Return Hook API ───────────────────────────────────────────────────────
  return {
    headerProfile,
    walletBalance,
    isLoading,
    isReady,
    error,
    refresh: loadProfile,
  };
}
