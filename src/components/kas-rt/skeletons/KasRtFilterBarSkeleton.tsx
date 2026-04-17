export function KasRtFilterBarSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Filter tabs */}
      <div className="flex gap-2 rounded-2xl bg-app-surface-alt/50 p-1.5">
        <div className="h-10 flex-1 rounded-xl bg-app-surface-alt" />
        <div className="h-10 flex-1 rounded-xl bg-app-surface-alt" />
        <div className="h-10 flex-1 rounded-xl bg-app-surface-alt" />
      </div>
      
      {/* Filter button row */}
      <div className="mt-3 flex items-center justify-between">
        <div className="h-8 w-32 rounded-xl bg-app-surface-alt" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-xl bg-app-surface-alt" />
          <div className="h-8 w-8 rounded-xl bg-app-surface-alt" />
        </div>
      </div>
    </div>
  );
}
