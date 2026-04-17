"use client";

import { formatRupiah } from "@/lib/kas-rt-utils";
import type { HouseTransactionStatus } from "@/types/kas-rt";

interface HouseTransactionStatusCardVerticalProps {
  data: HouseTransactionStatus;
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
 */
export function HouseTransactionStatusCardVertical({
  data: { blokRumah, name, status, total2026, monthlyStatuses },
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

  // ── Step-by-Step Filling Logic Based on Total ────────────────────────────
  //
  // Filling progresses sequentially from January regardless of actual payment timing.
  // Uses total2026 to determine how many months are "filled" at Rp120,000/month.
  //
  // Pre-calculated values for efficient rendering.
  const monthlyAmount = 120000;
  const completeMonths = Math.floor(total2026 / monthlyAmount);
  const remainder = total2026 % monthlyAmount;
  // Filled months: completeMonths fully paid, plus partial if remainder > 0

  // ── Month Button Styling: Visual Feedback for Step-by-Step Filling ───────
  //
  // Color scheme based on total2026 filling:
  // - App primary: Fully filled month (Rp120,000 complete)
  // - Primary muted: Partially filled month (remainder payment)
  // - Gray/white: Unfilled months (inactive/empty)
  const getMonthButtonClass = (amount: number, monthIndex: number) => {
    if (monthIndex < completeMonths) {
      // Fully filled months
      return "bg-app-primary text-white border-2 border-app-primary";
    } else if (monthIndex === completeMonths && remainder > 0) {
      // Partially filled current month
      return "bg-app-primary-muted text-app-title border-2 border-app-primary-muted";
    } else {
      // Unfilled months (inactive)
      return "bg-white border-2 border-gray-200 text-gray-400";
    }
  };

  return (
    <article className="relative w-full max-w-[430px] bg-surface-container-lowest rounded-xl shadow-[0_12px_32px_rgba(0,40,5,0.06)] overflow-hidden">
      <div className="p-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
            <span className="font-headline text-2xl font-extrabold tracking-tighter leading-none">
              {getInitials(blokRumah)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline text-xs text-on-surface-variant/70 font-semibold mb-0.5">
              {name || blokRumah}
            </span>
            <span className="font-headline text-[10px] font-bold tracking-[0.1em] text-on-surface-variant opacity-60 uppercase">
              2026 TOTAL TRANSFER:
            </span>
            <span className="font-headline text-2xl font-extrabold text-primary tracking-tight">
              {formatRupiah(total2026)}
            </span>
          </div>
        </div>
        <button className="p-1 rounded-full hover:bg-surface-container transition-colors duration-200">
          <span className="material-symbols-outlined text-on-surface-variant">
            more_vert
          </span>
        </button>
      </div>
      <div className="px-6 pb-12">
        {/* Monthly Status Buttons - Horizontally Scrollable */}
        <div className="overflow-x-auto scrollbar-hide -mx-1">
          <div className="flex gap-2 px-1 pb-1">
            {monthlyStatuses.map((amount, index) => (
              <button
                key={index}
                type="button"
                className={`shrink-0 w-12 h-8 flex items-center justify-center rounded-lg font-bold text-[9px] font-headline tracking-tighter transition-colors ${getMonthButtonClass(amount, index)}`}
              >
                {monthLabels[index]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <span
        className={`absolute bottom-4 right-4 inline-flex items-center px-3 py-1 text-[10px] font-medium rounded-full ${getStatusBadgeClass(status)}`}
      >
        {statusLabel(status)}
      </span>
    </article>
  );
}
