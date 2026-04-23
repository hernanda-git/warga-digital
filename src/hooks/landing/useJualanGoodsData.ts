/**
 * useJualanGoodsData Hook
 *
 * Custom hook for managing Jualan goods data on the landing page.
 * Fetches recent active goods for the UMKM/Jual Beli section.
 */

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { LANDING_API_ENDPOINTS } from "@/config/landing";
import type { JualanGoodsWithMedia } from "@/types/jualan";

// ─── Hook Return Type ─────────────────────────────────────────────────────────

export interface UseJualanGoodsDataReturn {
  /** Jualan goods items ready for display */
  jualanGoods: JualanGoodsWithMedia[];
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Whether initial data has been loaded */
  isLoaded: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether section has content to display */
  hasContent: boolean;
  /** Function to manually refresh data */
  refresh: () => Promise<void>;
}

// ─── Hook Implementation ──────────────────────────────────────────────────────

export function useJualanGoodsData(): UseJualanGoodsDataReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // ── State ──────────────────────────────────────────────────────────────────
  const [jualanGoods, setJualanGoods] = useState<JualanGoodsWithMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch Data ─────────────────────────────────────────────────────────────
  const loadJualanGoods = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch(LANDING_API_ENDPOINTS.JUALAN_GOODS);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat barang");
      }

      setJualanGoods(data.data.goods ?? []);
      setIsLoading(false);
      setIsLoaded(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memuat barang";
      console.error("[Jualan Goods] loadJualanGoods error:", err);
      setError(message);
      setIsLoading(false);
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setJualanGoods([]);
      setIsLoaded(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      const response = await apiFetch(LANDING_API_ENDPOINTS.JUALAN_GOODS);
      const data = await response.json();

      if (cancelled) return;

      if (!response.ok || !data.success) {
        setError(data.error || "Gagal memuat barang");
        setIsLoading(false);
        setIsLoaded(true);
        return;
      }

      setJualanGoods(data.data.goods ?? []);
      setIsLoading(false);
      setIsLoaded(true);
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loadJualanGoods]);

  // ── Derived State ──────────────────────────────────────────────────────────
  const hasContent = jualanGoods.length > 0;

  // ── Return ─────────────────────────────────────────────────────────────────
  return {
    jualanGoods,
    isLoading,
    isLoaded,
    error,
    hasContent,
    refresh: loadJualanGoods,
  };
}
