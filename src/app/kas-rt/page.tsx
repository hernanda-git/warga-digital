/**
 * Kas RT Page (Server Component)
 *
 * Fetches initial transaction data server-side and delegates
 * all interactivity to the client component.
 */

import {
  requireAuth,
  fetchKasRtPermissions,
  fetchKasRtCategories,
  fetchKasRtTransactions,
  fetchKasRtHero,
} from "./data";
import KasRtPageClient from "./KasRtPageClient";

export default async function KasRTPage() {
  const session = await requireAuth();

  const [permissions, categories, transactions, hero] = await Promise.all([
    fetchKasRtPermissions(session.userId),
    fetchKasRtCategories(),
    fetchKasRtTransactions(),
    fetchKasRtHero(),
  ]);

  return (
    <KasRtPageClient
      initialTransactions={transactions}
      initialCategories={categories}
      initialCanSubmitTransaction={permissions.canSubmitTransaction}
      initialSummary={hero}
    />
  );
}
