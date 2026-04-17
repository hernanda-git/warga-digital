export function KasRtHeroSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl p-6" style={{ background: "linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)" }}>
      {/* Community name */}
      <div className="mb-4 h-4 w-32 rounded bg-app-surface-alt" />
      
      {/* Balance amount */}
      <div className="mb-2 h-10 w-48 rounded bg-app-surface-alt" />
      
      {/* Last updated text */}
      <div className="h-3 w-40 rounded bg-app-surface-alt" />
      
      {/* Income/Expense cards */}
      <div className="mt-5 flex gap-3">
        <div className="flex-1 rounded-2xl bg-white/50 p-4">
          <div className="mb-2 h-3 w-16 rounded bg-app-surface-alt" />
          <div className="h-6 w-28 rounded bg-app-surface-alt" />
        </div>
        <div className="flex-1 rounded-2xl bg-white/50 p-4">
          <div className="mb-2 h-3 w-16 rounded bg-app-surface-alt" />
          <div className="h-6 w-28 rounded bg-app-surface-alt" />
        </div>
      </div>
    </div>
  );
}
