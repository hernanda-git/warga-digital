"use client";

import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  TableCellsIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { applyFocusRing, clearFocusRing } from "@/lib/kas-rt-utils";
import { DOWNLOAD_FORMAT_OPTIONS } from "@/lib/kas-rt-constants";
import type { KasRtDownloadState } from "@/types/kas-rt";

interface KasRtDownloadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  downloadState: KasRtDownloadState;
  setDownloadState: React.Dispatch<React.SetStateAction<KasRtDownloadState>>;
  allCategoryNames: string[];
  isDownloading: boolean;
  downloadError: string | null;
  onDownload: () => Promise<void>;
}

/**
 * Download report bottom sheet
 */
export function KasRtDownloadSheet({
  isOpen,
  onClose,
  downloadState,
  setDownloadState,
  allCategoryNames,
  isDownloading,
  downloadError,
  onDownload,
}: KasRtDownloadSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={() => !isDownloading && onClose()}
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
        aria-labelledby="kas-rt-download-title"
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
              <h2
                id="kas-rt-download-title"
                className="text-lg font-extrabold text-app-title"
              >
                Unduh Laporan
              </h2>
              <p className="mt-0.5 text-xs text-app-body-muted">
                Pilih rentang tanggal dan format laporan
              </p>
            </div>
            <button
              type="button"
              onClick={() => !isDownloading && onClose()}
              disabled={isDownloading}
              className="flex h-9 w-9 items-center justify-center rounded-2xl transition hover:bg-app-surface-alt active:scale-90 disabled:opacity-40"
              aria-label="Tutup"
            >
              <XMarkIcon className="h-5 w-5 text-app-body-muted" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Format selector */}
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                Format Laporan
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DOWNLOAD_FORMAT_OPTIONS.map((fmt) => {
                  const isSelected = downloadState.format === fmt.value;
                  return (
                    <button
                      key={fmt.value}
                      type="button"
                      onClick={() =>
                        setDownloadState((prev) => ({
                          ...prev,
                          format: fmt.value as "excel" | "pdf",
                        }))
                      }
                      className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition active:scale-95 ${
                        isSelected
                          ? "text-white shadow-sm"
                          : "bg-white text-app-body-muted"
                      }`}
                      style={
                        isSelected
                          ? {
                              background: "var(--color-primary)",
                              borderColor: "var(--color-primary)",
                            }
                          : { borderColor: "var(--color-input-border)" }
                      }
                    >
                      {fmt.icon === "table" ? (
                        <TableCellsIcon className="h-4 w-4" />
                      ) : (
                        <DocumentTextIcon className="h-4 w-4" />
                      )}
                      {fmt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={downloadState.startDate}
                  onChange={(e) =>
                    setDownloadState((prev) => ({
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
                  value={downloadState.endDate}
                  onChange={(e) =>
                    setDownloadState((prev) => ({
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

            {/* Category */}
            <div>
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                Kategori{" "}
                <span className="font-normal normal-case text-app-body-muted/70">
                  (opsional)
                </span>
              </label>
              <select
                value={downloadState.category}
                onChange={(e) =>
                  setDownloadState((prev) => ({
                    ...prev,
                    category: e.target.value,
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
              <label
                htmlFor="download-block"
                className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
              >
                Blok{" "}
                <span className="font-normal normal-case text-app-body-muted/70">
                  (opsional)
                </span>
              </label>
              <input
                id="download-block"
                type="text"
                value={downloadState.block}
                onChange={(e) =>
                  setDownloadState((prev) => ({
                    ...prev,
                    block: e.target.value,
                  }))
                }
                placeholder="Biarkan kosong untuk semua blok"
                className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                style={{ borderColor: "var(--color-input-border)" }}
                onFocus={(e) => applyFocusRing(e.currentTarget)}
                onBlur={(e) => clearFocusRing(e.currentTarget)}
              />
            </div>

            {/* Error banner */}
            {downloadError && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <p className="text-[13px] text-red-600">{downloadError}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => !isDownloading && onClose()}
              disabled={isDownloading}
              className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
              style={{ background: "var(--color-surface-alt)" }}
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => void onDownload()}
              disabled={isDownloading || !downloadState.startDate || !downloadState.endDate}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background:
                  isDownloading || !downloadState.startDate || !downloadState.endDate
                    ? "var(--color-body-muted)"
                    : "var(--color-primary)",
                boxShadow:
                  isDownloading || !downloadState.startDate || !downloadState.endDate
                    ? "none"
                    : "0 8px 22px -12px var(--color-primary-shadow)",
              }}
            >
              {isDownloading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Menyiapkan...
                </>
              ) : (
                <>
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Unduh Laporan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
