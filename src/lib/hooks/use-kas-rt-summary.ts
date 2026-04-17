"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { KasRtSummaryResponse, KasRtSummaryFilter } from "@/types/kas-rt";

interface UseKasRtSummaryOptions {
  initialYear?: number;
  initialMonth?: number; // 1-indexed (1-12)
}

interface UseKasRtSummaryReturn {
  // Data
  summary: KasRtSummaryResponse | null;
  filter: KasRtSummaryFilter;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  setMonth: (year: number, month: number) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing Kas RT summary data with month navigation
 */
export function useKasRtSummary({
  initialYear,
  initialMonth,
}: UseKasRtSummaryOptions = {}): UseKasRtSummaryReturn {
  // ── State ─────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState<KasRtSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<KasRtSummaryFilter>(() => {
    const now = new Date();
    return {
      year: initialYear ?? now.getFullYear(),
      month: initialMonth ?? now.getMonth() + 1, // Convert to 1-indexed
    };
  });

  // ── Data loader ───────────────────────────────────────────────────────
  const loadSummary = useCallback(async (year: number, month: number) => {
    console.log("[useKasRtSummary] Loading summary for:", year, month);
    try {
      setError(null);
      const params = new URLSearchParams();
      params.set("year", year.toString());
      params.set("month", month.toString());

      const url = `/api/kas-rt/summary?${params.toString()}`;
      console.log("[useKasRtSummary] Fetching:", url);

      const response = await apiFetch(url);
      console.log("[useKasRtSummary] Response status:", response.status);

      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        console.error("[useKasRtSummary] API error:", err);
        throw new Error(err.message ?? "Gagal memuat ringkasan.");
      }
      const data = (await response.json()) as KasRtSummaryResponse;
      console.log("[useKasRtSummary] Received data:", data);
      setSummary(data);
    } catch (err) {
      console.error("[useKasRtSummary] Error:", err);
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setSummary(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────
  const setMonth = useCallback(
    (year: number, month: number) => {
      setIsLoading(true);
      setFilter({ year, month });
      loadSummary(year, month);
    },
    [loadSummary],
  );

  const nextMonth = useCallback(() => {
    let { year, month } = filter;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    setMonth(year, month);
  }, [filter, setMonth]);

  const prevMonth = useCallback(() => {
    let { year, month } = filter;
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    setMonth(year, month);
  }, [filter, setMonth]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadSummary(filter.year, filter.month);
  }, [filter, loadSummary]);

  // ── Initial load ───────────────────────────────────────────────────────
  useEffect(() => {
    console.log("[useKasRtSummary] Initial load, filter:", filter);
    void loadSummary(filter.year, filter.month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    summary,
    filter,
    isLoading,
    isRefreshing,
    error,
    setMonth,
    nextMonth,
    prevMonth,
    refresh,
  };
}
