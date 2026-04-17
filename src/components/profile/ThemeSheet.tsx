"use client";

import React, { useEffect, useRef } from "react";
import { XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import { THEMES, getTheme } from "@/lib/themes";
import { UI_CONFIG } from "@/config/profile";

interface ThemeSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean;
  /** Callback to close the sheet */
  onClose: () => void;
  /** Currently selected theme ID */
  currentThemeId: string;
  /** Callback when a theme is selected */
  onSelect: (themeId: string) => void;
  /** Whether a theme is being saved */
  saving?: boolean;
}

/**
 * Bottom sheet component for selecting app theme
 * Shows a grid of theme options with the current selection highlighted
 *
 * @example
 * ```tsx
 * <ThemeSheet
 *   isOpen={themeSheetOpen}
 *   onClose={() => setThemeSheetOpen(false)}
 *   currentThemeId={profile?.themeId ?? "green"}
 *   onSelect={handleThemeSelect}
 *   saving={appearanceSaving}
 * />
 * ```
 */
export function ThemeSheet({
  isOpen,
  onClose,
  currentThemeId,
  onSelect,
  saving = false,
}: ThemeSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on outside click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 transition-opacity"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="theme-sheet-title"
    >
      {/* Sheet Container */}
      <div
        ref={sheetRef}
        className={`
          w-full max-w-lg
          bg-base-100 rounded-t-2xl
          transform transition-transform
          max-h-[85vh] overflow-hidden
        `}
        style={{
          animation: `slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h2
            id="theme-sheet-title"
            className="text-lg font-semibold text-base-content"
          >
            Tema
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Tutup"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Grid */}
        <div className="p-4 overflow-y-auto">
          <div className="grid grid-cols-4 gap-3">
            {THEMES.map((theme) => {
              const themeConfig = getTheme(theme.id);
              const isSelected = currentThemeId === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onSelect(theme.id)}
                  disabled={saving}
                  className={`
                    relative flex flex-col items-center gap-2 p-3
                    rounded-xl border-2 transition-all
                    ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-base-300 hover:border-base-content/20 bg-base-100"
                    }
                    ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  `}
                  aria-pressed={isSelected}
                  aria-label={`Pilih tema ${theme.name}`}
                >
                  {/* Color Swatch */}
                  <div
                    className="w-10 h-10 rounded-full shadow-inner"
                    style={{
                      backgroundColor: themeConfig.colors.primary,
                    }}
                  >
                    {/* Selected Check */}
                    {isSelected && (
                      <div className="w-full h-full flex items-center justify-center">
                        <CheckIcon className="w-5 h-5 text-white drop-shadow" />
                      </div>
                    )}
                  </div>

                  {/* Theme Name */}
                  <span
                    className={`
                      text-xs font-medium text-center leading-tight
                      ${isSelected ? "text-primary" : "text-base-content/70"}
                    `}
                  >
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Theme Color Legend */}
          <div className="mt-4 pt-4 border-t border-base-300">
            <p className="text-xs text-base-content/50 mb-2">
              Warna tema aplikasi
            </p>
          </div>

          {/* Loading Indicator */}
          {saving && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-base-content/60">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Menyimpan...</span>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-4 bg-base-200/50 text-center">
          <p className="text-xs text-base-content/50">
            Tema yang dipilih akan berlaku untuk seluruh aplikasi
          </p>
        </div>
      </div>

      {/* CSS Keyframes (inline) */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Skeleton loader for ThemeSheet
 */
export function ThemeSheetSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-lg bg-base-100 rounded-t-2xl p-4">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-base-300 rounded w-32 animate-pulse" />
          <div className="h-8 w-8 bg-base-300 rounded animate-pulse" />
        </div>

        {/* Theme Grid Skeleton */}
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-3">
              <div className="w-10 h-10 bg-base-300 rounded-full animate-pulse" />
              <div className="h-3 bg-base-300 rounded w-12 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
