/**
 * useAnnouncementsData Hook
 *
 * Custom hook for managing announcements (Info Warga) data on the landing page.
 * Following SOLID principles:
 * - Single Responsibility: Only handles announcements data fetching and state
 * - Dependency Inversion: Uses service layer instead of direct API calls
 * - Interface Segregation: Returns only what consumers need
 *
 * Features:
 * - Fetches community announcements from API
 * - Transforms API data into UI-ready post items
 * - Manages loading and error states
 * - Provides refresh capability
 * - Automatic fetch on authentication
 */

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { fetchAnnouncements } from "@/services/landing/api.service";
import {
  transformAnnouncementsToPosts,
  hasAnnouncementContent,
} from "@/services/landing/transformers";
import type { ResidentPostItem } from "@/components/landing/ResidentPostsSection";

// ─── Hook Return Type ─────────────────────────────────────────────────────────

export interface UseAnnouncementsDataReturn {
  /** Announcement items ready for display */
  items: ResidentPostItem[];
  /** Whether announcements data is currently loading */
  isLoading: boolean;
  /** Whether initial data has been loaded */
  isLoaded: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether there are announcements to display */
  hasContent: boolean;
  /** Function to manually refresh announcements data */
  refresh: () => Promise<void>;
}

// ─── Hook Implementation ──────────────────────────────────────────────────────

/**
 * Hook for managing announcements data on landing page
 *
 * @returns Announcements state and operations
 *
 * @example
 * function LandingPage() {
 *   const {
 *     items: announcements,
 *     isLoaded,
 *     hasContent
 *   } = useAnnouncementsData();
 *
 *   if (!isLoaded) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   if (!hasContent) {
 *     return <EmptyState />;
 *   }
 *
 *   return <ResidentPostsSection items={announcements} />;
 * }
 */
export function useAnnouncementsData(): UseAnnouncementsDataReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // ── State ──────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<ResidentPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch Announcements Data ──────────────────────────────────────────────
  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await fetchAnnouncements();

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      setIsLoaded(true);
      return;
    }

    // Transform API response to UI models
    const posts = transformAnnouncementsToPosts(
      result.data.announcements ?? [],
    );

    setItems(posts);
    setIsLoading(false);
    setIsLoaded(true);
  }, []);

  // ── Auto-fetch on Authentication ──────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      // Reset state when not authenticated
      setItems([]);
      setIsLoaded(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const result = await fetchAnnouncements();

      if (cancelled) {
        return;
      }

      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        setIsLoaded(true);
        return;
      }

      // Transform API data to UI models
      const posts = transformAnnouncementsToPosts(
        result.data.announcements ?? [],
      );

      setItems(posts);
      setIsLoading(false);
      setIsLoaded(true);
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // ── Compute Derived State ─────────────────────────────────────────────────
  const hasContent = hasAnnouncementContent(items);

  // ── Return Hook API ───────────────────────────────────────────────────────
  return {
    items,
    isLoading,
    isLoaded,
    error,
    hasContent,
    refresh: loadAnnouncements,
  };
}
