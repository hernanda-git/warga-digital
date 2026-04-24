"use client";

import { useMemo } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface KasRtMonthNavigatorProps {
  year: number;
  month: number; // 1-indexed (1-12)
  onPrevMonth: () => void;
  onNextMonth: () => void;
  isLoading?: boolean;
}

/**
 * Month navigator with prev/next buttons for the summary page
 * Redesigned to match kas-rt-summary-redesigned.html specifications
 */
export function KasRtMonthNavigator({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  isLoading = false,
}: KasRtMonthNavigatorProps) {
  // Format month label in Indonesian
  const monthLabel = useMemo(() => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  }, [year, month]);

  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
      {/* Previous month button */}
      <button
        type="button"
        onClick={onPrevMonth}
        disabled={isLoading}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 transition hover:bg-gray-200 active:scale-95 disabled:opacity-50"
        aria-label="Bulan sebelumnya"
      >
        <ChevronLeftIcon className="h-5 w-5 text-gray-700" />
      </button>

      {/* Month label */}
      <div className="text-center">
        <p className="text-sm font-bold text-gray-900">{monthLabel}</p>
      </div>

      {/* Next month button */}
      <button
        type="button"
        onClick={onNextMonth}
        disabled={isLoading}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 transition hover:bg-gray-200 active:scale-95 disabled:opacity-50"
        aria-label="Bulan berikutnya"
      >
        <ChevronRightIcon className="h-5 w-5 text-gray-700" />
      </button>
    </div>
  );
}
