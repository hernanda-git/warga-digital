import { KasRtHeroSkeleton } from "./KasRtHeroSkeleton";
import { KasRtFilterBarSkeleton } from "./KasRtFilterBarSkeleton";
import { KasRtTransactionListSkeleton } from "./KasRtTransactionListSkeleton";

export function KasRtPageSkeleton() {
  return (
    <main className="min-h-screen bg-app-background px-4 pb-6 pt-4">
      <KasRtHeroSkeleton />
      <div className="mt-4">
        <KasRtFilterBarSkeleton />
      </div>
      <div className="mt-4">
        <KasRtTransactionListSkeleton count={5} />
      </div>
    </main>
  );
}
