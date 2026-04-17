"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { formatRupiah } from "@/lib/kas-rt-utils";
import type { TransactionItem, DuplicateWarningState } from "@/types/kas-rt";

interface KasRtDuplicateWarningDialogProps {
  duplicateWarning: DuplicateWarningState | null;
  formReference: string;
  onClose: () => void;
}

/**
 * Duplicate warning dialog
 */
export function KasRtDuplicateWarningDialog({
  duplicateWarning,
  formReference,
  onClose,
}: KasRtDuplicateWarningDialogProps) {
  if (!duplicateWarning) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
        style={{ animation: "fadeIn 0.2s ease" }}
      />
      <div
        className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-app-surface p-6 shadow-[0_32px_64px_rgba(0,0,0,0.18)]"
        style={{
          maxWidth: "360px",
          animation: "dialogIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        role="alertdialog"
        aria-modal="true"
      >
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-amber-100">
          <ExclamationTriangleIcon className="h-7 w-7 text-amber-600" />
        </div>

        <h3 className="text-center text-base font-extrabold text-app-title">
          Transaksi Sudah Ada
        </h3>
        <p className="mt-2 text-center text-sm leading-relaxed text-app-body-muted">
          Sudah ada{" "}
          <span className="font-semibold text-app-body">
            {duplicateWarning.matches.length} transaksi
          </span>{" "}
          untuk blok{" "}
          <span className="font-semibold text-app-body">{formReference}</span>{" "}
          pada bulan yang sama.
        </p>

        {/* Existing transactions list */}
        <div className="mt-3 max-h-36 overflow-y-auto rounded-2xl border border-amber-200 bg-amber-50/60">
          {duplicateWarning.matches.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between border-b border-amber-100/60 px-3 py-2 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-app-body">
                  {tx.title}
                </p>
                <p className="text-[10px] text-app-body-muted">
                  {new Date(tx.date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                  {tx.category ? ` · ${tx.category}` : ""}
                </p>
              </div>
              <span
                className={`ml-2 shrink-0 text-xs font-bold ${
                  tx.type === "income" ? "text-app-primary" : "text-red-600"
                }`}
              >
                {tx.type === "income" ? "+" : "-"}
                {formatRupiah(tx.amount)}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95"
            style={{ background: "var(--color-surface-alt)" }}
          >
            Kembali
          </button>
          <button
            type="button"
            onClick={duplicateWarning.onConfirm}
            className="flex-1 rounded-2xl bg-amber-500 py-3 text-sm font-bold text-white transition hover:bg-amber-600 active:scale-95"
          >
            Tetap Lanjut
          </button>
        </div>
      </div>
    </>
  );
}
