"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import { toDateInputValue } from "@/lib/kas-rt-utils";
import { applyFocusRing, clearFocusRing } from "@/lib/kas-rt-utils";
import type { KasRtFilterState } from "@/types/kas-rt";

interface KasRtFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filterState: KasRtFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<KasRtFilterState>>;
  allCategoryNames: string[];
  allBlockNames: string[];
  now: Date;
  onApply: () => void;
}

/**
 * Advanced filter bottom sheet
 */
export function KasRtFilterSheet({
  isOpen,
  onClose,
  filterState,
  setFilterState,
  allCategoryNames,
  allBlockNames,
  now,
  onApply,
}: KasRtFilterSheetProps) {
  if (!isOpen) return null;

  const handleReset = () => {
    const defaultStart = toDateInputValue(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );
    setFilterState({
      typeFilter: "all",
      categoryFilter: "",
      blockFilter: "",
      startDate: defaultStart,
      endDate: toDateInputValue(now),
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
        style={{ animation: "fadeIn 0.2s ease" }}
      />
      <div
        className="fixed bottom-0 left-1/2 z-50 w-full -translate-x-1/2 rounded-t-[2rem] bg-app-surface shadow-[0_-20px_60px_rgba(0,40,5,0.18)]"
        style={{
          maxWidth: "var(--app-max-width)",
          animation: "sheetUp 0.3s cubic-bezier(0.34,1.4,0.64,1)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Filter transaksi"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3">
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: "var(--color-input-border)" }}
          />
        </div>

        <div className="px-5 pb-8 pt-3">
          {/* Sheet header */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-app-title">
                Filter Transaksi
              </h2>
              <p className="mt-0.5 text-xs text-app-body-muted">
                Saring berdasarkan kategori, blok, atau tanggal
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-2xl transition hover:bg-app-surface-alt active:scale-90"
              aria-label="Tutup filter"
            >
              <XMarkIcon className="h-5 w-5 text-app-body-muted" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                Kategori
              </label>
              <select
                value={filterState.categoryFilter}
                onChange={(e) =>
                  setFilterState((prev) => ({
                    ...prev,
                    categoryFilter: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                style={{ borderColor: "var(--color-input-border)" }}
                onFocus={(e) => applyFocusRing(e.currentTarget)}
                onBlur={(e) => clearFocusRing(e.currentTarget)}
              >
                <option value="">Semua kategori</option>
                {allCategoryNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Block */}
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                Blok
              </label>
              <select
                value={filterState.blockFilter}
                onChange={(e) =>
                  setFilterState((prev) => ({
                    ...prev,
                    blockFilter: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                style={{ borderColor: "var(--color-input-border)" }}
                onFocus={(e) => applyFocusRing(e.currentTarget)}
                onBlur={(e) => clearFocusRing(e.currentTarget)}
              >
                <option value="">Semua blok</option>
                {allBlockNames.map((blok) => (
                  <option key={blok} value={blok}>
                    {blok}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  Dari
                </label>
                <input
                  type="date"
                  value={filterState.startDate}
                  onChange={(e) =>
                    setFilterState((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                  style={{ borderColor: "var(--color-input-border)" }}
                  onFocus={(e) => applyFocusRing(e.currentTarget)}
                  onBlur={(e) => clearFocusRing(e.currentTarget)}
                />
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  Hingga
                </label>
                <input
                  type="date"
                  value={filterState.endDate}
                  onChange={(e) =>
                    setFilterState((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                  style={{ borderColor: "var(--color-input-border)" }}
                  onFocus={(e) => applyFocusRing(e.currentTarget)}
                  onBlur={(e) => clearFocusRing(e.currentTarget)}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95"
              style={{ background: "var(--color-surface-alt)" }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                onApply();
                onClose();
              }}
              className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95"
              style={{
                background: "var(--color-primary)",
                boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
              }}
            >
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
