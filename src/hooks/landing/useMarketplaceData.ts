/**
 * useMarketplaceData Hook
 *
 * Custom hook for managing marketplace data on the landing page.
 * Following SOLID principles:
 * - Single Responsibility: Only handles marketplace data fetching and state
 * - Dependency Inversion: Uses service layer instead of direct API calls
 * - Interface Segregation: Returns only what consumers need
 *
 * Features:
 * - Fetches marketplace summary (UMKM and JASA categories)
 * - Transforms API data into UI-ready card items
 * - Manages loading and error states
 * - Provides refresh capability
 * - Automatic fetch on authentication
 */

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { fetchMarketplaceSummary } from "@/services/landing/api.service";
import {
  transformCategoriesToCards,
  hasMarketplaceContent,
} from "@/services/landing/transformers";
import type { HorizontalCardItem } from "@/components/landing/HorizontalCardStrip";

// ─── Hook Return Type ─────────────────────────────────────────────────────────

export interface UseMarketplaceDataReturn {
  /** UMKM category items ready for display */
  umkmItems: HorizontalCardItem[];
  /** JASA category items ready for display */
  jasaItems: HorizontalCardItem[];
  /** Whether marketplace data is currently loading */
  isLoading: boolean;
  /** Whether initial data has been loaded */
  isLoaded: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether UMKM section has content to display */
  hasUmkmContent: boolean;
  /** Whether JASA section has content to display */
  hasJasaContent: boolean;
  /** Function to manually refresh marketplace data */
  refresh: () => Promise<void>;
}

// ─── Hook Implementation ──────────────────────────────────────────────────────

/**
 * Hook for managing marketplace data on landing page
 *
 * @returns Marketplace state and operations
 *
 * @example
 * function LandingPage() {
 *   const {
 *     umkmItems,
 *     jasaItems,
 *     isLoaded,
 *     hasUmkmContent,
 *     hasJasaContent
 *   } = useMarketplaceData();
 *
 *   if (!isLoaded) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return (
 *     <>
 *       {hasUmkmContent && <HorizontalCardStrip items={umkmItems} />}
 *       {hasJasaContent && <HorizontalCardStrip items={jasaItems} />}
 *     </>
 *   );
 * }
 */
export function useMarketplaceData(): UseMarketplaceDataReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // ── State ──────────────────────────────────────────────────────────────────
  const [umkmItems, setUmkmItems] = useState<HorizontalCardItem[]>([]);
  const [jasaItems, setJasaItems] = useState<HorizontalCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch Marketplace Data ────────────────────────────────────────────────
  const loadMarketplace = useCallback(async (getCancelled?: () => boolean) => {
    setIsLoading(true);
    setError(null);

    const result = await fetchMarketplaceSummary();

    if (getCancelled?.()) {
      return;
    }

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      setIsLoaded(true);
      return;
    }

    const umkm = transformCategoriesToCards(result.data.data.UMKM ?? []);
    const jasa = transformCategoriesToCards(result.data.data.JASA ?? []);

    setUmkmItems(umkm);
    setJasaItems(jasa);
    setIsLoading(false);
    setIsLoaded(true);
  }, []);

  // ── Auto-fetch on Authentication ──────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      setUmkmItems([]);
      setJasaItems([]);
      setIsLoaded(false);
      setError(null);
      return;
    }

    let cancelled = false;

    loadMarketplace(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loadMarketplace]);

  // ── Compute Derived State ─────────────────────────────────────────────────
  const hasUmkmContent = hasMarketplaceContent(umkmItems);
  const hasJasaContent = hasMarketplaceContent(jasaItems);

  // ── Return Hook API ───────────────────────────────────────────────────────
  return {
    umkmItems,
    jasaItems,
    isLoading,
    isLoaded,
    error,
    hasUmkmContent,
    hasJasaContent,
    refresh: loadMarketplace,
  };
}
