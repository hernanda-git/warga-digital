"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/lib/api-client";

import { toDateInputValue } from "@/lib/kas-rt-utils";

import { getDefaultFilterDates } from "@/lib/kas-rt-constants";

/**
 * Get community name from cookie (client-side)
 */
function getCommunityNameFromCookie(): string {
  if (typeof document === "undefined") return "Warga Digital";

  const match = document.cookie.match(/community_name=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "Warga Digital";
}

import type {
  TransactionItem,
  KasRtCategory,
  KasRtTotals,
  KasRtFilterState,
} from "@/types/kas-rt";

interface UseKasRtTransactionsOptions {
  now: Date;
  initialData?: {
    transactions?: TransactionItem[];
    categories?: KasRtCategory[];
    canSubmitTransaction?: boolean;
    summary?: KasRtTotals | null;
  };
}

interface UseKasRtTransactionsReturn {
  // Data
  transactions: TransactionItem[];
  categories: KasRtCategory[];
  communityName: string;
  canSubmitTransaction: boolean;
  isPageLoading: boolean;
  isTransactionsLoading: boolean;
  isRefreshing: boolean;
  refreshedAt: Date;

  // Filter state
  filterState: KasRtFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<KasRtFilterState>>;
  isFilterOpen: boolean;
  setIsFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Derived data
  totals: KasRtTotals;
  filteredTransactions: TransactionItem[];
  allCategoryNames: string[];
  allBlockNames: string[];
  activeAdvancedFilterCount: number;

  // Actions
  refreshData: () => Promise<void>;
  loadCategories: () => Promise<void>;
  setTransactions: React.Dispatch<React.SetStateAction<TransactionItem[]>>;
  applyFilters: () => Promise<void>;
}

/**
 * Hook for managing Kas RT transactions data, permissions, and filtering
 *
 * Server-side filtering is applied only when:
 * 1. Initial page load
 * 2. "Terapkan" (Apply) button is clicked
 * 3. Type filter tab is changed (immediate)
 */
export function useKasRtTransactions({
  now,
  initialData,
}: UseKasRtTransactionsOptions): UseKasRtTransactionsReturn {
  const hasInitialData = !!initialData;

  // ── State ─────────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<TransactionItem[]>(
    initialData?.transactions ?? [],
  );
  const [categories, setCategories] = useState<KasRtCategory[]>(
    initialData?.categories ?? [],
  );
  const [communityName, setCommunityName] = useState(
    getCommunityNameFromCookie(),
  );
  const [canSubmitTransaction, setCanSubmitTransaction] = useState(
    initialData?.canSubmitTransaction ?? false,
  );
  const [isPageLoading, setIsPageLoading] = useState(!hasInitialData);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(
    !hasInitialData,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(now);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [summary, setSummary] = useState<KasRtTotals | null>(
    initialData?.summary ?? null,
  );

  // Filter state
  const defaultDates = getDefaultFilterDates(now);
  const [filterState, setFilterState] = useState<KasRtFilterState>({
    typeFilter: "all",
    categoryFilter: "",
    blockFilter: "",
    startDate: defaultDates.startDate,
    endDate: defaultDates.endDate,
  });

  // ── Data loaders ───────────────────────────────────────────────────────
  const loadTransactions = useCallback(async (filters: KasRtFilterState) => {
    try {
      setIsTransactionsLoading(true);

      // Build query params from filter state (server-side filtering)
      const params = new URLSearchParams();

      if (filters.typeFilter && filters.typeFilter !== "all") {
        params.set("type", filters.typeFilter);
      }
      if (filters.categoryFilter.trim()) {
        params.set("category", filters.categoryFilter.trim());
      }
      if (filters.blockFilter.trim()) {
        params.set("block", filters.blockFilter.trim());
      }
      if (filters.startDate) {
        params.set("startDate", filters.startDate);
      }
      if (filters.endDate) {
        params.set("endDate", filters.endDate);
      }

      const queryString = params.toString();
      const url = queryString
        ? `/api/kas-rt/transactions?${queryString}`
        : "/api/kas-rt/transactions";

      const response = await apiFetch(url);
      if (!response.ok) return;
      const json = await response.json();
      setTransactions(Array.isArray(json) ? json : json.transactions || []);
    } catch {
      // silently ignore
    } finally {
      setIsTransactionsLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const response = await apiFetch("/api/kas-rt/categories");
      if (!response.ok) return;
      const data = (await response.json()) as KasRtCategory[];
      setCategories(data);
    } catch {
      // silently ignore
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const response = await apiFetch("/api/kas-rt/hero");
      if (!response.ok) return;
      const data = (await response.json()) as KasRtTotals;
      setSummary(data);
    } catch {
      // silently ignore
    }
  }, []);

  // Apply filters - called when "Terapkan" button is clicked
  const applyFilters = useCallback(async () => {
    await loadTransactions(filterState);
  }, [filterState, loadTransactions]);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadTransactions(filterState), loadSummary()]);
      setRefreshedAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [filterState, loadTransactions, loadSummary]);

  // ── Initial data loading ───────────────────────────────────────────────
  useEffect(() => {
    if (hasInitialData) {
      // SSR provided initial data; skip client-side initial fetch
      setIsPageLoading(false);
      setIsTransactionsLoading(false);
      return;
    }

    async function init() {
      // Phase 1: Load essential data (blocking - permissions, info, categories)
      try {
        const permRes = await apiFetch("/api/kas-rt/permissions");
        if (permRes.ok) {
          const perm = (await permRes.json()) as {
            canSubmitTransaction?: boolean;
          };
          setCanSubmitTransaction(perm.canSubmitTransaction === true);
        }
      } catch {
        // ignore
      }

      await loadCategories();

      setIsPageLoading(false);

      // Phase 2: Load transactions and summary with default filters
      await Promise.all([loadTransactions(filterState), loadSummary()]);
    }
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Type filter change triggers immediate reload ───────────────────────
  // Type filter is in the top bar (tabs), not in the filter sheet
  // So it should trigger immediate API call
  const prevTypeFilterRef = useRef(filterState.typeFilter);

  useEffect(() => {
    // Skip if this is the initial render or page is still loading
    if (prevTypeFilterRef.current === filterState.typeFilter || isPageLoading) {
      return;
    }

    // Type filter changed, reload immediately
    prevTypeFilterRef.current = filterState.typeFilter;
    void loadTransactions(filterState);
  }, [filterState.typeFilter, filterState, isPageLoading, loadTransactions]);

  // ── Derived data ───────────────────────────────────────────────────────
  // Default totals while loading (from API)
  const totals: KasRtTotals = summary ?? {
    balance: 0,
    balanceEndOfPrevMonth: 0,
    prevMonthEndLabel: "...",
    thisMonthIncome: 0,
    thisMonthExpense: 0,
    thisMonthNet: 0,
    deltaFromPrevious: 0,
  };

  // Server already returns filtered and sorted results
  // No client-side filtering needed - just pass through the transactions
  const filteredTransactions = useMemo(() => {
    return transactions;
  }, [transactions]);

  const allCategoryNames = useMemo(
    () => Array.from(new Set(categories.map((c) => c.name))).sort(),
    [categories],
  );

  const allBlockNames = useMemo(
    () =>
      Array.from(
        new Set(
          transactions
            .map((t) => t.reference?.trim())
            .filter((r): r is string => Boolean(r)),
        ),
      ).sort(),
    [transactions],
  );

  const activeAdvancedFilterCount = useMemo(() => {
    const defaultStart = toDateInputValue(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );
    return [
      filterState.categoryFilter.trim() !== "",
      filterState.blockFilter.trim() !== "",
      filterState.startDate !== defaultStart,
    ].filter(Boolean).length;
  }, [filterState, now]);

  return {
    // Data
    transactions,
    categories,
    communityName,
    canSubmitTransaction,
    isPageLoading,
    isTransactionsLoading,
    isRefreshing,
    refreshedAt,

    // Filter state
    filterState,
    setFilterState,
    isFilterOpen,
    setIsFilterOpen,

    // Derived data
    totals,
    filteredTransactions,
    allCategoryNames,
    allBlockNames,
    activeAdvancedFilterCount,

    // Actions
    refreshData,
    loadCategories,
    setTransactions,
    applyFilters,
  };
}
