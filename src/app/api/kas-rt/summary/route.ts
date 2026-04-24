"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import type { KasRtSummaryResponse } from "@/types/kas-rt";

// ── Helper: Convert Date to YYYY-MM-DD (timezone-aware) ────────────────────
function toDateInputValue(date: Date): string {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
}

// ── GET /api/kas-rt/summary ─────────────────────────────────────────────────
//
// Returns comprehensive summary data for the Kas-RT summary page.
// Supports optional year/month query parameters for navigation.
// Excludes soft-deleted transactions (deleted_at IS NULL).

export async function GET(request: Request) {
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

    // ── Parse query parameters ─────────────────────────────────────────────
    const url = new URL(request.url);
    const yearParam = url.searchParams.get("year");
    const monthParam = url.searchParams.get("month");

    const now = new Date();
    const targetYear = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const targetMonth = monthParam
      ? parseInt(monthParam, 10) - 1
      : now.getMonth(); // 0-indexed

    // Validate month range
    if (targetMonth < 0 || targetMonth > 11) {
      return NextResponse.json(
        { message: "Bulan tidak valid. Gunakan 1-12." },
        { status: 400 },
      );
    }

    // ── Calculate date boundaries ──────────────────────────────────────────
    // Selected month
    const selectedMonthStart = new Date(targetYear, targetMonth, 1);
    const selectedMonthEnd = new Date(targetYear, targetMonth + 1, 0);
    const selectedMonthStartStr = toDateInputValue(selectedMonthStart);
    const selectedMonthEndStr = toDateInputValue(selectedMonthEnd);
    const selectedMonthLabel = selectedMonthStart.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });

    // Previous month
    const prevMonthStart = new Date(targetYear, targetMonth - 1, 1);
    const prevMonthEnd = new Date(targetYear, targetMonth, 0);
    const prevMonthStartStr = toDateInputValue(prevMonthStart);
    const prevMonthEndStr = toDateInputValue(prevMonthEnd);
    const prevMonthLabel = prevMonthStart.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });

    // Year-to-date trend (Jan to current month for current year, full year for past years)
    const isCurrentYear = targetYear === now.getFullYear();
    const isFutureYear = targetYear > now.getFullYear();

    let trendMonths: { year: number; month: number }[] = [];

    if (isFutureYear) {
      trendMonths = [];
    } else if (isCurrentYear) {
      const currentMonth = now.getMonth();
      for (let month = 0; month <= currentMonth; month++) {
        trendMonths.push({ year: targetYear, month });
      }
    } else {
      for (let month = 0; month < 12; month++) {
        trendMonths.push({ year: targetYear, month });
      }
    }

    const supabase = createServerClient();

    // ── Fetch transactions for the trend window ────────────
    // Only fetch from Jan 1 of selected year (or no data for future years)
    const trendStart = isFutureYear
      ? selectedMonthEnd
      : new Date(targetYear, 0, 1);
    const trendStartStr = toDateInputValue(trendStart);

    const { data: allTx, error: txError } = await supabase
      .from("kas_rt_transactions")
      .select("type, amount, date, category, reference")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .is("deleted_at", null)
      .gte("date", trendStartStr)
      .lte("date", selectedMonthEndStr);

    if (txError) {
      return NextResponse.json(
        { message: "Gagal memuat data transaksi." },
        { status: 500 },
      );
    }

    const transactions = allTx ?? [];

    // ── Calculate Selected Month Data ───────────────────────────────────────
    // Use string comparison for YYYY-MM-DD dates to avoid timezone issues
    const selectedMonthTx = transactions.filter((tx) => {
      const txDateStr = tx.date;
      return (
        txDateStr >= selectedMonthStartStr && txDateStr <= selectedMonthEndStr
      );
    });

    let selectedMonthIncome = 0;
    let selectedMonthExpense = 0;
    const categoryMap = new Map<string, { amount: number; count: number }>();
    const dailyMap = new Map<string, { income: number; expense: number }>();

    for (const tx of selectedMonthTx) {
      const rawAmount = tx.amount;
      const amount =
        rawAmount != null && !isNaN(Number(rawAmount)) ? Number(rawAmount) : 0;

      const isIncome = tx.type === "income";

      if (isIncome) {
        selectedMonthIncome += amount;
      } else {
        selectedMonthExpense += amount;
      }

      // Category breakdown
      const catKey = tx.category ?? "Lainnya";
      const existing = categoryMap.get(catKey) ?? { amount: 0, count: 0 };
      categoryMap.set(catKey, {
        amount: existing.amount + amount,
        count: existing.count + 1,
      });

      // Daily breakdown
      const dateKey = tx.date; // YYYY-MM-DD format
      const daily = dailyMap.get(dateKey) ?? { income: 0, expense: 0 };
      if (isIncome) {
        daily.income += amount;
      } else {
        daily.expense += amount;
      }
      dailyMap.set(dateKey, daily);
    }

    const selectedMonthNet = selectedMonthIncome - selectedMonthExpense;
    const selectedMonthTransactionCount = selectedMonthTx.length;

    // Build category breakdown array
    const byCategory: KasRtSummaryResponse["selectedMonth"]["byCategory"] =
      Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count,
          percentage:
            selectedMonthIncome + selectedMonthExpense > 0
              ? (data.amount / (selectedMonthIncome + selectedMonthExpense)) *
                100
              : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

    // Build daily breakdown array (sorted by date)
    const dailyBreakdown = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        income: data.income,
        expense: data.expense,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Calculate Previous Month Data ───────────────────────────────────────
    // Use string comparison for YYYY-MM-DD dates to avoid timezone issues
    const prevMonthTx = transactions.filter((tx) => {
      const txDateStr = tx.date;
      return txDateStr >= prevMonthStartStr && txDateStr <= prevMonthEndStr;
    });

    let prevMonthIncome = 0;
    let prevMonthExpense = 0;

    for (const tx of prevMonthTx) {
      const rawAmount = tx.amount;
      const amount =
        rawAmount != null && !isNaN(Number(rawAmount)) ? Number(rawAmount) : 0;
      if (tx.type === "income") {
        prevMonthIncome += amount;
      } else {
        prevMonthExpense += amount;
      }
    }

    const prevMonthNet = prevMonthIncome - prevMonthExpense;

    // ── Calculate Yearly Trend ───────────────────────────────────────────────
    const yearlyTrend: KasRtSummaryResponse["yearlyTrend"] = trendMonths.map(
      ({ year, month }) => {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const monthStartStr = toDateInputValue(monthStart);
        const monthEndStr = toDateInputValue(monthEnd);
        const monthLabel = monthStart.toLocaleDateString("id-ID", {
          month: "short",
        });

        // Use string comparison for YYYY-MM-DD dates to avoid timezone issues
        const monthTx = transactions.filter((tx) => {
          const txDateStr = tx.date;
          return txDateStr >= monthStartStr && txDateStr <= monthEndStr;
        });

        let income = 0;

        let expense = 0;

        for (const tx of monthTx) {
          const rawAmount = tx.amount;
          const amount =
            rawAmount != null && !isNaN(Number(rawAmount))
              ? Number(rawAmount)
              : 0;

          if (tx.type === "income") {
            income += amount;
          } else {
            expense += amount;
          }
        }

        return {
          month: `${year}-${String(month + 1).padStart(2, "0")}`,
          label: monthLabel,
          income,
          expense,
        };
      },
    );

    // ── Calculate IPL Collection ─────────────────────────────────────────────
    const TOTAL_HOUSES = 85; // As clarified by user
    const iplCategory = "IPL";

    const iplTx = selectedMonthTx.filter(
      (tx) => tx.category === iplCategory && tx.type === "income",
    );

    // Extract block numbers from reference (assuming format like "BLOCK-01" or similar)
    const paidBlocks = new Set<string>();
    for (const tx of iplTx) {
      if (tx.reference && tx.reference.trim()) {
        paidBlocks.add(tx.reference.trim());
      }
    }

    const paidHouses = paidBlocks.size;
    const iplPercentage =
      TOTAL_HOUSES > 0 ? Math.round((paidHouses / TOTAL_HOUSES) * 100) : 0;
    const unpaidHouses = Array.from(paidBlocks); // Inverted: showing paid blocks

    const iplCollection: KasRtSummaryResponse["iplCollection"] = {
      totalHouses: TOTAL_HOUSES,
      paidHouses,
      percentage: iplPercentage,
      unpaidHouses,
    };

    // ── Calculate Quick Stats ───────────────────────────────────────────────
    // Average per day (based on days with transactions)
    const daysWithTx = dailyBreakdown.length;
    const avgPerDay =
      daysWithTx > 0
        ? (selectedMonthIncome + selectedMonthExpense) / daysWithTx
        : 0;

    // Best and worst days (by net: income - expense)
    const dailyNet = dailyBreakdown.map((d) => ({
      date: d.date,
      net: d.income - d.expense,
    }));

    let bestDay: { date: string; amount: number } | null = null;
    let worstDay: { date: string; amount: number } | null = null;

    for (const day of dailyNet) {
      if (bestDay === null || day.net > bestDay.amount) {
        bestDay = { date: day.date, amount: day.net };
      }
      if (worstDay === null || day.net < worstDay.amount) {
        worstDay = { date: day.date, amount: day.net };
      }
    }

    // Highest category (by amount)
    const highestCategory =
      byCategory.length > 0
        ? { name: byCategory[0].category, amount: byCategory[0].amount }
        : { name: "Tidak ada", amount: 0 };

    const stats: KasRtSummaryResponse["stats"] = {
      avgPerDay,
      bestDay: bestDay ?? { date: "-", amount: 0 },
      worstDay: worstDay ?? { date: "-", amount: 0 },
      highestCategory,
    };

    // ── Build Response ───────────────────────────────────────────────────────
    const response: KasRtSummaryResponse = {
      selectedMonth: {
        year: targetYear,
        month: targetMonth + 1,
        label: selectedMonthLabel,
        income: selectedMonthIncome,
        expense: selectedMonthExpense,
        net: selectedMonthNet,
        transactionCount: selectedMonthTransactionCount,
        byCategory,
        dailyBreakdown,
      },
      previousMonth: {
        income: prevMonthIncome,
        expense: prevMonthExpense,
        net: prevMonthNet,
        label: prevMonthLabel,
      },
      yearlyTrend,
      iplCollection,
      stats,
    };
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memuat ringkasan." },
      { status: 500 },
    );
  }
}
