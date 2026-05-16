"use client";

import { useCallback, useTransition, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePullToRefresh } from "@/lib/hooks/use-pull-to-refresh";
import {
  KasRtMonthNavigator,
  KasRtSummaryHero,
  KasRtIplProgress,
  KasRtCategoryBreakdown,
  KasRtQuickStats,
  KasRtExportButton,
} from "@/components/kas-rt/summary";
import { KasRtMonthlyChartV2 } from "@/components/kas-rt/summary/KasRtMonthlyChartV2";
import type { KasRtSummaryResponse } from "@/types/kas-rt";

interface KasRtSummaryV2ClientProps {
  summary: KasRtSummaryResponse;
  year: number;
  month: number;
}

export default function KasRtSummaryV2Client({
  summary,
  year,
  month,
}: KasRtSummaryV2ClientProps) {
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
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6 lg:py-6">
      {/* Sticky header with navigation */}
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 transition hover:bg-gray-200 active:scale-95 lg:hidden"
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

        <div className="px-4 pb-3">
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
        className="flex-1 overflow-y-auto overscroll-contain"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance > 0 ? "none" : "transform 0.2s ease-out",
        }}
      >
        {/* Hero Card */}
        <div className="mt-4 animate-in delay-1">
          <KasRtSummaryHero summary={summary} isLoading={isPending} />
        </div>

        {/* IPL Progress */}
        <div className="mt-4 animate-in delay-2">
          <KasRtIplProgress
            totalHouses={summary.iplCollection.totalHouses}
            paidHouses={summary.iplCollection.paidHouses}
            percentage={summary.iplCollection.percentage}
            isLoading={isPending}
          />
        </div>

        {/* Monthly Trend Chart */}
        <div className="mt-4 animate-in delay-3">
          <KasRtMonthlyChartV2
            yearlyTrend={summary.yearlyTrend}
            isLoading={isPending}
          />
        </div>

        {/* Category Breakdown */}
        <div className="mt-4 animate-in delay-4">
          <KasRtCategoryBreakdown
            byCategory={summary.selectedMonth.byCategory}
            totalAmount={
              summary.selectedMonth.income + summary.selectedMonth.expense
            }
            isLoading={isPending}
          />
        </div>

        {/* Quick Stats */}
        <div className="mt-4 animate-in delay-5">
          <KasRtQuickStats stats={summary.stats} isLoading={isPending} />
        </div>

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-in {
          animation: fadeInUp 0.4s ease-out forwards;
        }

        .delay-1 {
          animation-delay: 0.05s;
        }

        .delay-2 {
          animation-delay: 0.1s;
        }

        .delay-3 {
          animation-delay: 0.15s;
        }

        .delay-4 {
          animation-delay: 0.2s;
        }

        .delay-5 {
          animation-delay: 0.25s;
        }
      `}</style>
    </main>
  );
}
