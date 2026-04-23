/**
 * useJasaServicesData Hook
 *
 * Custom hook for managing JASA services data on the landing page.
 * Following SOLID principles:
 * - Single Responsibility: Only handles JASA services data fetching and state
 * - Dependency Inversion: Uses service layer instead of direct API calls
 * - Interface Segregation: Returns only what consumers need
 *
 * Features:
 * - Fetches JASA services directly (not by categories)
 * - Transforms API data into UI-ready card items
 * - Manages loading and error states
 * - Provides refresh capability
 * - Automatic fetch on authentication
 */

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { LANDING_API_ENDPOINTS } from "@/config/landing";
import { formatRupiah } from "@/lib/constants/marketplace-catalog";
import type { JasaServiceWithMedia } from "@/types/database";

// ─── Hook Return Type ─────────────────────────────────────────────────────────

export interface UseJasaServicesDataReturn {
  /** JASA services items ready for display */
  jasaServices: JasaServiceWithMedia[];
  /** Whether JASA services data is currently loading */
  isLoading: boolean;
  /** Whether initial data has been loaded */
  isLoaded: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether JASA section has content to display */
  hasJasaContent: boolean;
  /** Function to manually refresh JASA services data */
  refresh: () => Promise<void>;
}

// ─── Hook Implementation ──────────────────────────────────────────────────────

/**
 * Hook for managing JASA services data on landing page
 *
 * @returns JASA services state and operations
 *
 * @example
 * function LandingPage() {
 *   const {
 *     jasaServices,
 *     isLoaded,
 *     hasJasaContent
 *   } = useJasaServicesData();
 *
 *   if (!isLoaded) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return (
 *     <>
 *       {hasJasaContent && (
 *         <div className="grid grid-cols-1 gap-3">
 *           {jasaServices.map((service) => (
 *             <JasaCard key={service.id} service={service} />
 *           ))}
 *         </div>
 *       )}
 *     </>
 *   );
 * }
 */
export function useJasaServicesData(): UseJasaServicesDataReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // ── State ──────────────────────────────────────────────────────────────────
  const [jasaServices, setJasaServices] = useState<JasaServiceWithMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch JASA Services Data ────────────────────────────────────────────────
  const loadJasaServices = useCallback(async (getCancelled?: () => boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(LANDING_API_ENDPOINTS.JASA_SERVICES);
      const data = await response.json();

      if (getCancelled?.()) {
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat layanan");
      }

      setJasaServices(data.data.services);
      setIsLoading(false);
      setIsLoaded(true);
    } catch (err: unknown) {
      if (getCancelled?.()) {
        return;
      }
      const message =
        err instanceof Error ? err.message : "Gagal memuat layanan";

      console.error("[JASA Services] loadJasaServices error:", err);
      setError(message);
      setIsLoading(false);
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setJasaServices([]);
      setIsLoaded(false);
      setError(null);
      return;
    }

    let cancelled = false;

    loadJasaServices(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loadJasaServices]);

  // ── Compute Derived State ─────────────────────────────────────────────────
  const hasJasaContent = jasaServices.length > 0;

  // ── Return Hook API ───────────────────────────────────────────────────────
  return {
    jasaServices,
    isLoading,
    isLoaded,
    error,
    hasJasaContent,
    refresh: loadJasaServices,
  };
}
