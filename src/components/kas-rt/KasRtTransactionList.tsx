"use client";

import { BanknotesIcon } from "@heroicons/react/24/outline";
import {
  formatRupiah,
  getMonthYearKey,
  getMonthYearSeparator,
  toDateInputValue,
} from "@/lib/kas-rt-utils";
import { useInfiniteScroll } from "@/lib/hooks/use-infinite-scroll";
import { KasRtTransactionCard } from "./KasRtTransactionCard";
import { KasRtLoadMoreSkeleton } from "./skeletons/KasRtLoadMoreSkeleton";
import type { TransactionItem } from "@/types/kas-rt";

interface KasRtTransactionListProps {
  transactions: TransactionItem[];
  filteredTransactions: TransactionItem[];
  canSubmitTransaction: boolean;
  now: Date;
  pullDistance: number;
  isRefreshing: boolean;
  refreshedAt: Date;
  onEdit: (tx: TransactionItem) => void;
  onDelete: (tx: TransactionItem) => void;
  onResetFilter: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  // Infinite scroll
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  totalCount: number;
}

// Touch action style to prevent browser default gestures
const touchActionStyle: React.CSSProperties = {
  touchAction: 'pan-y', // Allow vertical scrolling, handle horizontal in JS
};

/**
 * Transaction list with month separators, pull-to-refresh, and infinite scroll.
 */
export function KasRtTransactionList({
  transactions,
  filteredTransactions,
  canSubmitTransaction,
  now,
  pullDistance,
  isRefreshing,
  refreshedAt,
  onEdit,
  onDelete,
  onResetFilter,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  hasMore,
  isLoadingMore,
  onLoadMore,
  totalCount,
}: KasRtTransactionListProps) {
  const sentinelRef = useInfiniteScroll({
    onIntersect: onLoadMore,
    enabled: hasMore && !isLoadingMore && !isRefreshing,
    rootMargin: "200px",
    debounceMs: 300,
  });

  return (
    <div
      className="px-4 pb-8 pt-3"
      style={touchActionStyle}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center text-xs text-app-body-muted transition-all"
          style={{ height: `${Math.max(32, pullDistance)}px` }}
          aria-live="polite"
        >
          {isRefreshing
            ? "Menyegarkan transaksi..."
            : pullDistance > 48
              ? "Lepaskan untuk refresh"
              : "Tarik untuk refresh"}
        </div>
      )}

      {/* Empty state */}
      {filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-app-surface px-6 py-10 text-center shadow-[0_4px_16px_rgba(0,40,5,0.05)]">
          <BanknotesIcon
            className="h-10 w-10 text-app-body-muted/30"
            aria-hidden
          />
          <p className="text-sm font-bold text-app-body-muted">
            {transactions.length === 0
              ? "Belum ada transaksi"
              : "Tidak ada transaksi"}
          </p>
          <p className="max-w-[180px] text-xs leading-relaxed text-app-body-muted/70">
            {transactions.length === 0
              ? "Mulai catat transaksi pemasukan dan pengeluaran kas RT."
              : "Tidak ada transaksi yang cocok dengan filter aktif."}
          </p>
          {transactions.length > 0 && (
            <button
              type="button"
              onClick={onResetFilter}
              className="text-xs font-bold transition hover:opacity-70"
              style={{ color: "var(--color-primary)" }}
            >
              Reset Filter
            </button>
          )}
        </div>
      ) : (
        /* Transaction list */
        <div className="space-y-2.5">
          {(() => {
            const elements: React.ReactNode[] = [];
            let lastMonthYearKey = "";

            filteredTransactions.forEach((tx) => {
              const txDate = new Date(tx.date);
              const currentMonthYearKey = getMonthYearKey(txDate);

              // Insert month/year separator when month changes
              if (currentMonthYearKey !== lastMonthYearKey) {
                elements.push(
                  <div
                    key={`separator-${currentMonthYearKey}`}
                    className="relative py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-app-body-muted/20" />
                      <span className="rounded-full bg-app-surface px-3 py-1 text-xs font-semibold text-app-body-muted shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
                        {getMonthYearSeparator(txDate)}
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-app-body-muted/20" />
                    </div>
                  </div>,
                );
                lastMonthYearKey = currentMonthYearKey;
              }

              elements.push(
                <KasRtTransactionCard
                  key={tx.id}
                  transaction={tx}
                  canSubmitTransaction={canSubmitTransaction}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />,
              );
            });

            return elements;
          })()}

          {/* Infinite scroll sentinel */}
          {hasMore && <div ref={sentinelRef} className="h-4" aria-hidden />}

          {/* Load more skeleton */}
          {isLoadingMore && <KasRtLoadMoreSkeleton count={3} />}

          {/* End of list indicator */}
          {!hasMore && filteredTransactions.length > 0 && (
            <div className="py-4 text-center">
              <div className="mx-auto mb-2 h-px w-16 bg-app-body-muted/20" />
              <p className="text-[10px] text-app-body-muted/50">
                Semua transaksi telah dimuat
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <p className="mt-4 text-center text-[10px] text-app-body-muted/50">
        Diperbarui{" "}
        {refreshedAt.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })}
        {" · "}
        {totalCount > 0
          ? `${filteredTransactions.length} dari ${totalCount} transaksi`
          : `${filteredTransactions.length} transaksi`}
      </p>
    </div>
  );
}
