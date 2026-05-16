"use client";

import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  PlusIcon,
  ChartBarIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

import { formatRupiah, formatRupiahCompact } from "@/lib/kas-rt-utils";
import type { KasRtTotals } from "@/types/kas-rt";

interface KasRtHeroProps {
  communityName: string;

  now: Date;

  totals: KasRtTotals;

  canSubmitTransaction: boolean;

  isRefreshing: boolean;

  onRefresh: () => void;

  onOpenDownload: () => void;

  onOpenForm: () => void;

  onOpenSummary?: () => void;

  onOpenHouseStatus?: () => void;
}

/**
 * Hero section with balance showcase and stats
 */
export function KasRtHero({
  communityName,
  now,
  totals,
  canSubmitTransaction,
  onOpenSummary,
  isRefreshing,
  onRefresh,
  onOpenDownload,
  onOpenForm,
  onOpenHouseStatus,
}: KasRtHeroProps) {
  return (
    <section
      className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white lg:max-w-4xl lg:mx-auto lg:w-full lg:rounded-b-2xl lg:px-6 lg:py-6"
      style={{
        background:
          "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
      }}
      aria-label="Kas RT"
    >
      {/* Decorative blobs */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10"
        aria-hidden
      />

      <div className="relative z-10">
        {/* Nav row */}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
              {communityName} · Keuangan
            </p>
            <h1 className="truncate text-lg font-extrabold leading-tight text-white">
              Kas RT
            </h1>
          </div>

          <button
            type="button"
            onClick={onOpenDownload}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
            aria-label="Unduh laporan kas RT"
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-white" />
          </button>

          {onOpenHouseStatus && (
            <button
              type="button"
              onClick={onOpenHouseStatus}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
              aria-label="Lihat status rumah"
            >
              <HomeIcon className="h-4 w-4 text-white" />
            </button>
          )}

          {onOpenSummary && (
            <button
              type="button"
              onClick={onOpenSummary}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
              aria-label="Lihat ringkasan keuangan"
            >
              <ChartBarIcon className="h-4 w-4 text-white" />
            </button>
          )}

          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isRefreshing}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 disabled:opacity-50"
            aria-label="Segarkan data"
          >
            <ArrowPathIcon
              className={`h-4 w-4 text-white ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Balance showcase */}
        <div className="mt-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-white/60">
              Saldo Total
            </p>
            <p className="mt-1 truncate text-[22px] font-extrabold leading-tight text-white">
              {formatRupiah(totals.balance)}
            </p>
            <p className="mt-1 text-[10px] text-white/50">
              Periode{" "}
              {now.toLocaleString("id-ID", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          {canSubmitTransaction && (
            <button
              type="button"
              onClick={onOpenForm}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/20 px-3.5 py-2.5 text-[11px] font-bold text-white backdrop-blur-sm transition hover:bg-white/30 active:scale-95"
              aria-label="Catat transaksi baru"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Catat
            </button>
          )}
        </div>

        {/* Stats strip — 3 informational metrics */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {/* Saldo akhir bulan lalu */}
          <div className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm">
            <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight text-white/60">
              Saldo Bln Lalu
            </p>
            <p className="mt-1 text-sm font-extrabold leading-tight text-white">
              {formatRupiahCompact(totals.balanceEndOfPrevMonth)}
            </p>
            <p className="mt-0.5 text-[8px] leading-tight text-white/50">
              {totals.prevMonthEndLabel}
            </p>
          </div>

          {/* Pemasukan bulan ini */}
          <div className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm">
            <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight text-white/60">
              Masuk Bln Ini
            </p>
            <p className="mt-1 text-sm font-extrabold leading-tight text-white">
              {formatRupiahCompact(totals.thisMonthIncome)}
            </p>
            <p className="mt-0.5 text-[8px] leading-tight text-white/50">
              {now.toLocaleString("id-ID", { month: "short" })}
            </p>
          </div>

          {/* Pengeluaran bulan ini */}
          <div className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm">
            <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight text-white/60">
              Keluar Bln Ini
            </p>
            <p className="mt-1 text-sm font-extrabold leading-tight text-white">
              {formatRupiahCompact(totals.thisMonthExpense)}
            </p>
            <p className="mt-0.5 text-[8px] leading-tight text-white/50">
              {now.toLocaleString("id-ID", { month: "short" })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
