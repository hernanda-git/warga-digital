"use client";

import { useMemo } from "react";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { formatRupiahCompact } from "@/lib/kas-rt-utils";
import type { KasRtSummaryResponse } from "@/types/kas-rt";

interface KasRtCategoryBreakdownProps {
  byCategory: KasRtSummaryResponse["selectedMonth"]["byCategory"];
  totalAmount: number;
  isLoading?: boolean;
}

/**
 * Category breakdown component with horizontal bars
 * Shows top categories with their contribution percentage
 */
export function KasRtCategoryBreakdown({
  byCategory,
  totalAmount,
  isLoading = false,
}: KasRtCategoryBreakdownProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Sort by amount descending and take top categories
  const topCategories = useMemo(() => {
    return byCategory.slice(0, 10); // Show max 10 categories
  }, [byCategory]);

  // Calculate max amount for bar scaling
  const maxAmount = useMemo(() => {
    if (topCategories.length === 0) return 0;
    return Math.max(...topCategories.map((c) => c.amount));
  }, [topCategories]);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-gray-200"></div>
            <div className="h-3 w-16 rounded bg-gray-200"></div>
          </div>
          <div className="mt-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-24 rounded bg-gray-200"></div>
                  <div className="h-3 w-16 rounded bg-gray-200"></div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (topCategories.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm text-center">
        <p className="text-sm text-gray-500">Tidak ada data kategori</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm" aria-label="Breakdown Kategori">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Kategori</h3>
        <span className="text-xs text-gray-500">
          {topCategories.length} kategori
        </span>
      </div>

      {/* Category list */}
      <div className="mt-4 space-y-3">
        {topCategories.map((cat, index) => {
          const barWidth = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0;
          const isIncome = cat.category.toLowerCase().includes("pemasukan") ||
                          cat.category === "IPL" ||
                          cat.category === "Iuran Bulanan";

          // Color based on category type
          const barColor = cat.category === "IPL"
            ? "from-primary-500 to-primary-600"
            : isIncome
            ? "from-green-500 to-green-600"
            : "from-red-500 to-red-600";

          return (
            <div key={index} className="space-y-1">
              {/* Category row */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {cat.category}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {cat.count} transaksi
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-gray-900">
                    {formatRupiahCompact(cat.amount)}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {cat.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-300 ease-out`}
                  style={{ width: `${barWidth}%` }}
                  role="progressbar"
                  aria-valuenow={cat.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${cat.category}: ${cat.percentage.toFixed(1)}%`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more indicator if there are more categories */}
      {byCategory.length > 10 && (
        <div className="mt-3 text-center">
          <p className="text-[10px] text-gray-400">
            +{byCategory.length - 10} kategori lainnya
          </p>
        </div>
      )}
    </div>
  );
}
