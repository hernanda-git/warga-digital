"use client";

import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  DocumentTextIcon,
  MapPinIcon,
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { formatRupiah } from "@/lib/kas-rt-utils";
import type { TransactionItem } from "@/types/kas-rt";

interface KasRtTransactionCardProps {
  transaction: TransactionItem;
  canSubmitTransaction: boolean;
  onEdit: (tx: TransactionItem) => void;
  onDelete: (tx: TransactionItem) => void;
}

/**
 * Individual transaction card
 */
export function KasRtTransactionCard({
  transaction: tx,
  canSubmitTransaction,
  onEdit,
  onDelete,
}: KasRtTransactionCardProps) {
  const isIncome = tx.type === "income";

  return (
    <article className="rounded-2xl bg-app-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {tx.category && (
            <span className="text-[10px] font-medium text-app-body-muted">
              {tx.category}
            </span>
          )}
          <h3
            className={`text-sm font-bold leading-snug text-app-title ${tx.category ? "mt-0.5" : ""}`}
          >
            {tx.title}
          </h3>
          {tx.details && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-app-body-muted">
              {tx.details}
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <p
            className={`text-sm font-extrabold ${isIncome ? "text-app-primary" : "text-red-600"}`}
          >
            {isIncome ? "+" : "-"}
            {formatRupiah(tx.amount)}
          </p>
          {canSubmitTransaction && (
            <div className="mt-1 flex justify-end gap-0.5">
              <button
                type="button"
                onClick={() => onEdit(tx)}
                className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-app-primary-muted active:scale-90"
                style={{ color: "var(--color-primary)" }}
                aria-label={`Edit transaksi ${tx.title}`}
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(tx)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50 active:scale-90"
                aria-label={`Hapus transaksi ${tx.title}`}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-body-muted">
        <div className="flex items-center gap-1">
          <CalendarDaysIcon className="h-3.5 w-3.5" aria-hidden />
          <span>
            {new Date(tx.date).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        {tx.reference && (
          <div className="flex items-center gap-1">
            <MapPinIcon className="h-3.5 w-3.5" aria-hidden />
            <span>{tx.reference}</span>
          </div>
        )}
        {tx.created_by_full_name && (
          <div className="flex items-center gap-1">
            <UserCircleIcon className="h-3.5 w-3.5" aria-hidden />
            <span className="max-w-[120px] truncate">
              {tx.created_by_full_name}
            </span>
          </div>
        )}
      </div>

      {/* Created at timestamp */}
      {tx.created_at && (
        <div className="mt-1.5 text-[10px] text-app-body-muted">
          Dicatat pada{" "}
          {new Date(tx.created_at).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          pukul{" "}
          {new Date(tx.created_at).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}

      {/* Transaction Details Breakdown - for expense with auto-calculate */}
      {tx.transaction_details && tx.transaction_details.length > 0 && (
        <details className="mt-3 rounded-xl bg-app-surface-alt">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium text-app-body-muted [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-1.5">
              <span className="text-red-500">📊</span>
              Rincian ({tx.transaction_details.length} item)
            </span>
            <ChevronLeftIcon className="h-3.5 w-3.5 rotate-[-90deg] transition-transform duration-200 [[open]>&]:rotate-90" />
          </summary>
          <div className="border-t border-app-input-border px-3 py-2">
            {tx.transaction_details.map((detail, idx) => (
              <div
                key={detail.id || idx}
                className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-app-body">
                    {detail.name}
                  </p>
                  <p className="text-[10px] text-app-body-muted">
                    {detail.jumlah_warga} warga × {formatRupiah(detail.rate_per_warga)}
                  </p>
                </div>
                <p className="ml-2 shrink-0 text-xs font-bold text-red-600">
                  {formatRupiah(detail.subtotal)}
                </p>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-app-input-border pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                Total
              </p>
              <p className="text-sm font-extrabold text-red-600">
                {formatRupiah(tx.amount)}
              </p>
            </div>
          </div>
        </details>
      )}

      {/* Attachments */}
      {tx.attachments?.length ? (
        <div className="mt-3 flex justify-end">
          <details className="rounded-xl bg-app-surface-alt px-3 py-2">
            <summary className="cursor-pointer list-none text-right text-xs font-medium text-app-body-muted [&::-webkit-details-marker]:hidden">
              📎 {tx.attachments.length} lampiran
            </summary>
            <ul className="mt-2 space-y-2">
              {tx.attachments.map((att) => {
                const isImage = att.mime_type?.startsWith("image/");
                if (isImage && att.url) {
                  return (
                    <li key={att.url}>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.url}
                          alt=""
                          className="max-h-48 rounded-xl object-contain"
                        />
                      </a>
                    </li>
                  );
                }
                if (att.url) {
                  return (
                    <li key={att.url}>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2 hover:no-underline"
                        style={{
                          color: "var(--color-primary)",
                        }}
                      >
                        <DocumentTextIcon className="h-3.5 w-3.5" />
                        Buka dokumen
                      </a>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          </details>
        </div>
      ) : null}
    </article>
  );
}
