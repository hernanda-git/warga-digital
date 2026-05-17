/**
 * Asset RT Page (Server Component)
 *
 * Fetches initial asset data server-side and delegates
 * all interactivity to the client component.
 */

import {
  requireAuth,
  fetchAssetCategories,
  fetchAssetStats,
  fetchAssets,
} from "./data";
import AssetRtPageClient from "./AssetRtPageClient";
import type { AssetFilterState } from "@/types/asset-rt";

interface AssetRTPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
  }>;
}

export default async function AssetRTPage({ searchParams }: AssetRTPageProps) {
  const session = await requireAuth();
  const params = await searchParams;

  const filterState: AssetFilterState = {
    search: params.search ?? "",
    categoryFilter: params.category ?? "",
    sortBy: (params.sort as AssetFilterState["sortBy"]) || "newest",
  };

  const [categories, stats, { assets, total, totalPages }] = await Promise.all([
    fetchAssetCategories(),
    fetchAssetStats(),
    fetchAssets({
      search: filterState.search || undefined,
      category: filterState.categoryFilter || undefined,
      sort: filterState.sortBy || undefined,
      limit: 20,
    }),
  ]);

  return (
    <AssetRtPageClient
      initialAssets={assets}
      initialTotal={total}
      initialTotalPages={totalPages}
      initialCategories={categories}
      initialStats={stats}
      initialFilterState={filterState}
    />
  );
}
