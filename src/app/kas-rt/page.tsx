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
import type { KasRtFilterState } from "@/types/kas-rt";

interface KasRTPageProps {
  searchParams: Promise<{
    type?: string;
    category?: string;
    block?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function KasRTPage({ searchParams }: KasRTPageProps) {
  const session = await requireAuth();
  const params = await searchParams;

  const filters: KasRtFilterState = {
    typeFilter: (params.type === "income" || params.type === "expense") ? params.type : "all",
    categoryFilter: params.category ?? "",
    blockFilter: params.block ?? "",
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
  };

  const [permissions, categories, { transactions, total }, hero] = await Promise.all([
    fetchKasRtPermissions(session.userId),
    fetchKasRtCategories(),
    fetchKasRtTransactions({
      typeFilter: filters.typeFilter !== "all" ? filters.typeFilter : undefined,
      categoryFilter: filters.categoryFilter || undefined,
      blockFilter: filters.blockFilter || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
    }),
    fetchKasRtHero(),
  ]);

  return (
    <KasRtPageClient
      initialTransactions={transactions}
      initialTotal={total}
      initialCategories={categories}
      initialCanSubmitTransaction={permissions.canSubmitTransaction}
      initialSummary={hero}
      initialFilterState={filters}
    />
  );
}
