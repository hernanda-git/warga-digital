"use client";

import { formatRupiah } from "@/lib/kas-rt-utils";
import {
  completeMonthsForAmount,
  remainderForAmount,
  overrideOnlyMonthNumbers,
} from "@/lib/kas-rt-ipl";
import type { HouseTransactionStatus } from "@/types/kas-rt";

interface HouseTransactionStatusCardVerticalProps {
  data: HouseTransactionStatus;
  /** Renders the Adjust action when the viewer may manage kas RT. */
  canManage?: boolean;
  /** Opens the adjust dialog — covers both marking and revoking. */
  onAdjust?: (house: HouseTransactionStatus) => void;
}

const statusLabel = (status: string) => {
  if (status === "KONTRAKAN") return "Kontrakan";
  return "Pribadi";
};

const getStatusBadgeClass = (status: string) => {
  if (status === "PRIBADI") {
    return "bg-blue-100 text-blue-800";
  } else if (status === "KONTRAKAN") {
    return "bg-orange-100 text-orange-800";
  }
  return "bg-gray-100 text-gray-800";
};

/**
 * Vertical card displaying house name, blok, total transactions in 2026,
 * and horizontally scrollable monthly status buttons.
 *
 * Month fill has three distinct sources, deliberately rendered differently so
 * a credited month is never mistaken for money received:
 *   • paid     — real rupiah covers the month (≥ Rp120.000)
 *   • partial  — real rupiah covers part of the month
 *   • credited — covered by an active payment override, no money moved
 */
export function HouseTransactionStatusCardVertical({
  data,
  canManage = false,
  onAdjust,
}: HouseTransactionStatusCardVerticalProps) {
  const monthLabels = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  // Generate initials from blokRumah (e.g., "ABCD1" -> "ABCD")
  const getInitials = (blok: string) => {
    return blok.toUpperCase().slice(0, 4);
  };

  // ── Step-by-step fill: real money first, then override credit ────────────
  const { total2026, overrideMonthNumbers } = data;
  const paidCompleteMonths = completeMonthsForAmount(total2026);
  const paidRemainder = remainderForAmount(total2026);

  // Months credited by the override but NOT covered by real money. These are
  // the exact calendar months (e.g. NOV+DES), rendered distinctly so a waived
  // month is never mistaken for cash received.
  const creditedMonths = new Set(
    overrideOnlyMonthNumbers(total2026, overrideMonthNumbers),
  );

  const creditedLabel = data.overrideReason
    ? data.overrideReason.replace(/_/g, " ").toLowerCase()
    : "penyesuaian";

  const getMonthButtonClass = (monthIndex: number) => {
    // monthIndex is 0-based; month numbers are 1-based
    const monthNumber = monthIndex + 1;
    if (monthIndex < paidCompleteMonths) {
      // Fully paid with real money
      return "bg-app-primary text-white border-2 border-app-primary";
    }
    if (monthIndex === paidCompleteMonths && paidRemainder > 0) {
      // Partially paid with real money
      return "bg-app-primary-muted text-app-title border-2 border-app-primary-muted";
    }
    if (creditedMonths.has(monthNumber)) {
      // Credited by an override: same fill as a paid month, so the year reads
      // uniformly — only the border marks it as not backed by money.
      return "bg-app-primary text-white border-2 border-dashed border-white";
    }
    return "bg-white border-2 border-gray-200 text-gray-400";
  };

  const monthTitle = (monthIndex: number) => {
    const monthNumber = monthIndex + 1;
    const real = data.monthlyStatuses[monthIndex] ?? 0;
    if (monthIndex < paidCompleteMonths) {
      return `${monthLabels[monthIndex]}: ${formatRupiah(real)} (lunas)`;
    }
    if (monthIndex === paidCompleteMonths && paidRemainder > 0) {
      return `${monthLabels[monthIndex]}: ${formatRupiah(real)} (sebagian)`;
    }
    if (creditedMonths.has(monthNumber)) {
      return `${monthLabels[monthIndex]}: ditanggung penyesuaian (${creditedLabel})`;
    }
    return `${monthLabels[monthIndex]}: belum bayar`;
  };

  return (
    <article className="relative w-full max-w-[430px] bg-surface-container-lowest rounded-xl shadow-[0_12px_32px_rgba(0,40,5,0.06)] overflow-hidden">
      <div className="p-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
            <span className="font-headline text-2xl font-extrabold tracking-tighter leading-none">
              {getInitials(data.blokRumah)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline text-xs text-on-surface-variant/70 font-semibold mb-0.5">
              {data.name || data.blokRumah}
            </span>
            <span className="font-headline text-[10px] font-bold tracking-[0.1em] text-on-surface-variant opacity-60 uppercase">
              2026 TOTAL TRANSFER:
            </span>
            <span className="font-headline text-2xl font-extrabold text-primary tracking-tight">
              {formatRupiah(total2026)}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 pb-12">
        {/* Monthly Status Buttons - Horizontally Scrollable */}
        <div className="overflow-x-auto scrollbar-hide -mx-1">
          <div className="flex gap-2 px-1 pb-1">
            {Array.from({ length: 12 }).map((_, index) => (
              <button
                key={index}
                type="button"
                title={monthTitle(index)}
                className={`shrink-0 w-12 h-8 flex items-center justify-center rounded-lg font-bold text-[9px] font-headline tracking-tighter transition-colors ${getMonthButtonClass(
                  index,
                )}`}
              >
                {monthLabels[index]}
              </button>
            ))}
          </div>
        </div>

        {/* Management action — only for kas RT managers. One entry point:
            the dialog covers both marking and revoking. */}
        {canManage && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onAdjust?.(data)}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-100"
            >
              Adjust
            </button>
          </div>
        )}
      </div>

      <span
        className={`absolute bottom-4 right-4 inline-flex items-center px-3 py-1 text-[10px] font-medium rounded-full ${
          data.isSettled
            ? "bg-green-100 text-green-800"
            : getStatusBadgeClass(data.status)
        }`}
      >
        {data.isSettled ? "Lunas" : statusLabel(data.status)}
      </span>
    </article>
  );
}
