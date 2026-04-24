"use client";

import { useMemo } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

interface KasRtIplProgressProps {
  totalHouses: number;
  paidHouses: number;
  percentage: number;
  isLoading?: boolean;
}

/**
 * IPL Collection Progress component with visual progress bar
 * Redesigned to match kas-rt-summary-redesigned.html specifications
 */
export function KasRtIplProgress({
  totalHouses,
  paidHouses,
  percentage,
  isLoading = false,
}: KasRtIplProgressProps) {
  // Calculate progress bar width
  const progressWidth = useMemo(() => {
    return Math.min(100, Math.max(0, percentage));
  }, [percentage]);

  if (isLoading) {
    return (
      <div className="mx-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-gray-200"></div>
            <div className="h-4 w-16 rounded bg-gray-200"></div>
          </div>
          <div className="mt-3 h-3 w-full rounded-full bg-gray-200"></div>
          <div className="mt-2 flex items-center justify-between">
            <div className="h-3 w-20 rounded bg-gray-200"></div>
            <div className="h-3 w-24 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 rounded-xl bg-white p-4 shadow-sm" aria-label="Koleksi IPL">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">Koleksi IPL</p>
          <p className="text-xs text-gray-500">
            {paidHouses} dari {totalHouses} rumah
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold text-primary-600">
            {percentage}%
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out"
          style={{ width: `${progressWidth}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Footer stats */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-gray-600">
          <CheckCircleIcon className="h-4 w-4 text-green-500" />
          <span>{paidHouses} rumah sudah bayar</span>
        </div>
        <div className="text-gray-500">
          {totalHouses - paidHouses} rumah belum
        </div>
      </div>
    </div>
  );
}
