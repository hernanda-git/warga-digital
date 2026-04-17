"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

import { useRouter } from "next/navigation";

import { useAuthStore } from "@/stores/auth-store";

import { usePullToRefresh } from "@/lib/hooks/use-pull-to-refresh";

import { useKasRtSummary } from "@/lib/hooks/use-kas-rt-summary";

import {
  KasRtMonthNavigator,
  KasRtSummaryHero,
  KasRtIplProgress,
  KasRtMonthlyChart,
  KasRtCategoryBreakdown,
  KasRtQuickStats,
  KasRtExportButton,
} from "@/components/kas-rt/summary";

import {
  KasRtSummaryHeroSkeleton,
  KasRtMonthlyChartSkeleton,
} from "@/components/kas-rt/summary/skeletons";
import type { KasRtSummaryResponse } from "@/types/kas-rt";

export default function KasRtSummaryPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Mount / auth guard ────────────────────────────────────────────────────
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [hasMounted, isAuthenticated, router]);

  // ── Summary hook ─────────────────────────────────────────────────────────
  const {
    summary,
    filter,
    isLoading,
    isRefreshing,
    error,
    nextMonth,
    prevMonth,
    refresh,
  } = useKasRtSummary();

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const { pullDistance, onTouchStart, onTouchMove, onTouchEnd } =
    usePullToRefresh({
      onRefresh: refresh,
      isRefreshing,
    });

  // ── Navigation back to main page ─────────────────────────────────────────
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // ── Error state ───────────────────────────────────────────────────────────
  if (hasMounted && error && !isLoading) {
    return (
      <main className="flex min-h-screen flex-col bg-app-surface-alt">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-sm font-medium text-red-600 mb-2">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Loading state (initial) ───────────────────────────────────────────────
  if (isLoading || !hasMounted) {
    return (
      <main className="flex min-h-screen flex-col bg-app-surface-alt">
        {/* Header skeleton */}
        <div className="sticky top-0 z-20 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gray-200"></div>
            <div className="flex-1 space-y-1">
              <div className="h-4 w-32 rounded bg-gray-200"></div>
              <div className="h-3 w-24 rounded bg-gray-200"></div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-gray-200"></div>
          </div>
        </div>

        {/* Content skeletons */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <KasRtSummaryHeroSkeleton />
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-full rounded-xl bg-gray-200"></div>
            <div className="h-48 w-full rounded-xl bg-gray-200"></div>
            <div className="h-64 w-full rounded-xl bg-gray-200"></div>
            <div className="h-48 w-full rounded-xl bg-gray-200"></div>
          </div>
        </div>
      </main>
    );
  }

  // Ensure summary exists
  if (!summary) {
    return (
      <main className="flex min-h-screen flex-col bg-app-surface-alt">
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-gray-500">Tidak ada data tersedia.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-app-surface-alt">
      {/* Sticky header with navigation */}
      <header className="sticky top-0 z-20 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Back button */}
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

          {/* Title */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Keuangan RT
            </p>
            <h1 className="truncate text-base font-extrabold text-gray-900">
              Ringkasan
            </h1>
          </div>

          {/* Export button */}
          <KasRtExportButton summary={summary} isLoading={isRefreshing} />
        </div>

        {/* Month navigator */}
        <div className="mt-3">
          <KasRtMonthNavigator
            year={filter.year}
            month={filter.month}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            isLoading={isRefreshing}
          />
        </div>
      </header>

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain p-4"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Hero section */}
        <KasRtSummaryHero summary={summary} isLoading={isRefreshing} />

        {/* Spacing */}
        <div className="mt-4" />

        {/* IPL Progress */}
        <KasRtIplProgress
          totalHouses={summary.iplCollection.totalHouses}
          paidHouses={summary.iplCollection.paidHouses}
          percentage={summary.iplCollection.percentage}
          isLoading={isRefreshing}
        />

        {/* Spacing */}
        <div className="mt-4" />

        {/* Monthly trend chart */}
        <KasRtMonthlyChart
          yearlyTrend={summary.yearlyTrend}
          isLoading={isRefreshing}
        />

        {/* Spacing */}
        <div className="mt-4" />

        {/* Category breakdown */}
        <KasRtCategoryBreakdown
          byCategory={summary.selectedMonth.byCategory}
          totalAmount={
            summary.selectedMonth.income + summary.selectedMonth.expense
          }
          isLoading={isRefreshing}
        />

        {/* Spacing */}
        <div className="mt-4" />

        {/* Quick stats */}
        <KasRtQuickStats stats={summary.stats} isLoading={isRefreshing} />

        {/* Bottom spacing for scroll */}
        <div className="h-8" />
      </div>
    </main>
  );
}
