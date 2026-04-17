"use client";

import { formatRupiah } from "@/lib/kas-rt-utils";
import type { HouseTransactionStatus } from "@/types/kas-rt";

interface HouseTransactionStatusCardProps {
  data: HouseTransactionStatus;
}

/**
 * Card displaying house name, blok, total transactions in 2026, and monthly status squares.
 */
export function HouseTransactionStatusCard({
  data: { blokRumah, name, total2026, monthlyStatuses },
}: HouseTransactionStatusCardProps) {
  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <article className="rounded-2xl bg-app-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      {/* Header with blok and name */}
      <div className="mb-2">
        <div className="text-sm font-medium text-app-title">{blokRumah}</div>
        <div className="text-xs text-app-body-muted truncate">{name}</div>
      </div>

      {/* Total */}
      <div className="mb-3 text-right">
        <div className="text-sm font-extrabold text-app-primary">
          {formatRupiah(total2026)}
        </div>
        <div className="text-[10px] text-app-body-muted">Total 2026</div>
      </div>

      {/* Monthly squares */}
      <div className="grid grid-cols-12 gap-1">
        {monthlyStatuses.map((amount, index) => {
          let bgClass = "bg-transparent"; // default none
          if (amount >= 120000) {
            bgClass = "bg-app-primary"; // complete
          } else if (amount > 0) {
            bgClass = "bg-secondary-container"; // partial, assuming secondary-container is defined in tailwind
          }

          return (
            <div
              key={index}
              className={`w-4 h-4 rounded ${bgClass}`}
              title={`${monthLabels[index]}: ${formatRupiah(amount)}`}
            />
          );
        })}
      </div>
    </article>
  );
}
