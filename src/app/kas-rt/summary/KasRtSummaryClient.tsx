"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePullToRefresh } from "@/lib/hooks/use-pull-to-refresh";
import {
  KasRtMonthNavigator,
  KasRtSummaryHero,
  KasRtIplProgress,
  KasRtMonthlyChart,
  KasRtCategoryBreakdown,
  KasRtQuickStats,
  KasRtExportButton,
} from "@/components/kas-rt/summary";
import type { KasRtSummaryResponse } from "@/types/kas-rt";

interface KasRtSummaryClientProps {
  summary: KasRtSummaryResponse;
  year: number;
  month: number;
}

export default function KasRtSummaryClient({
  summary,
  year,
  month,
}: KasRtSummaryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const navigateMonth = useCallback(
    (delta: number) => {
      let newMonth = month + delta;
      let newYear = year;
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      } else if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("year", newYear.toString());
      params.set("month", newMonth.toString());
      startTransition(() => {
        router.push(`/kas-rt/summary?${params.toString()}`);
      });
    },
    [year, month, router, searchParams],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const { pullDistance, onTouchStart, onTouchMove, onTouchEnd } =
    usePullToRefresh({
      onRefresh: () => {
        router.refresh();
      },
      isRefreshing: isPending,
    });

  return (
    <main className="flex min-h-screen flex-col bg-app-surface-alt">
      {/* Sticky header with navigation */}
      <header className="sticky top-0 z-20 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 transition hover:bg-gray-200 active:scale-95"
            aria-label="Kembali"
          >
            <svg
              className="h-5 w-5 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Keuangan RT
            </p>
            <h1 className="truncate text-base font-extrabold text-gray-900">
              Ringkasan
            </h1>
          </div>

          <KasRtExportButton summary={summary} isLoading={isPending} />
        </div>

        <div className="mt-3">
          <KasRtMonthNavigator
            year={year}
            month={month}
            onPrevMonth={() => navigateMonth(-1)}
            onNextMonth={() => navigateMonth(1)}
            isLoading={isPending}
          />
        </div>
      </header>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain p-4"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance > 0 ? "none" : "transform 0.2s ease-out",
        }}
      >
        <KasRtSummaryHero summary={summary} isLoading={isPending} />
        <div className="mt-4" />
        <KasRtIplProgress
          totalHouses={summary.iplCollection.totalHouses}
          paidHouses={summary.iplCollection.paidHouses}
          percentage={summary.iplCollection.percentage}
          isLoading={isPending}
        />
        <div className="mt-4" />
        <KasRtMonthlyChart
          yearlyTrend={summary.yearlyTrend}
          isLoading={isPending}
        />
        <div className="mt-4" />
        <KasRtCategoryBreakdown
          byCategory={summary.selectedMonth.byCategory}
          totalAmount={
            summary.selectedMonth.income + summary.selectedMonth.expense
          }
          isLoading={isPending}
        />
        <div className="mt-4" />
        <KasRtQuickStats stats={summary.stats} isLoading={isPending} />
        <div className="h-8" />
      </div>
    </main>
  );
}
