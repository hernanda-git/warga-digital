"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import type { KasRtTotals } from "@/types/kas-rt";

// ── Helper: Convert Date to YYYY-MM-DD (timezone-aware) ────────────────────
function toDateInputValue(date: Date): string {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
}

// ── GET /api/kas-rt/hero ────────────────────────────────────────────────────
//
// Returns only the essential financial totals for the Kas-RT hero section.
// Optimized for fast loading using conditional aggregation.
// Excludes soft-deleted transactions (deleted_at IS NULL).

export async function GET() {
  try {
    // ── Auth check ─────────────────────────────────────────────────────────
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json(
        { message: "Konfigurasi tenant/komunitas tidak ditemukan." },
        { status: 500 },
      );
    }

    // ── Calculate date boundaries (timezone-aware) ─────────────────────────
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonthIndex = now.getMonth();

    // First day of this month (YYYY-MM-01)
    const thisMonthStartStr = toDateInputValue(new Date(thisYear, thisMonthIndex, 1));

    // Last day of previous month
    const prevMonthEnd = new Date(thisYear, thisMonthIndex, 0);
    const prevMonthEndStr = toDateInputValue(prevMonthEnd);

    // First day of previous month
    const prevMonthStartStr = toDateInputValue(new Date(thisYear, thisMonthIndex - 1, 1));

    // Previous month end label (Indonesian format)
    const prevMonthEndLabel = prevMonthEnd.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const supabase = createServerClient();

    // ── SQL Aggregation Query ─────────────────────────────────────────────
    // Single query with conditional aggregation - efficient and accurate
    const { data, error } = await supabase.rpc("get_kas_rt_summary", {
      p_tenant_id: tenantId,
      p_community_id: communityId,
      p_this_month_start: thisMonthStartStr,
      p_prev_month_end: prevMonthEndStr,
      p_prev_month_start: prevMonthStartStr,
    });

    // If RPC doesn't exist, fall back to raw SQL via Supabase
    if (error?.code === "PGRST202" || error?.message?.includes("function") || error?.message?.includes("does not exist")) {
      // Fallback: Use direct query with aggregation in JavaScript
      // This is still efficient as we only fetch type, amount, date
      const { data: txData, error: txError } = await supabase
        .from("kas_rt_transactions")
        .select("type, amount, date")
        .eq("tenant_id", tenantId)
        .eq("community_id", communityId)
        .is("deleted_at", null);

      if (txError) {
        console.error("[Kas RT] Hero fetch error:", txError);
        return NextResponse.json(
          { message: "Gagal memuat ringkasan kas." },
          { status: 500 },
        );
      }

      // Calculate summaries from data
      let balance = 0;
      let balanceEndOfPrevMonth = 0;
      let thisMonthIncome = 0;
      let thisMonthExpense = 0;
      let prevMonthNet = 0;

      for (const tx of txData ?? []) {
        const rawAmount = tx.amount;
        const amount = rawAmount != null && !isNaN(Number(rawAmount)) ? Number(rawAmount) : 0;
        const isIncome = tx.type === "income";
        const signedAmount = isIncome ? amount : -amount;

        // Total balance (all transactions)
        balance += signedAmount;

        // Balance up to end of previous month
        if (tx.date <= prevMonthEndStr) {
          balanceEndOfPrevMonth += signedAmount;
        }

        // This month income/expense
        if (tx.date >= thisMonthStartStr) {
          if (isIncome) {
            thisMonthIncome += amount;
          } else {
            thisMonthExpense += amount;
          }
        }

        // Previous month net
        if (tx.date >= prevMonthStartStr && tx.date <= prevMonthEndStr) {
          prevMonthNet += signedAmount;
        }
      }

      const thisMonthNet = thisMonthIncome - thisMonthExpense;
      const deltaFromPrevious = thisMonthNet - prevMonthNet;

      const summary: KasRtTotals = {
        balance,
        balanceEndOfPrevMonth,
        prevMonthEndLabel,
        thisMonthIncome,
        thisMonthExpense,
        thisMonthNet,
        deltaFromPrevious,
      };

      return NextResponse.json(summary);
    }

    if (error) {
      console.error("[Kas RT] Hero RPC error:", error);
      return NextResponse.json(
        { message: "Gagal memuat ringkasan kas." },
        { status: 500 },
      );
    }

    // Parse RPC result
    const result = Array.isArray(data) ? data[0] : data;

    const thisMonthIncome = Number(result?.this_month_income ?? 0);
    const thisMonthExpense = Number(result?.this_month_expense ?? 0);
    const thisMonthNet = thisMonthIncome - thisMonthExpense;
    const prevMonthNet = Number(result?.prev_month_net ?? 0);

    const summary: KasRtTotals = {
      balance: Number(result?.balance ?? 0),
      balanceEndOfPrevMonth: Number(result?.balance_end_prev_month ?? 0),
      prevMonthEndLabel,
      thisMonthIncome,
      thisMonthExpense,
      thisMonthNet,
      deltaFromPrevious: thisMonthNet - prevMonthNet,
    };

    return NextResponse.json(summary);
  } catch (err) {
    console.error("[Kas RT] Hero unexpected error:", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memuat ringkasan." },
      { status: 500 },
    );
  }
}
