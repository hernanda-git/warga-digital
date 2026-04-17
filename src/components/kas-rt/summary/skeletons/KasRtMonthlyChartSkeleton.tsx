"use client";

/**
 * Skeleton loading state for KasRtMonthlyChart component
 */
export function KasRtMonthlyChartSkeleton() {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded bg-gray-200"></div>
          <div className="h-3 w-20 rounded bg-gray-200"></div>
        </div>

        {/* Chart area */}
        <div className="mt-4 h-48 w-full overflow-x-auto">
          <div className="h-48 min-w-[600px] space-y-2">
            {/* Simulate bars */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="flex items-center gap-2">
                {/* X-axis label */}
                <div className="h-3 w-8 rounded bg-gray-200"></div>
                {/* Bar group */}
                <div className="flex-1 space-y-1">
                  <div className="flex gap-1">
                    <div className="h-4 flex-1 rounded bg-green-200 opacity-50"></div>
                    <div className="h-4 flex-1 rounded bg-red-200 opacity-50"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex justify-center gap-6">
          <div className="h-3 w-20 rounded bg-gray-200"></div>
          <div className="h-3 w-24 rounded bg-gray-200"></div>
        </div>
      </div>
    </div>
  );
}
