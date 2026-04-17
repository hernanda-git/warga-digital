"use client";

import { useMemo } from "react";
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from "@heroicons/react/24/solid";
import { formatRupiah, formatRupiahCompact } from "@/lib/kas-rt-utils";
import type { KasRtSummaryResponse } from "@/types/kas-rt";

interface KasRtSummaryHeroProps {
  summary: KasRtSummaryResponse;
  isLoading?: boolean;
}

/**
 * Hero section displaying key financial metrics with month-over-month comparison
 */
export function KasRtSummaryHero({ summary, isLoading = false }: KasRtSummaryHeroProps) {
  const { selectedMonth, previousMonth } = summary;

  // Calculate percentage changes
  const incomeChange = useMemo(() => {
    if (previousMonth.income === 0) return selectedMonth.income > 0 ? 100 : 0;
    return ((selectedMonth.income - previousMonth.income) / previousMonth.income) * 100;
  }, [selectedMonth.income, previousMonth.income]);

  const expenseChange = useMemo(() => {
    if (previousMonth.expense === 0) return selectedMonth.expense > 0 ? 100 : 0;
    return ((selectedMonth.expense - previousMonth.expense) / previousMonth.expense) * 100;
  }, [selectedMonth.expense, previousMonth.expense]);

  const netChange = useMemo(() => {
    if (previousMonth.net === 0) return selectedMonth.net > 0 ? 100 : 0;
    return ((selectedMonth.net - previousMonth.net) / Math.abs(previousMonth.net)) * 100;
  }, [selectedMonth.net, previousMonth.net]);

  // Helper to render change badge
  const renderChangeBadge = (percent: number) => {
    const isPositive = percent >= 0;
    const absPercent = Math.abs(percent).toFixed(1);

    return (
      <span
        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
          isPositive
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {isPositive ? (
          <ArrowTrendingUpIcon className="h-3 w-3" />
        ) : (
          <ArrowTrendingDownIcon className="h-3 w-3" />
        )}
        {absPercent}%
      </span>
    );
  };

  if (isLoading) {
    return (
      <section className="shrink-0 overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary-600 to-primary-700 px-4 pb-6 pt-5 text-white">
        <div className="animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 rounded bg-white/20"></div>
            <div className="h-4 w-24 rounded bg-white/20"></div>
          </div>
          <div className="mt-4 h-8 w-40 rounded bg-white/20"></div>
          <div className="mt-2 h-3 w-56 rounded bg-white/20"></div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-white/15 p-2">
                <div className="h-2 w-full rounded bg-white/20"></div>
                <div className="mt-2 h-4 w-3/4 rounded bg-white/20"></div>
                <div className="mt-1 h-2 w-1/2 rounded bg-white/20"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="shrink-0 overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary-600 to-primary-700 px-4 pb-6 pt-5 text-white"
      aria-label="Ringkasan Keuangan"
    >
      {/* Decorative elements */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10"
        aria-hidden
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              {selectedMonth.label}
            </p>
            <h2 className="mt-1 text-lg font-extrabold leading-tight text-white">
              Ringkasan
            </h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
              Transaksi
            </p>
            <p className="text-sm font-bold text-white">
              {selectedMonth.transactionCount}
            </p>
          </div>
        </div>

        {/* Main balance */}
        <div className="mt-5">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-white/60">
            Saldo Bersih
          </p>
          <p className="mt-1 text-[28px] font-extrabold leading-tight text-white">
            {formatRupiah(selectedMonth.net)}
          </p>
        </div>

        {/* Stats grid */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {/* Income */}
          <div className="rounded-xl bg-white/15 p-2.5 text-center backdrop-blur-sm transition hover:bg-white/20">
            <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight text-white/60">
              Pemasukan
            </p>
            <div className="mt-1 flex items-center justify-center gap-1">
              <p className="text-sm font-extrabold leading-tight text-white">
                {formatRupiahCompact(selectedMonth.income)}
              </p>
              {renderChangeBadge(incomeChange)}
            </div>
            <p className="mt-0.5 text-[8px] leading-tight text-white/50">
              vs bulan sebelumnya
            </p>
          </div>

          {/* Expense */}
          <div className="rounded-xl bg-white/15 p-2.5 text-center backdrop-blur-sm transition hover:bg-white/20">
            <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight text-white/60">
              Pengeluaran
            </p>
            <div className="mt-1 flex items-center justify-center gap-1">
              <p className="text-sm font-extrabold leading-tight text-white">
                {formatRupiahCompact(selectedMonth.expense)}
              </p>
              {renderChangeBadge(expenseChange)}
            </div>
            <p className="mt-0.5 text-[8px] leading-tight text-white/50">
              vs bulan sebelumnya
            </p>
          </div>

          {/* Net comparison */}
          <div className="rounded-xl bg-white/15 p-2.5 text-center backdrop-blur-sm transition hover:bg-white/20">
            <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight text-white/60">
              Laba/Rugi
            </p>
            <div className="mt-1 flex items-center justify-center gap-1">
              <p className="text-sm font-extrabold leading-tight text-white">
                {formatRupiahCompact(selectedMonth.net)}
              </p>
              {renderChangeBadge(netChange)}
            </div>
            <p className="mt-0.5 text-[8px] leading-tight text-white/50">
              vs {previousMonth.label}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
