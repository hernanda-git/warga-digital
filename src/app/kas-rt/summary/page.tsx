/**
 * Kas RT Summary Page (Server Component)
 *
 * Fetches summary analytics server-side based on URL query params.
 * Month navigation updates URL, triggering server re-render.
 */

import { redirect } from "next/navigation";
import { requireAuth, fetchKasRtSummary } from "../data";
import KasRtSummaryClient from "./KasRtSummaryClient";

interface SummaryPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function KasRtSummaryPage({ searchParams }: SummaryPageProps) {
  const session = await requireAuth();
  const params = await searchParams;

  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    redirect("/kas-rt/summary");
  }

  const summary = await fetchKasRtSummary(year, month);

  if (!summary) {
    return (
      <main className="flex min-h-screen flex-col bg-app-surface-alt">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-sm font-medium text-red-600 mb-2">
              Gagal memuat ringkasan.
            </p>
            <button
              type="button"
              onClick={() => {}}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <KasRtSummaryClient
      summary={summary}
      year={year}
      month={month}
    />
  );
}
