/**
 * Shared Kas-RT house status computation.
 *
 * Single source of truth for /kas-rt/house-status. Previously the same
 * aggregation was duplicated in `src/app/kas-rt/data.ts` (server component
 * path) and `src/app/api/kas-rt/house-statuses/route.ts` (client refetch
 * path), which had already drifted apart (one used the current year, the
 * other a hardcoded 2026).
 *
 * Money rule (the whole point of this module):
 *   • `total2026` and `monthlyStatuses` come from real kas_rt_transactions ONLY.
 *   • An active house_payment_override credits *months*, never rupiah.
 *   • So a house can read as "Lunas" while every cash figure stays truthful.
 */

import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import {
  IPL_MONTHS_PER_YEAR,
  effectiveCoveredMonths,
  isSettledByMonths,
  normalizeMonthNumbers,
} from "@/lib/kas-rt-ipl";
import type { HouseTransactionStatus } from "@/types/kas-rt";

type SupabaseClient = ReturnType<typeof createServerClient>;

export interface FetchHouseStatusesOptions {
  /** IPL year to report on. Defaults to the current year. */
  year?: number;
}

/**
 * Builds the per-house IPL status list for a year.
 *
 * Returns an empty array on any read failure so callers keep rendering a page
 * instead of throwing — matching the previous behaviour of both call sites.
 */
export async function fetchHouseStatusesWithOverrides(
  supabase: SupabaseClient,
  { year = new Date().getFullYear() }: FetchHouseStatusesOptions = {},
): Promise<HouseTransactionStatus[]> {
  const tenantId = DEFAULT_TENANT_ID;
  const communityId = DEFAULT_COMMUNITY_ID;

  if (!tenantId || !communityId) return [];

  const { data: houses, error: housesError } = await supabase
    .from("houses")
    .select("id, name, blok_rumah, status")
    .eq("tenant_id", tenantId)
    .eq("community_id", communityId)
    .eq("is_active", true)
    .order("blok_rumah");

  if (housesError || !houses?.length) return [];

  const blokList = houses.map((h) => h.blok_rumah).filter(Boolean);
  if (blokList.length === 0) return [];

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year + 1}-01-01`;

  const [txResult, overrideResult] = await Promise.all([
    supabase
      .from("kas_rt_transactions")
      .select("amount, date, reference, is_shadow")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .eq("is_shadow", false)
      .is("deleted_at", null)
      .gte("date", yearStart)
      .lt("date", yearEnd)
      .in("reference", blokList),
    supabase
      .from("house_payment_overrides")
      .select("id, house_id, credited_months, credited_month_numbers, reason, notes")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .eq("year", year)
      .eq("is_active", true),
  ]);

  if (txResult.error) {
    console.error(
      "[kas-rt/house-status] transactions read failed:",
      txResult.error,
    );
  }

  const overrideByHouse = new Map<
    string,
    {
      id: string;
      credited_months: number;
      credited_month_numbers: number[];
      reason: string | null;
      notes: string | null;
    }
  >();
  if (!overrideResult.error) {
    for (const row of overrideResult.data ?? []) {
      const months = normalizeMonthNumbers(
        (row as { credited_month_numbers?: number[] | null })
          .credited_month_numbers ?? null,
      );
      overrideByHouse.set(row.house_id, {
        id: row.id,
        credited_months: Number(row.credited_months ?? 0),
        // Fall back to the January-anchored count for rows written before the
        // explicit-month column existed.
        credited_month_numbers:
          months.length > 0
            ? months
            : Array.from(
                { length: Math.min(Number(row.credited_months ?? 0), IPL_MONTHS_PER_YEAR) },
                (_, i) => i + 1,
              ),
        reason: row.reason ?? null,
        notes: row.notes ?? null,
      });
    }
  } else {
    console.error(
      "[kas-rt/house-status] overrides read failed:",
      overrideResult.error,
    );
  }

  // ── Seed one entry per active house, keyed by blok ────────────────────────
  const houseMap = new Map<
    string,
    HouseTransactionStatus & { _houseId: string }
  >();

  for (const h of houses) {
    if (!h.blok_rumah) continue;
    const override = overrideByHouse.get(h.id);
    const overrideMonths = override?.credited_months ?? 0;
    const overrideMonthNumbers = override?.credited_month_numbers ?? [];

    houseMap.set(h.blok_rumah, {
      blokRumah: h.blok_rumah,
      name: h.name,
      status: (h.status as "PRIBADI" | "KONTRAKAN") ?? "PRIBADI",
      total2026: 0,
      monthlyStatuses: Array(IPL_MONTHS_PER_YEAR).fill(0),
      overrideMonths,
      overrideMonthNumbers,
      isSettled: isSettledByMonths(0, overrideMonthNumbers),
      overrideReason: override?.reason ?? null,
      overrideNotes: override?.notes ?? null,
      overrideId: override?.id ?? null,
      houseId: h.id,
      _houseId: h.id,
    });
  }

  // ── Real money only ───────────────────────────────────────────────────────
  for (const tx of txResult.data ?? []) {
    if (!tx.reference) continue;
    const house = houseMap.get(tx.reference);
    if (!house) continue;
    const amount = Number(tx.amount);
    if (!Number.isFinite(amount)) continue;
    const month = new Date(tx.date).getMonth();
    if (month < 0 || month >= IPL_MONTHS_PER_YEAR) continue;
    house.total2026 += amount;
    house.monthlyStatuses[month] += amount;
  }

  // ── Settled flag is money + override credit; money totals stay untouched ──
  const statuses: HouseTransactionStatus[] = [];
  for (const house of houseMap.values()) {
    const { _houseId, ...rest } = house;
    void _houseId;
    statuses.push({
      ...rest,
      isSettled: isSettledByMonths(rest.total2026, rest.overrideMonthNumbers),
    });
  }

  return statuses.sort((a, b) => a.blokRumah.localeCompare(b.blokRumah));
}

/**
 * Months a house has covered, combining real payments and override credit.
 * Exported so the UI can render the same fill the server computed.
 */
export function coveredMonthsFor(house: HouseTransactionStatus): number {
  return effectiveCoveredMonths(house.total2026, house.overrideMonths);
}
