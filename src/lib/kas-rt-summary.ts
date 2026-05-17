/**
 * Shared Kas-RT summary computation logic.
 * Used by both the API route and server-side data fetching.
 */

import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import type { KasRtSummaryResponse } from "@/types/kas-rt";

function toDateInputValue(date: Date): string {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
}

export interface FetchKasRtSummaryOptions {
  year: number;
  month: number; // 0-indexed
}

export async function fetchKasRtSummaryData({
  year,
  month,
}: FetchKasRtSummaryOptions): Promise<KasRtSummaryResponse | null> {
  const tenantId = DEFAULT_TENANT_ID;
  const communityId = DEFAULT_COMMUNITY_ID;

  if (!tenantId || !communityId) {
    return null;
  }

  const now = new Date();
  const targetYear = year;
  const targetMonth = month;

  if (targetMonth < 0 || targetMonth > 11) {
    return null;
  }

  const selectedMonthStart = new Date(targetYear, targetMonth, 1);
  const selectedMonthEnd = new Date(targetYear, targetMonth + 1, 0);
  const selectedMonthStartStr = toDateInputValue(selectedMonthStart);
  const selectedMonthEndStr = toDateInputValue(selectedMonthEnd);
  const selectedMonthLabel = selectedMonthStart.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const prevMonthStart = new Date(targetYear, targetMonth - 1, 1);
  const prevMonthEnd = new Date(targetYear, targetMonth, 0);
  const prevMonthStartStr = toDateInputValue(prevMonthStart);
  const prevMonthEndStr = toDateInputValue(prevMonthEnd);
  const prevMonthLabel = prevMonthStart.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const isCurrentYear = targetYear === now.getFullYear();
  const isFutureYear = targetYear > now.getFullYear();

  let trendMonths: { year: number; month: number }[] = [];

  if (isFutureYear) {
    trendMonths = [];
  } else if (isCurrentYear) {
    const currentMonth = now.getMonth();
    for (let m = 0; m <= currentMonth; m++) {
      trendMonths.push({ year: targetYear, month: m });
    }
  } else {
    for (let m = 0; m < 12; m++) {
      trendMonths.push({ year: targetYear, month: m });
    }
  }

  const supabase = createServerClient();

  const trendStart = isFutureYear
    ? selectedMonthEnd
    : new Date(targetYear, 0, 1);
  const trendStartStr = toDateInputValue(trendStart);

  const { data: allTx, error: txError } = await supabase
    .from("kas_rt_transactions")
    .select("type, amount, date, category, reference, is_shadow")
    .eq("tenant_id", tenantId)
    .eq("community_id", communityId)
    .is("deleted_at", null)
    .gte("date", trendStartStr)
    .lte("date", selectedMonthEndStr);

  if (txError) {
    return null;
  }

  const transactions = allTx ?? [];

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
    const isShadow = tx.is_shadow === true;

    if (isShadow) {
      // Shadow transactions: signed amount affects net directly
      if (amount >= 0) {
        selectedMonthIncome += amount;
      } else {
        selectedMonthExpense += Math.abs(amount);
      }
    } else {
      if (tx.type === "income") {
        selectedMonthIncome += amount;
      } else {
        selectedMonthExpense += amount;
      }
    }

    const catKey = tx.category ?? "Lainnya";
    const existing = categoryMap.get(catKey) ?? { amount: 0, count: 0 };
    categoryMap.set(catKey, {
      amount: existing.amount + amount,
      count: existing.count + 1,
    });

    const dateKey = tx.date;
    const daily = dailyMap.get(dateKey) ?? { income: 0, expense: 0 };
    if (isShadow) {
      if (amount >= 0) {
        daily.income += amount;
      } else {
        daily.expense += Math.abs(amount);
      }
    } else if (tx.type === "income") {
      daily.income += amount;
    } else {
      daily.expense += amount;
    }
    dailyMap.set(dateKey, daily);
  }

  const selectedMonthNet = selectedMonthIncome - selectedMonthExpense;
  const selectedMonthTransactionCount = selectedMonthTx.length;

  const byCategory: KasRtSummaryResponse["selectedMonth"]["byCategory"] =
    Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage:
          selectedMonthIncome + selectedMonthExpense > 0
            ? (data.amount / (selectedMonthIncome + selectedMonthExpense)) * 100
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

  const dailyBreakdown = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      income: data.income,
      expense: data.expense,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

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
    const isShadow = tx.is_shadow === true;
    if (isShadow) {
      if (amount >= 0) prevMonthIncome += amount;
      else prevMonthExpense += Math.abs(amount);
    } else if (tx.type === "income") {
      prevMonthIncome += amount;
    } else {
      prevMonthExpense += amount;
    }
  }

  const prevMonthNet = prevMonthIncome - prevMonthExpense;

  const yearlyTrend: KasRtSummaryResponse["yearlyTrend"] = trendMonths.map(
    ({ year: y, month: m }) => {
      const monthStart = new Date(y, m, 1);
      const monthEnd = new Date(y, m + 1, 0);
      const monthStartStr = toDateInputValue(monthStart);
      const monthEndStr = toDateInputValue(monthEnd);
      const monthLabel = monthStart.toLocaleDateString("id-ID", {
        month: "short",
      });

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
        const isShadow = tx.is_shadow === true;
        if (isShadow) {
          if (amount >= 0) income += amount;
          else expense += Math.abs(amount);
        } else if (tx.type === "income") {
          income += amount;
        } else {
          expense += amount;
        }
      }

      return {
        month: `${y}-${String(m + 1).padStart(2, "0")}`,
        label: monthLabel,
        income,
        expense,
      };
    },
  );

  const TOTAL_HOUSES = 85;
  const iplCategory = "IPL";
  const iplTx = selectedMonthTx.filter(
    (tx) => tx.category === iplCategory && tx.type === "income",
  );

  const paidBlocks = new Set<string>();
  for (const tx of iplTx) {
    if (tx.reference && tx.reference.trim()) {
      paidBlocks.add(tx.reference.trim());
    }
  }

  const paidHouses = paidBlocks.size;
  const iplPercentage =
    TOTAL_HOUSES > 0 ? Math.round((paidHouses / TOTAL_HOUSES) * 100) : 0;

  const iplCollection: KasRtSummaryResponse["iplCollection"] = {
    totalHouses: TOTAL_HOUSES,
    paidHouses,
    percentage: iplPercentage,
    unpaidHouses: Array.from(paidBlocks),
  };

  const daysWithTx = dailyBreakdown.length;
  const avgPerDay =
    daysWithTx > 0
      ? (selectedMonthIncome + selectedMonthExpense) / daysWithTx
      : 0;

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

  return {
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
}
