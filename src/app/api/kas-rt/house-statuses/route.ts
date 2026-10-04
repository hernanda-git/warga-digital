"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { fetchHouseStatusesWithOverrides } from "@/lib/kas-rt-house-status";

/**
 * GET /api/kas-rt/house-statuses
 *
 * Per-house IPL status for a year. Money fields (`total2026`,
 * `monthlyStatuses`) come from real kas_rt_transactions only; `overrideMonths`
 * and `isSettled` additionally reflect active house_payment_overrides, which
 * credit months without creating money.
 *
 * Optional `?year=YYYY` selects the report year (defaults to the current year).
 */
export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json(
        { message: "Anda harus masuk." },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const rawYear = parseInt(searchParams.get("year") ?? "", 10);
    const year =
      Number.isFinite(rawYear) && rawYear >= 2020 && rawYear <= 2100
        ? rawYear
        : new Date().getFullYear();

    const supabase = createServerClient();
    const statuses = await fetchHouseStatusesWithOverrides(supabase, { year });

    return NextResponse.json(statuses);
  } catch (error) {
    console.error("[kas-rt/house-statuses] GET failed:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan tak terduga." },
      { status: 500 },
    );
  }
}
