"use client";

import { ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { TransactionItem } from "@/types/kas-rt";

interface KasRtDeleteConfirmDialogProps {
  deletingTx: TransactionItem | null;
  isDeleteConfirming: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/**
 * Delete confirmation dialog
 */
export function KasRtDeleteConfirmDialog({
  deletingTx,
  isDeleteConfirming,
  onClose,
  onConfirm,
}: KasRtDeleteConfirmDialogProps) {
  if (!deletingTx) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={() => !isDeleteConfirming && onClose()}
        aria-hidden
        style={{ animation: "fadeIn 0.2s ease" }}
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-app-surface p-6 shadow-[0_32px_64px_rgba(0,0,0,0.18)]"
        style={{
          maxWidth: "360px",
          animation: "dialogIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
        role="alertdialog"
        aria-modal="true"
      >
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-red-100">
          <TrashIcon className="h-7 w-7 text-red-600" />
        </div>

        <h3 className="text-center text-base font-extrabold text-app-title">
          Hapus Transaksi?
        </h3>
        <p className="mt-2 text-center text-sm leading-relaxed text-app-body-muted">
          <span className="font-semibold text-app-body">
            &ldquo;{deletingTx.title}&rdquo;
          </span>{" "}
          akan dihapus. Tindakan ini tidak dapat dibatalkan.
        </p>

        {/* Actions */}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => !isDeleteConfirming && onClose()}
            disabled={isDeleteConfirming}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
            style={{ background: "var(--color-surface-alt)" }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isDeleteConfirming}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "#dc2626" }}
          >
            {isDeleteConfirming ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <TrashIcon className="h-4 w-4" />
                Ya, Hapus
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
