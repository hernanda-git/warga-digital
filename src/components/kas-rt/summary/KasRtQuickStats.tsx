"use client";

import { useMemo } from "react";
import { formatRupiahCompact, formatDateIndonesian } from "@/lib/kas-rt-utils";
import type { KasRtSummaryResponse } from "@/types/kas-rt";

interface KasRtQuickStatsProps {
  stats: KasRtSummaryResponse["stats"];
  isLoading?: boolean;
}

/**
 * Quick statistics cards component
 * Shows average per day, best/worst days, and highest category
 */
export function KasRtQuickStats({ stats, isLoading = false }: KasRtQuickStatsProps) {
  const { avgPerDay, bestDay, worstDay, highestCategory } = stats;

  // Format average per day
  const formattedAvgPerDay = useMemo(() => {
    return formatRupiahCompact(avgPerDay);
  }, [avgPerDay]);

  // Format best and worst day dates
  const formattedBestDate = useMemo(() => {
    return bestDay.date !== "-" ? formatDateIndonesian(bestDay.date) : "-";
  }, [bestDay.date]);

  const formattedWorstDate = useMemo(() => {
    return worstDay.date !== "-" ? formatDateIndonesian(worstDay.date) : "-";
  }, [worstDay.date]);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-gray-200"></div>
            <div className="h-3 w-16 rounded bg-gray-200"></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg bg-gray-50 p-3">
                <div className="h-3 w-16 rounded bg-gray-200"></div>
                <div className="mt-2 h-5 w-20 rounded bg-gray-200"></div>
                <div className="mt-1 h-2 w-full rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm" aria-label="Statistik Cepat">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Statistik Cepat</h3>
      </div>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* Average per day */}
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Rata-rata/Hari
          </p>
          <p className="mt-1.5 text-sm font-extrabold text-gray-900">
            {formattedAvgPerDay}
          </p>
        </div>

        {/* Highest category */}
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Kategori Tertinggi
          </p>
          <p className="mt-1.5 text-sm font-bold text-primary-600 truncate">
            {highestCategory.name}
          </p>
          <p className="text-xs text-gray-500">
            {formatRupiahCompact(highestCategory.amount)}
          </p>
        </div>

        {/* Best day */}
        <div className="rounded-lg bg-green-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-green-600">
            Hari Terbaik
          </p>
          <p className="mt-1.5 text-sm font-bold text-green-700">
            {formatRupiahCompact(bestDay.amount)}
          </p>
          <p className="text-xs text-green-600">{formattedBestDate}</p>
        </div>

        {/* Worst day */}
        <div className="rounded-lg bg-red-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">
            Hari Terburuk
          </p>
          <p className="mt-1.5 text-sm font-bold text-red-700">
            {formatRupiahCompact(worstDay.amount)}
          </p>
          <p className="text-xs text-red-600">{formattedWorstDate}</p>
        </div>
      </div>
    </div>
  );
}
