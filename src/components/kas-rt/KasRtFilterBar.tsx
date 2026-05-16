"use client";

import { FunnelIcon } from "@heroicons/react/24/outline";
import { FILTER_TYPE_OPTIONS } from "@/lib/kas-rt-constants";
import type { TransactionType } from "@/types/kas-rt";

interface KasRtFilterBarProps {
  typeFilter: "all" | TransactionType;
  setTypeFilter: (type: "all" | TransactionType) => void;
  activeAdvancedFilterCount: number;
  onOpenFilter: () => void;
}

/**
 * Filter bar with type tabs (Semua/Pemasukan/Pengeluaran)
 */
export function KasRtFilterBar({
  typeFilter,
  setTypeFilter,
  activeAdvancedFilterCount,
  onOpenFilter,
}: KasRtFilterBarProps) {
  return (
    <div
      className="shrink-0 bg-app-surface-alt px-4 py-3 lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6"
      style={{ borderBottom: "1px solid var(--color-input-border)" }}
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {FILTER_TYPE_OPTIONS.map(({ key, label }) => {
            const isActive = typeFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTypeFilter(key)}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                  isActive
                    ? "text-white shadow-sm"
                    : "bg-app-surface text-app-body-muted hover:bg-app-surface-alt"
                }`}
                style={
                  isActive ? { background: "var(--color-primary)" } : undefined
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onOpenFilter}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-surface transition hover:bg-app-surface-alt active:scale-90"
          aria-label="Filter lanjutan"
        >
          <FunnelIcon className="h-4 w-4 text-app-body-muted" />
          {activeAdvancedFilterCount > 0 && (
            <span
              className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold leading-none text-white"
              style={{ background: "var(--color-primary)" }}
            >
              {activeAdvancedFilterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
