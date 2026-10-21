/**
 * Kas RT Page (Server Component)
 *
 * The page shell is sent to the browser as soon as the session is known.
 * The data (transactions, totals, categories, permissions) is loaded by a
 * streamed server component and fills the page in when it arrives, so the
 * header and its buttons are usable immediately.
 */

import { Suspense } from "react";

import { requireAuth } from "./data";
import { KasRtDataSlot } from "./KasRtDataSlot";
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

  return (
    <KasRtPageClient initialFilterState={filters}>
      <Suspense fallback={null}>
        <KasRtDataSlot filters={filters} userId={session.userId} />
      </Suspense>
    </KasRtPageClient>
  );
}
