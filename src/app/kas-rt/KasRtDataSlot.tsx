/**
 * Kas RT data slot (Server Component)
 *
 * Loads everything the Kas RT page needs and hands it to the page shell
 * through a streamed bridge. The shell is already on screen while this
 * runs, so the page never blocks on the database.
 */

import {
  fetchKasRtPermissions,
  fetchKasRtCategories,
  fetchKasRtTransactions,
  fetchKasRtHero,
  fetchKasRtBlockNames,
} from "./data";
import { KasRtDataBridge } from "./KasRtDataBridge";
import type { KasRtFilterState } from "@/types/kas-rt";

export async function KasRtDataSlot({
  filters,
  userId,
}: {
  filters: KasRtFilterState;
  userId: string;
}) {
  const [permissions, categories, { transactions, total }, hero, blockNames] =
    await Promise.all([
      fetchKasRtPermissions(userId),
      fetchKasRtCategories(),
      fetchKasRtTransactions({
        typeFilter: filters.typeFilter !== "all" ? filters.typeFilter : undefined,
        categoryFilter: filters.categoryFilter || undefined,
        blockFilter: filters.blockFilter || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      }),
      fetchKasRtHero(),
      fetchKasRtBlockNames(),
    ]);

  return (
    <KasRtDataBridge
      data={{
        transactions,
        total,
        categories,
        canSubmitTransaction: permissions.canSubmitTransaction,
        summary: hero,
        blockNames,
      }}
    />
  );
}
