import {
  LandingArticleSkeleton,
  LandingProductCardSkeleton,
} from "@/components/landing/skeletons";

/**
 * Loading state for client-side navigation to the landing page.
 *
 * It mirrors the shape of the real page (header, feature grid, sections)
 * so the loaded page slides in without a jump, instead of the generic full
 * screen spinner.
 */
export default function LandingLoading() {
  return (
    <div className="flex h-100 min-h-0 flex-col bg-app-surface-alt">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-3 bg-app-surface px-4 py-3 shadow-sm lg:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-app-surface-alt" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 animate-pulse rounded bg-app-surface-alt" />
            <div className="h-3 w-20 animate-pulse rounded bg-app-surface-alt" />
          </div>
        </div>
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-app-surface-alt" />
      </header>

      <div
        className="hidden shrink-0 px-6 py-8 lg:block"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
        aria-hidden
      >
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-white/20" />
          <div className="space-y-2">
            <div className="h-5 w-48 animate-pulse rounded bg-white/25" />
            <div className="h-3.5 w-28 animate-pulse rounded bg-white/20" />
          </div>
        </div>
      </div>

      <main className="flex-1 space-y-6 px-4 py-4 lg:px-6">
        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-app-surface shadow-sm"
            />
          ))}
        </div>

        {/* Articles */}
        <section>
          <div className="mb-3 h-4 w-28 animate-pulse rounded bg-app-surface-alt" />
          <LandingArticleSkeleton count={2} />
        </section>

        {/* Jualan */}
        <section>
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-app-surface-alt" />
          <LandingProductCardSkeleton count={5} />
        </section>
      </main>
    </div>
  );
}
