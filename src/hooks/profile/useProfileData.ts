"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useAppearanceStore } from "@/stores/appearance-store";
import {
  fetchProfile,
} from "@/services/profile/api.service";
import type { ApiResult } from "@/services/landing/api.service";
import type { ProfileData } from "@/types/profile";

type FetchProfileResult = ApiResult<ProfileData>;

import {
  setHeaderProfileCookie,
  getHeaderProfileCookie,
} from "@/lib/header-profile-cookie";
import { setThemeCookie } from "@/lib/theme-cookie";
import { toDateInputValue } from "@/services/profile/transformers";

interface UseProfileDataReturn {
  // State
  profile: ProfileData | null;
  loading: boolean;
  error: string | null;
  hasMounted: boolean;

  // Computed
  editFullName: string;
  editUsername: string;
  editWaNumber: string;
  editEmail: string;
  editDateOfBirth: string;
  savedThemeId: string;

  // Actions
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

export function useProfileData(): UseProfileDataReturn {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);
  const themeId = useAppearanceStore((s) => s.themeId);
  const setThemeId = useAppearanceStore((s) => s.setThemeId);

  // Core state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Form state
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editWaNumber, setEditWaNumber] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");

  // Hydration guard
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Auth guard & initial fetch
  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    let isCancelled = false;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      const result: FetchProfileResult = await fetchProfile();

      if (isCancelled) return;

      if (!result.success) {
        if (result.error === "Unauthorized") {
          clearUser();
          router.replace("/auth/login");
          return;
        }
        setError(result.error);
        setProfile(null);
        setLoading(false);
        return;
      }

      const profileData = result.data;
      setProfile(profileData);

      // Populate form fields
      setEditFullName(profileData.fullName ?? "");
      setEditUsername(profileData.username ?? "");
      setEditWaNumber(profileData.waNumber ?? "");
      setEditEmail(profileData.email ?? "");
      setEditDateOfBirth(toDateInputValue(profileData.dateOfBirth));

      // Set theme
      const savedThemeId = profileData.themeId ?? "green";
      setThemeId(savedThemeId);
      setThemeCookie(savedThemeId);

      // Update header profile cookie
      const house = profileData.house;
      const blok =
        house?.blok_rumah && house?.name
          ? `Blok — ${house.blok_rumah}`
          : house?.blok_rumah ?? "Blok —";

      setHeaderProfileCookie({
        name: profileData.fullName ?? "Warga",
        profilePictureUrl: profileData.profilePictureUrl ?? null,
        blokRumah: blok,
      });

      setLoading(false);
    };

    loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [hasMounted, isAuthenticated, router, clearUser, setThemeId]);

  const refreshProfile = useCallback(async () => {
    const result: FetchProfileResult = await fetchProfile();

    if (!result.success) {
      return;
    }

    const profileData = result.data;
    setProfile(profileData);

    // Repopulate form fields
    setEditFullName(profileData.fullName ?? "");
    setEditUsername(profileData.username ?? "");
    setEditWaNumber(profileData.waNumber ?? "");
    setEditEmail(profileData.email ?? "");
    setEditDateOfBirth(toDateInputValue(profileData.dateOfBirth));

    // Update theme
    const savedThemeId = profileData.themeId ?? "green";
    setThemeId(savedThemeId);
    setThemeCookie(savedThemeId);

    // Update header profile cookie
    const house = profileData.house;
    const blok =
      house?.blok_rumah && house?.name
        ? `Blok — ${house.blok_rumah}`
        : house?.blok_rumah ?? "Blok —";

    setHeaderProfileCookie({
      name: profileData.fullName ?? "Warga",
      profilePictureUrl: profileData.profilePictureUrl ?? null,
      blokRumah: blok,
    });
  }, [setThemeId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const savedThemeId = profile?.themeId ?? "green";

  return {
    profile,
    loading,
    error,
    hasMounted,
    editFullName,
    editUsername,
    editWaNumber,
    editEmail,
    editDateOfBirth,
    savedThemeId,
    refreshProfile,
    clearError,
  };
}