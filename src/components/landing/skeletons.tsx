/**
 * Landing skeletons
 *
 * Placeholders that mirror the shape of the real landing sections, so the
 * page can be painted before its content arrives without the layout
 * jumping when the content shows up.
 */

export function LandingArticleSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl bg-app-surface shadow-sm"
        >
          <div className="h-40 w-full bg-app-surface-alt lg:aspect-video lg:h-auto" />
          <div className="space-y-3 p-5">
            <div className="h-5 w-3/4 rounded bg-app-surface-alt" />
            <div className="h-3 w-full rounded bg-app-surface-alt" />
            <div className="h-3 w-5/6 rounded bg-app-surface-alt" />
            <div className="flex items-center gap-2 pt-2">
              <div className="h-6 w-6 rounded-full bg-app-surface-alt" />
              <div className="h-3 w-32 rounded bg-app-surface-alt" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LandingProductCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-emerald-100/80 bg-app-surface shadow-[0_10px_26px_-18px_rgba(16,24,40,0.45)]"
        >
          <div className="h-32 w-full bg-app-surface-alt" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-4/5 rounded bg-app-surface-alt" />
            <div className="h-3 w-2/3 rounded bg-app-surface-alt" />
            <div className="h-5 w-24 rounded bg-app-surface-alt" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LandingServiceCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse flex gap-3 rounded-2xl border border-emerald-100/80 bg-app-surface p-4 shadow-[0_10px_26px_-18px_rgba(16,24,40,0.45)]"
        >
          <div className="h-14 w-14 shrink-0 rounded-2xl bg-app-surface-alt" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/5 rounded bg-app-surface-alt" />
            <div className="h-3 w-full rounded bg-app-surface-alt" />
            <div className="h-3 w-2/5 rounded bg-app-surface-alt" />
          </div>
        </div>
      ))}
    </div>
  );
}
