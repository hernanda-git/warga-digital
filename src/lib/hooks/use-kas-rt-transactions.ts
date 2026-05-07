"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import { sortBlokRumah } from "@/lib/blok-rumah";

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
    total?: number;
    categories?: KasRtCategory[];
    canSubmitTransaction?: boolean;
    summary?: KasRtTotals | null;
    filterState?: KasRtFilterState;
    blockNames?: string[];
  };
}

interface PaginationState {
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  total: number;
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
  isLoadingMore: boolean;
  refreshedAt: Date;

  // Filter state
  filterState: KasRtFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<KasRtFilterState>>;
  isFilterOpen: boolean;
  setIsFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Derived data
  totals: KasRtTotals;
  allCategoryNames: string[];
  allBlockNames: string[];
  activeAdvancedFilterCount: number;

  // Pagination
  pagination: PaginationState;

  // Actions
  refreshData: () => Promise<void>;
  loadCategories: () => Promise<void>;
  setTransactions: React.Dispatch<React.SetStateAction<TransactionItem[]>>;
  applyFilters: () => Promise<void>;
  loadMore: () => Promise<void>;
  resetFilters: () => Promise<void>;
}

const PAGE_SIZE = 10;

/**
 * Build a stable filter key from filter state for change detection.
 */
function buildFilterKey(filters: KasRtFilterState): string {
  return `${filters.typeFilter}|${filters.categoryFilter.trim()}|${filters.blockFilter.trim()}|${filters.startDate}|${filters.endDate}`;
}

