"use client";

/**
 * Skeleton loading state for KasRtSummaryHero component
 */
export function KasRtSummaryHeroSkeleton() {
  return (
    <section className="shrink-0 overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary-600 to-primary-700 px-4 pb-6 pt-5 text-white">
      <div className="animate-pulse">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded bg-white/20"></div>
            <div className="h-6 w-32 rounded bg-white/20"></div>
          </div>
          <div className="text-right">
            <div className="h-3 w-16 rounded bg-white/20"></div>
            <div className="mt-1 h-5 w-12 rounded bg-white/20"></div>
          </div>
        </div>

        {/* Main balance */}
        <div className="mt-5">
          <div className="h-2.5 w-28 rounded bg-white/20"></div>
          <div className="mt-2 h-10 w-48 rounded bg-white/20"></div>
        </div>

        {/* Stats grid - 3 cards */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {/* Income card */}
          <div className="rounded-xl bg-white/15 p-2.5">
            <div className="h-2 w-full rounded bg-white/20"></div>
            <div className="mt-2 h-4 w-3/4 rounded bg-white/20"></div>
            <div className="mt-1 h-1.5 w-1/2 rounded bg-white/20"></div>
          </div>

          {/* Expense card */}
          <div className="rounded-xl bg-white/15 p-2.5">
            <div className="h-2 w-full rounded bg-white/20"></div>
            <div className="mt-2 h-4 w-3/4 rounded bg-white/20"></div>
            <div className="mt-1 h-1.5 w-1/2 rounded bg-white/20"></div>
          </div>

          {/* Net card */}
          <div className="rounded-xl bg-white/15 p-2.5">
            <div className="h-2 w-full rounded bg-white/20"></div>
            <div className="mt-2 h-4 w-3/4 rounded bg-white/20"></div>
            <div className="mt-1 h-1.5 w-1/2 rounded bg-white/20"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
