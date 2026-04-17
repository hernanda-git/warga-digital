"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { HouseTransactionStatus } from "@/types/kas-rt";

interface UseHouseTransactionStatusesReturn {
  statuses: HouseTransactionStatus[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching house transaction statuses for 2026.
 */
export function useHouseTransactionStatuses(): UseHouseTransactionStatusesReturn {
  const [statuses, setStatuses] = useState<HouseTransactionStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatuses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiFetch("/api/kas-rt/house-statuses");
      if (!response.ok) {
        throw new Error("Gagal memuat status rumah.");
      }
      const data: HouseTransactionStatus[] = await response.json();
      setStatuses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatuses();
  }, [fetchStatuses]);

  return {
    statuses,
    isLoading,
    error,
    refetch: fetchStatuses,
  };
}