/**
 * Hook for managing Kas RT transactions data, permissions, and filtering
 * with infinite scroll pagination (10 items per page).
 *
 * Behaviors:
 * - Initial load / filter change / refresh → reset to page 1, replace transactions
 * - Scroll to bottom → load next page, append transactions
 * - Pending requests are cancelled when filters change
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
  const [blockNames, setBlockNames] = useState<string[]>(
    initialData?.blockNames ?? [],
  );
  const [canSubmitTransaction, setCanSubmitTransaction] = useState(
    initialData?.canSubmitTransaction ?? false,
  );
  const [isPageLoading, setIsPageLoading] = useState(!hasInitialData);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(
    !hasInitialData,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(now);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [summary, setSummary] = useState<KasRtTotals | null>(
    initialData?.summary ?? null,
  );

  const initialTransactionCount = initialData?.transactions?.length ?? 0;
  const initialTotal = initialData?.total ?? initialTransactionCount;

  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    pageSize: PAGE_SIZE,
    hasMore: initialTotal > initialTransactionCount,
    total: initialTotal,
  });

  // Filter state — initialize from SSR if provided, otherwise use no filters
  const [filterState, setFilterState] = useState<KasRtFilterState>(
    initialData?.filterState ?? {
      typeFilter: "all",
      categoryFilter: "",
      blockFilter: "",
      startDate: "",
      endDate: "",
    },
  );

  // Refs for request cancellation and change tracking
  const abortControllerRef = useRef<AbortController | null>(null);
  const prevFilterKeyRef = useRef(buildFilterKey(filterState));
  const isMountedRef = useRef(true);
  const hasMoreRef = useRef(pagination.hasMore);
  hasMoreRef.current = pagination.hasMore;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Cancel pending requests ────────────────────────────────────────────
  const cancelPendingRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // ── Data loaders ───────────────────────────────────────────────────────
  const loadTransactions = useCallback(
    async (
      filters: KasRtFilterState,
      page: number,
      append: boolean,
    ): Promise<boolean> => {
      cancelPendingRequests();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        if (!append) {
          setIsTransactionsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        // Build query params from filter state (server-side filtering)
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String((page - 1) * PAGE_SIZE));

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

        const url = `/api/kas-rt/transactions?${params.toString()}`;

        const response = await apiFetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) {

          return false;
        }

        const json = (await response.json()) as {
          transactions: TransactionItem[];
          pagination: {
            total: number;
            limit: number;
            offset: number;
            has_more: boolean;
            total_pages: number;
            current_page: number;
          };
        };

        const newTransactions = json.transactions ?? [];
        const hasMore = json.pagination?.has_more ?? false;
        const total = json.pagination?.total ?? 0;

        if (!isMountedRef.current) return false;

        if (append) {
          setTransactions((prev) => {
            // Deduplicate by ID in case of race conditions
            const existingIds = new Set(prev.map((t) => t.id));
            const uniqueNew = newTransactions.filter(
              (t) => !existingIds.has(t.id),
            );
            return [...prev, ...uniqueNew];
          });
        } else {
          setTransactions(newTransactions);
        }

        setPagination({
          currentPage: page,
          pageSize: PAGE_SIZE,
          hasMore,
          total,
        });

        return true;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return false;
        }

        return false;
      } finally {
        if (!isMountedRef.current) return false;
        if (!append) {
          setIsTransactionsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [cancelPendingRequests],
  );

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

  const loadBlockNames = useCallback(async () => {
    try {
      const response = await apiFetch("/api/kas-rt/houses");
      if (!response.ok) return;
      const data = (await response.json()) as { blok_rumah: string | null }[];
      setBlockNames(
        data
          .map((h) => h.blok_rumah)
          .filter((b): b is string => b !== null)
          .sort(sortBlokRumah),
      );
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

  // ── Actions ────────────────────────────────────────────────────────────

  // Apply filters - called when "Terapkan" button is clicked
  const applyFilters = useCallback(async () => {
    await loadTransactions(filterState, 1, false);
  }, [filterState, loadTransactions]);

  // Load more - called when scrolling to bottom
  const loadMore = useCallback(async () => {
    if (isLoadingMore || isTransactionsLoading || !hasMoreRef.current) return;
    await loadTransactions(filterState, pagination.currentPage + 1, true);
  }, [
    isLoadingMore,
    isTransactionsLoading,
    pagination.currentPage,
    filterState,
    loadTransactions,
  ]);

  // Reset filters - called when "Reset Filter" is clicked
  const resetFilters = useCallback(async () => {
    const newFilterState: KasRtFilterState = {
      typeFilter: "all",
      categoryFilter: "",
      blockFilter: "",
      startDate: "",
      endDate: "",
    };
    setFilterState(newFilterState);
    prevFilterKeyRef.current = buildFilterKey(newFilterState);
    await loadTransactions(newFilterState, 1, false);
  }, [loadTransactions]);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Cancel any pending load-more
      cancelPendingRequests();
      await Promise.all([
        loadTransactions(filterState, 1, false),
        loadSummary(),
      ]);
      setRefreshedAt(new Date());
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [filterState, loadTransactions, loadSummary, cancelPendingRequests]);

  // Ref to ensure init runs only once when no SSR data
  const hasInitializedRef = useRef(false);

  // ── Initial data loading ───────────────────────────────────────────────
  useEffect(() => {
    if (hasInitialData) {
      // SSR provided initial data; skip client-side initial fetch
      setIsPageLoading(false);
      setIsTransactionsLoading(false);
      // If SSR total equals the loaded count, there's nothing more to fetch
      if (initialTotal <= initialTransactionCount) {
        setPagination((prev) => ({ ...prev, hasMore: false }));
      }
      return;
    }

    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

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
      await loadBlockNames();

      setIsPageLoading(false);

      // Phase 2: Load transactions and summary with default filters
      await Promise.all([loadTransactions(filterState, 1, false), loadSummary()]);
    }
    void init();
    // Only depends on hasInitialData; uses hasInitializedRef to prevent re-runs
    // when no SSR data is provided.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialData]);

  // ── Type filter change triggers immediate reload ───────────────────────
  // Type filter is in the top bar (tabs), not in the filter sheet
  // So it should trigger immediate API call and reset pagination
  const prevTypeFilterRef = useRef(filterState.typeFilter);

  useEffect(() => {
    // Skip if this is the initial render or page is still loading
    if (prevTypeFilterRef.current === filterState.typeFilter || isPageLoading) {
      prevTypeFilterRef.current = filterState.typeFilter;
      return;
    }

    // Type filter changed, reload page 1
    prevTypeFilterRef.current = filterState.typeFilter;
    void loadTransactions(filterState, 1, false);
    // Intentionally excludes filterState from deps; only reacts to typeFilter changes.
    // Other filter changes are handled by applyFilters/resetFilters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterState.typeFilter, isPageLoading, loadTransactions]);

  // ── Advanced filter change detection ───────────────────────────────────
  // When filterState changes (via setFilterState), check if the key changed
  // This handles the case where user opens filter sheet, changes values,
  // and clicks "Terapkan" (which just calls applyFilters).
  // We already handle applyFilters directly, but this also catches any
  // direct setFilterState calls that should trigger reload.
  // Actually, we should NOT auto-apply on every setFilterState change
  // because the filter sheet uses setFilterState for intermediate changes.
  // Only applyFilters, resetFilters, and typeFilter effect trigger reloads.
  // So we don't need an additional effect here.

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

  // Server already returns filtered and sorted results.
  // No client-side filtering needed.

  const allCategoryNames = useMemo(
    () => Array.from(new Set(categories.map((c) => c.name))).sort(),
    [categories],
  );

  const allBlockNames = useMemo(() => blockNames, [blockNames]);

  const activeAdvancedFilterCount = useMemo(() => {
    return [
      filterState.categoryFilter.trim() !== "",
      filterState.blockFilter.trim() !== "",
      filterState.startDate !== "",
      filterState.endDate !== "",
    ].filter(Boolean).length;
  }, [filterState]);

  return {
    // Data
    transactions,
    categories,
    communityName,
    canSubmitTransaction,
    isPageLoading,
    isTransactionsLoading,
    isRefreshing,
    isLoadingMore,
    refreshedAt,

    // Filter state
    filterState,
    setFilterState,
    isFilterOpen,
    setIsFilterOpen,

    // Derived data
    totals,
    allCategoryNames,
    allBlockNames,
    activeAdvancedFilterCount,

    // Pagination
    pagination,

    // Actions
    refreshData,
    loadCategories,
    setTransactions,
    applyFilters,
    loadMore,
    resetFilters,
  };
}
