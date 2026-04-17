interface KasRtTransactionListSkeletonProps {
  count?: number;
}

export function KasRtTransactionListSkeleton({ count = 5 }: KasRtTransactionListSkeletonProps) {
  return (
    <div className="animate-pulse space-y-3">
      {/* Month separator */}
      <div className="h-6 w-24 rounded bg-app-surface-alt" />
      
      {/* Transaction cards */}
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border bg-white p-4"
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
                <div className="h-3 w-12 rounded bg-app-surface-alt" />
              </div>
            </div>
            
            {/* Amount */}
            <div className="h-5 w-24 rounded bg-app-surface-alt" />
          </div>
        </div>
      ))}
    </div>
  );
}
