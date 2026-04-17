"use client";

import { useState, useEffect, useRef } from "react";
import {
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { DaySelector } from "./DaySelector";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface JasaFiltersProps {
  categories: Array<{ id: string; name: string; icon: string | null }>;
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  selectedDays: Record<string, boolean>;
  onDaysChange: (days: Record<string, boolean>) => void;
  selectedStatus: boolean | null;
  onStatusChange: (status: boolean | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  minPrice: number | null;
  onMinPriceChange: (price: number | null) => void;
  maxPrice: number | null;
  onMaxPriceChange: (price: number | null) => void;
  className?: string;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const DEFAULT_DAYS: Record<string, boolean> = {
  senin: true,
  selasa: true,
  rabu: true,
  kamis: true,
  jumat: true,
  sabtu: true,
  minggu: false,
  tanggal_merah: false,
};

const AVAILABILITY_OPTIONS = [
  { label: "Semua", value: null },
  { label: "✓ Tersedia", value: true },
  { label: "✗ Tidak Tersedia", value: false },
] as const;

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function areDaysDefault(days: Record<string, boolean>): boolean {
  return Object.entries(DEFAULT_DAYS).every(([key, val]) => days[key] === val);
}

function calcActiveCount(
  status: boolean | null,
  min: number | null,
  max: number | null,
  days: Record<string, boolean>,
): number {
  return (
    (status !== null ? 1 : 0) +
    (min !== null || max !== null ? 1 : 0) +
    (!areDaysDefault(days) ? 1 : 0)
  );
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function JasaFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedDays,
  onDaysChange,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  className = "",
}: JasaFiltersProps) {
  /* ── Local state ──────────────────────────────────────────────────────── */
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Sheet-local (uncommitted) state
  const [sheetStatus, setSheetStatus] = useState<boolean | null>(
    selectedStatus,
  );
  const [sheetDays, setSheetDays] = useState<Record<string, boolean>>({
    ...selectedDays,
  });
  const [sheetMinPrice, setSheetMinPrice] = useState<number | null>(minPrice);
  const [sheetMaxPrice, setSheetMaxPrice] = useState<number | null>(maxPrice);

  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ── Debounced search ─────────────────────────────────────────────────── */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, onSearchChange]);

  // Keep local search in sync with external prop resets
  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  /* ── Sync sheet state when sheet opens ───────────────────────────────── */
  useEffect(() => {
    if (sheetOpen) {
      setSheetStatus(selectedStatus);
      setSheetDays({ ...selectedDays });
      setSheetMinPrice(minPrice);
      setSheetMaxPrice(maxPrice);
    }
  }, [sheetOpen, selectedStatus, selectedDays, minPrice, maxPrice]);

  // Sync sheet status when it changes while sheet is open
  useEffect(() => {
    if (sheetOpen) {
      setSheetStatus(selectedStatus);
    }
  }, [selectedStatus, sheetOpen]);

  /* ── Body overflow lock ──────────────────────────────────────────────── */
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (sheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev;
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  /* ── Derived values ──────────────────────────────────────────────────── */
  const activeFilterCount = calcActiveCount(
    selectedStatus,
    minPrice,
    maxPrice,
    selectedDays,
  );

  const sheetActiveFilterCount = calcActiveCount(
    sheetStatus,
    sheetMinPrice,
    sheetMaxPrice,
    sheetDays,
  );

  /* ── Sheet actions ───────────────────────────────────────────────────── */
  const openSheet = () => setSheetOpen(true);
  const closeSheet = () => setSheetOpen(false);

  const handleApply = () => {
    onStatusChange(sheetStatus);
    onDaysChange(sheetDays);
    onMinPriceChange(sheetMinPrice);
    onMaxPriceChange(sheetMaxPrice);
    closeSheet();
  };

  const handleSheetReset = () => {
    setSheetStatus(null);
    setSheetDays({ ...DEFAULT_DAYS });
    setSheetMinPrice(null);
    setSheetMaxPrice(null);
  };

  const handleSearchClear = () => {
    setLocalSearch("");
    onSearchChange("");
    searchInputRef.current?.focus();
  };

  /* ── Chip list (Semua + categories) ──────────────────────────────────── */
  const allChips: Array<{
    id: string | null;
    name: string;
    icon: string | null;
  }> = [{ id: null, name: "Semua", icon: null }, ...categories];

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* ═══════════════════════════════════════════════════════════════════
          1. Search Bar
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "var(--color-surface)",
          border: searchFocused
            ? "1.5px solid var(--color-primary)"
            : "1.5px solid var(--color-input-border)",
          borderRadius: "999px",
          padding: "0 14px",
          height: "46px",
          boxShadow: searchFocused
            ? "0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)"
            : "none",
          transition: "border-color 180ms ease, box-shadow 180ms ease",
        }}
      >
        <MagnifyingGlassIcon
          style={{
            width: "18px",
            height: "18px",
            flexShrink: 0,
            color: searchFocused
              ? "var(--color-primary)"
              : "var(--color-body-muted)",
            transition: "color 180ms ease",
          }}
        />
        <input
          ref={searchInputRef}
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Cari layanan..."
          className="outline-none"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            fontSize: "14px",
            color: "var(--color-body)",
            minWidth: 0,
          }}
        />
        {localSearch && (
          <button
            type="button"
            onClick={handleSearchClear}
            aria-label="Hapus pencarian"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "var(--color-body-muted)",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <XMarkIcon
              style={{ width: "12px", height: "12px", color: "white" }}
            />
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          2. Category Chips Row + Advanced Filter Button
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Scrollable chips */}
        <div
          className="scrollbar-none"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflowX: "auto",
            flex: 1,
            padding: "2px 0",
          }}
        >
          {allChips.map((chip) => {
            const isActive = selectedCategory === chip.id;
            return (
              <button
                key={chip.id ?? "__all__"}
                type="button"
                onClick={() => onCategoryChange(chip.id)}
                style={
                  isActive
                    ? {
                        background: "var(--color-primary)",
                        color: "white",
                        border: "1.5px solid var(--color-primary)",
                        boxShadow: "0 2px 8px -2px var(--color-primary-shadow)",
                        borderRadius: "999px",
                        padding: "5px 14px",
                        fontSize: "13px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        cursor: "pointer",
                        transition: "all 180ms ease",
                      }
                    : {
                        background: "var(--color-surface)",
                        color: "var(--color-body)",
                        border: "1.5px solid var(--color-input-border)",
                        borderRadius: "999px",
                        padding: "5px 14px",
                        fontSize: "13px",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        cursor: "pointer",
                        transition: "all 180ms ease",
                      }
                }
              >
                {chip.icon ? `${chip.icon} ${chip.name}` : chip.name}
              </button>
            );
          })}
        </div>

        {/* Advanced filter button */}
        <button
          type="button"
          onClick={openSheet}
          aria-label="Filter lanjutan"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            flexShrink: 0,
            height: "36px",
            padding: "0 12px",
            borderRadius: "999px",
            border:
              activeFilterCount > 0
                ? "1.5px solid var(--color-primary)"
                : "1.5px solid var(--color-input-border)",
            background:
              activeFilterCount > 0
                ? "color-mix(in srgb, var(--color-primary) 10%, transparent)"
                : "var(--color-surface)",
            cursor: "pointer",
            transition: "all 180ms ease",
          }}
        >
          <AdjustmentsHorizontalIcon
            style={{
              width: "18px",
              height: "18px",
              color:
                activeFilterCount > 0
                  ? "var(--color-primary)"
                  : "var(--color-body-muted)",
            }}
          />
          {activeFilterCount > 0 && (
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--color-primary)",
                lineHeight: 1,
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          3. Quick Availability Pills
      ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", gap: "6px" }}>
        {AVAILABILITY_OPTIONS.map((opt) => {
          const isActive = selectedStatus === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onStatusChange(opt.value)}
              style={{
                flex: 1,
                borderRadius: "10px",
                padding: "7px 4px",
                fontSize: "12.5px",
                fontWeight: isActive ? 600 : 500,
                textAlign: "center",
                whiteSpace: "nowrap",
                border: isActive
                  ? "1.5px solid var(--color-primary)"
                  : "1.5px solid var(--color-input-border)",
                background: isActive
                  ? "color-mix(in srgb, var(--color-primary) 11%, transparent)"
                  : "var(--color-surface)",
                color: isActive
                  ? "var(--color-primary)"
                  : "var(--color-body-muted)",
                cursor: "pointer",
                transition: "all 180ms ease",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Bottom Sheet
      ═══════════════════════════════════════════════════════════════════ */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div
            role="presentation"
            onClick={closeSheet}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 40,
              background: "rgba(0,0,0,0.42)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              animation: "fadeIn 0.22s ease",
            }}
          />

          {/* Sheet panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter Lanjutan"
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: "430px",
              zIndex: 50,
              background: "var(--color-surface)",
              borderRadius: "24px 24px 0 0",
              animation: "slideUp 0.3s ease",
              display: "flex",
              flexDirection: "column",
              maxHeight: "88dvh",
              boxShadow: "0 -8px 40px -4px rgba(0,0,0,0.18)",
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                paddingTop: "12px",
                paddingBottom: "4px",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "4px",
                  borderRadius: "999px",
                  background: "var(--color-input-border)",
                }}
              />
            </div>

            {/* Sheet header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 20px 14px",
                flexShrink: 0,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "var(--color-title)",
                  }}
                >
                  Filter Lanjutan
                </h2>
                {sheetActiveFilterCount > 0 && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "white",
                      background: "var(--color-primary)",
                      borderRadius: "999px",
                      padding: "2px 8px",
                      lineHeight: 1.5,
                    }}
                  >
                    {sheetActiveFilterCount}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={closeSheet}
                aria-label="Tutup"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "1.5px solid var(--color-input-border)",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <XMarkIcon
                  style={{
                    width: "17px",
                    height: "17px",
                    color: "var(--color-body-muted)",
                  }}
                />
              </button>
            </div>

            {/* ── Scrollable body ─────────────────────────────────────── */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 20px",
                display: "flex",
                flexDirection: "column",
                gap: "24px",
              }}
            >
              {/* Availability toggle */}
              <div>
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--color-title)",
                  }}
                >
                  Ketersediaan
                </p>
                <div style={{ display: "flex", gap: "6px" }}>
                  {AVAILABILITY_OPTIONS.map((opt) => {
                    const isActive = sheetStatus === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setSheetStatus(opt.value)}
                        style={{
                          flex: 1,
                          borderRadius: "10px",
                          padding: "9px 4px",
                          fontSize: "13px",
                          fontWeight: isActive ? 600 : 500,
                          textAlign: "center",
                          border: isActive
                            ? "1.5px solid var(--color-primary)"
                            : "1.5px solid var(--color-input-border)",
                          background: isActive
                            ? "color-mix(in srgb, var(--color-primary) 11%, transparent)"
                            : "var(--color-surface-alt)",
                          color: isActive
                            ? "var(--color-primary)"
                            : "var(--color-body-muted)",
                          cursor: "pointer",
                          transition: "all 180ms ease",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Day selector */}
              <DaySelector value={sheetDays} onChange={setSheetDays} />

              {/* Price range */}
              <div>
                <p
                  style={{
                    margin: "0 0 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--color-title)",
                  }}
                >
                  Rentang Harga (Rp)
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  {/* Min input */}
                  <div style={{ flex: 1, position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        top: "-8px",
                        left: "12px",
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        color: "var(--color-body-muted)",
                        background: "var(--color-surface)",
                        padding: "0 4px",
                        zIndex: 1,
                      }}
                    >
                      Min
                    </span>
                    <input
                      type="number"
                      value={sheetMinPrice ?? ""}
                      onChange={(e) =>
                        setSheetMinPrice(
                          e.target.value === ""
                            ? null
                            : parseFloat(e.target.value),
                        )
                      }
                      placeholder="0"
                      min={0}
                      className="outline-none"
                      style={{
                        width: "100%",
                        border: "1.5px solid var(--color-input-border)",
                        borderRadius: "12px",
                        padding: "10px 12px",
                        fontSize: "14px",
                        color: "var(--color-body)",
                        background: "var(--color-surface)",
                      }}
                    />
                  </div>

                  {/* Divider dash */}
                  <div
                    style={{
                      width: "14px",
                      height: "1.5px",
                      background: "var(--color-input-border)",
                      flexShrink: 0,
                      marginTop: "4px",
                    }}
                  />

                  {/* Max input */}
                  <div style={{ flex: 1, position: "relative" }}>
                    <span
                      style={{
                        position: "absolute",
                        top: "-8px",
                        left: "12px",
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        color: "var(--color-body-muted)",
                        background: "var(--color-surface)",
                        padding: "0 4px",
                        zIndex: 1,
                      }}
                    >
                      Max
                    </span>
                    <input
                      type="number"
                      value={sheetMaxPrice ?? ""}
                      onChange={(e) =>
                        setSheetMaxPrice(
                          e.target.value === ""
                            ? null
                            : parseFloat(e.target.value),
                        )
                      }
                      placeholder="∞"
                      min={0}
                      className="outline-none"
                      style={{
                        width: "100%",
                        border: "1.5px solid var(--color-input-border)",
                        borderRadius: "12px",
                        padding: "10px 12px",
                        fontSize: "14px",
                        color: "var(--color-body)",
                        background: "var(--color-surface)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom spacer */}
              <div style={{ height: "4px", flexShrink: 0 }} />
            </div>

            {/* ── Sheet footer ─────────────────────────────────────────── */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                padding: "14px 20px",
                paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
                borderTop: "1px solid var(--color-input-border)",
                flexShrink: 0,
                background: "var(--color-surface)",
              }}
            >
              {/* Reset */}
              <button
                type="button"
                onClick={handleSheetReset}
                disabled={sheetActiveFilterCount === 0}
                style={{
                  flex: 1,
                  borderRadius: "12px",
                  padding: "12px 0",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "1.5px solid var(--color-input-border)",
                  background: "transparent",
                  color:
                    sheetActiveFilterCount === 0
                      ? "var(--color-body-muted)"
                      : "var(--color-body)",
                  cursor:
                    sheetActiveFilterCount === 0 ? "not-allowed" : "pointer",
                  opacity: sheetActiveFilterCount === 0 ? 0.45 : 1,
                  transition: "all 180ms ease",
                }}
              >
                Reset
              </button>

              {/* Apply */}
              <button
                type="button"
                onClick={handleApply}
                style={{
                  flex: 2,
                  borderRadius: "12px",
                  padding: "12px 0",
                  fontSize: "14px",
                  fontWeight: 700,
                  border: "none",
                  background: "var(--color-primary)",
                  color: "white",
                  boxShadow: "0 4px 14px -3px var(--color-primary-shadow)",
                  cursor: "pointer",
                  transition: "all 180ms ease",
                }}
              >
                Terapkan
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
