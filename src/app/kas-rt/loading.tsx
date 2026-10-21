import { KasRtTransactionListSkeleton } from "@/components/kas-rt/skeletons";

/**
 * Loading state for client-side navigation to /kas-rt.
 *
 * It mirrors the shape of the real page (green hero, filter bar, list) so
 * the transition into the loaded page does not jump around, instead of the
 * generic full screen spinner.
 */
export default function KasRtLoading() {
  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt lg:py-6">
      <section
        className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white lg:max-w-4xl lg:mx-auto lg:w-full lg:rounded-b-2xl lg:px-6 lg:py-6"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
        aria-hidden
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="h-3 w-32 animate-pulse rounded bg-white/25" />
              <div className="mt-2 h-5 w-24 animate-pulse rounded bg-white/25" />
            </div>
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-9 w-9 animate-pulse rounded-xl bg-white/20"
                />
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="h-2.5 w-20 animate-pulse rounded bg-white/25" />
              <div className="mt-2 h-6 w-32 animate-pulse rounded-lg bg-white/25" />
              <div className="mt-2 h-2.5 w-24 animate-pulse rounded bg-white/20" />
            </div>
            <div className="h-9 w-20 shrink-0 animate-pulse rounded-xl bg-white/20" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl bg-white/15 px-2 py-2.5 text-center"
              >
                <div className="mx-auto h-2.5 w-16 animate-pulse rounded bg-white/25" />
                <div className="mx-auto mt-2 h-4 w-16 animate-pulse rounded bg-white/30" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="px-4 pt-4 lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 animate-pulse rounded-xl bg-app-surface-alt" />
          <div className="h-9 w-20 animate-pulse rounded-xl bg-app-surface-alt" />
          <div className="h-9 flex-1 animate-pulse rounded-xl bg-app-surface-alt" />
        </div>
      </div>

      <div className="px-4 pt-4 lg:max-w-4xl lg:mx-auto lg:w-full lg:px-6">
        <KasRtTransactionListSkeleton count={4} />
      </div>
    </main>
  );
}
