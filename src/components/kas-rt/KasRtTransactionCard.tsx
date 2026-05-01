"use client";

import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  DocumentTextIcon,
  MapPinIcon,
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
  ChartBarIcon,
  PaperClipIcon,
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
              <ChartBarIcon className="h-3.5 w-3.5 text-red-500" />
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
        <div className="mt-3">
          {/* Section header */}
          <div className="mb-2 flex items-center gap-1.5">
            <PaperClipIcon className="h-3.5 w-3.5 text-app-body-muted" />
            <span className="text-xs font-bold uppercase tracking-wider text-app-body-muted">
              Lampiran ({tx.attachments.length})
            </span>
          </div>

          {/* Single attachment - horizontal card layout */}
          {tx.attachments.length === 1 && tx.attachments[0] && (
            <AttachmentCard attachment={tx.attachments[0]} />
          )}

          {/* 2-3 attachments - 2 column grid */}
          {tx.attachments.length >= 2 && tx.attachments.length <= 3 && (
            <div className="grid grid-cols-2 gap-2">
              {tx.attachments.map((att, idx) => (
                <AttachmentCard key={att.id || att.url || idx} attachment={att} compact />
              ))}
            </div>
          )}

          {/* 4+ attachments - 3 column grid */}
          {tx.attachments.length >= 4 && (
            <div className="grid grid-cols-3 gap-2">
              {tx.attachments.map((att, idx) => (
                <AttachmentCard key={att.id || att.url || idx} attachment={att} compact />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}

/**
 * Individual attachment card component
 */
function AttachmentCard({
  attachment,
  compact = false,
}: {
  attachment: import("@/types/kas-rt").TransactionAttachment;
  compact?: boolean;
}) {
  const isImage = attachment.mime_type?.startsWith("image/");
  const fileName = attachment.file_name || "Lampiran";
  const fileExtension = fileName.split(".").pop()?.toUpperCase() || "FILE";

  // Single attachment (full-width)
  if (!compact) {
    if (isImage && attachment.url) {
      return (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 rounded-xl border border-app-input-border bg-app-surface-alt p-3 transition hover:border-app-primary-muted hover:shadow-md"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-app-input-border"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-app-title group-hover:text-app-primary">
              {fileName}
            </p>
            <p className="text-xs text-app-body-muted">Gambar • Tap untuk lihat</p>
          </div>
          <div className="shrink-0 text-app-primary-muted opacity-0 transition group-hover:opacity-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </div>
        </a>
      );
    }

    // Document attachment (full-width)
    if (!attachment.url) {
      return null;
    }
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 rounded-xl border border-app-input-border bg-app-surface-alt p-3 transition hover:border-app-primary-muted hover:shadow-md"
      >
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-app-primary-muted to-app-surface ring-1 ring-app-input-border">
          <DocumentTextIcon className="h-7 w-7 text-app-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-app-title group-hover:text-app-primary">
            {fileName}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="rounded bg-app-primary-muted px-1.5 py-0.5 text-[10px] font-bold text-app-primary">
              {fileExtension}
            </span>
            <span className="text-xs text-app-body-muted">Dokumen • Tap untuk unduh</span>
          </div>
        </div>
        <div className="shrink-0 text-app-primary-muted opacity-0 transition group-hover:opacity-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        </div>
      </a>
    );
  }

  // Compact layout (for grid)
  if (isImage && attachment.url) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block aspect-square overflow-hidden rounded-xl bg-app-surface-alt ring-1 ring-app-input-border transition hover:ring-2 hover:ring-app-primary"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt=""
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        {/* Overlay on hover */}
        <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/60 via-transparent to-transparent p-2 opacity-0 transition group-hover:opacity-100">
          <span className="text-[10px] font-medium text-white">Gambar</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-4 w-4 text-white"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        </div>
      </a>
    );
  }

  // Compact document attachment
  if (!attachment.url) {
    return null;
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-app-input-border bg-app-surface-alt p-3 text-center transition hover:border-app-primary-muted hover:shadow-md"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-app-primary-muted to-app-surface">
        <DocumentTextIcon className="h-6 w-6 text-app-primary" />
      </div>
      <div className="min-w-0 max-w-full">
        <p className="truncate text-[11px] font-semibold text-app-title group-hover:text-app-primary">
          {fileName}
        </p>
        <span className="mt-0.5 inline-block rounded bg-app-primary-muted px-1.5 py-0.5 text-[9px] font-bold text-app-primary">
          {fileExtension}
        </span>
      </div>
    </a>
  );
}
