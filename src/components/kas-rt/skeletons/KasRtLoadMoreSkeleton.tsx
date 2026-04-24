interface KasRtLoadMoreSkeletonProps {
  count?: number;
}

/**
 * Skeleton loader shown at the bottom of the transaction list
 * when loading more items via infinite scroll.
 */
export function KasRtLoadMoreSkeleton({ count = 3 }: KasRtLoadMoreSkeletonProps) {
  return (
    <div className="animate-pulse space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border bg-white p-4 opacity-70"
          style={{ borderColor: "var(--color-input-border)" }}
        >
          <div className="flex items-start gap-3">
            {/* Category badge */}
            <div className="h-6 w-14 rounded-lg bg-app-surface-alt" />

            <div className="flex-1">
              {/* Title */}
              <div className="mb-2 h-4 w-3/4 rounded bg-app-surface-alt" />

              {/* Meta row */}
              <div className="flex items-center gap-3">
                <div className="h-3 w-20 rounded bg-app-surface-alt" />
                <div className="h-3 w-16 rounded bg-app-surface-alt" />
              </div>
            </div>

            {/* Amount */}
            <div className="h-5 w-24 rounded bg-app-surface-alt" />
          </div>
        </div>
      ))}

      <p className="py-2 text-center text-xs text-app-body-muted/50">
        Memuat transaksi...
      </p>
    </div>
  );
}
