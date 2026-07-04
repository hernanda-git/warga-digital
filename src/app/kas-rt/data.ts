/**
 * Kas-RT Server Data Layer
 *
 * Fetches Kas-RT page data directly on the server using Supabase.
 * Eliminates client-side hydration delay and HTTP overhead.
 */

import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { getPublicUrl, getPublicUrlSafe } from "@/lib/r2";
import { sortBlokRumah } from "@/lib/blok-rumah";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
  ROLE_IDS_CAN_SUBMIT_KAS_RT,
} from "@/lib/constants/seed-ids";
import type {
  TransactionItem,
  KasRtCategory,
  KasRtTotals,
  KasRtSummaryResponse,
  HouseTransactionStatus,
} from "@/types/kas-rt";

// ─── Auth Guard ─────────────────────────────────────────────────────────────

export async function requireAuth() {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/auth/login");
  }
  return session;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDateInputValue(date: Date): string {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
}

function getCommunityNameFromDb(supabase: any): Promise<string> {
  return Promise.resolve("Warga Digital"); // fallback; override below
}

// ─── Community Info ─────────────────────────────────────────────────────────

export async function fetchKasRtCommunityInfo(): Promise<string> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("communities")
      .select("name")
      .eq("id", DEFAULT_COMMUNITY_ID)
      .single();
    return data?.name ?? "Warga Digital";
  } catch {
    return "Warga Digital";
  }
}

// ─── Permissions ────────────────────────────────────────────────────────────

export async function fetchKasRtPermissions(userId: string): Promise<{
  canSubmitTransaction: boolean;
}> {
  try {
    const supabase = createServerClient();
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("user_id", userId)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("status", "ACTIVE")
      .single();

    if (!tenantUser) return { canSubmitTransaction: false };

    const { data: roles } = await supabase
      .from("tenant_user_roles")
      .select("role_id")
      .eq("tenant_user_id", tenantUser.id)
      .is("revoked_at", null);

    const roleIds = (roles ?? []).map((r) => r.role_id);
    const canSubmitTransaction = ROLE_IDS_CAN_SUBMIT_KAS_RT.some((id) =>
      roleIds.includes(id),
    );

    return { canSubmitTransaction };
  } catch {
    return { canSubmitTransaction: false };
  }
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function fetchKasRtCategories(): Promise<KasRtCategory[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("kas_rt_transaction_categories")
      .select("id, name, applies_to, title_template, desc_template, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    return (data ?? []) as KasRtCategory[];
  } catch {
    return [];
  }
}

// ─── Hero / Totals ──────────────────────────────────────────────────────────

export async function fetchKasRtHero(): Promise<KasRtTotals | null> {
  try {
    const supabase = createServerClient();
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonthIndex = now.getMonth();
    const thisMonthStartStr = toDateInputValue(
      new Date(thisYear, thisMonthIndex, 1),
    );
    const prevMonthEnd = new Date(thisYear, thisMonthIndex, 0);
    const prevMonthEndStr = toDateInputValue(prevMonthEnd);
    const prevMonthStartStr = toDateInputValue(
      new Date(thisYear, thisMonthIndex - 1, 1),
    );
    const prevMonthEndLabel = prevMonthEnd.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_kas_rt_summary",
      {
        p_tenant_id: DEFAULT_TENANT_ID,
        p_community_id: DEFAULT_COMMUNITY_ID,
        p_this_month_start: thisMonthStartStr,
        p_prev_month_end: prevMonthEndStr,
        p_prev_month_start: prevMonthStartStr,
      },
    );

    if (!rpcError && rpcData) {
      const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      const thisMonthIncome = Number(result?.this_month_income ?? 0);
      const thisMonthExpense = Number(result?.this_month_expense ?? 0);
      const thisMonthNet = thisMonthIncome - thisMonthExpense;
      const prevMonthNet = Number(result?.prev_month_net ?? 0);
      return {
        balance: Number(result?.balance ?? 0),
        balanceEndOfPrevMonth: Number(result?.balance_end_prev_month ?? 0),
        prevMonthEndLabel,
        thisMonthIncome,
        thisMonthExpense,
        thisMonthNet,
        deltaFromPrevious: thisMonthNet - prevMonthNet,
      };
    }

    // Fallback: bounded query + JS aggregation
    const { data: txData } = await supabase
      .from("kas_rt_transactions")
      .select("type, amount, date, is_shadow")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .is("deleted_at", null)
      .gte("date", `${thisYear - 2}-01-01`); // last 2 years bound

    let balance = 0;
    let balanceEndOfPrevMonth = 0;
    let thisMonthIncome = 0;
    let thisMonthExpense = 0;
    let prevMonthNet = 0;

    for (const tx of txData ?? []) {
      const amount = Number(tx.amount ?? 0);
      const isShadow = tx.is_shadow === true;
      // Shadow transactions use signed amount directly; normal use type-based sign
      const signed = isShadow
        ? amount
        : tx.type === "income"
          ? amount
          : -amount;
      balance += signed;
      if (tx.date <= prevMonthEndStr) balanceEndOfPrevMonth += signed;
      if (tx.date >= thisMonthStartStr) {
        // Shadow transactions are yearly (Dec 31), exclude from monthly breakdown
        if (!isShadow) {
          if (tx.type === "income") thisMonthIncome += amount;
          else thisMonthExpense += amount;
        }
      }
      if (tx.date >= prevMonthStartStr && tx.date <= prevMonthEndStr) {
        prevMonthNet += signed;
      }
    }

    const thisMonthNet = thisMonthIncome - thisMonthExpense;
    return {
      balance,
      balanceEndOfPrevMonth,
      prevMonthEndLabel,
      thisMonthIncome,
      thisMonthExpense,
      thisMonthNet,
      deltaFromPrevious: thisMonthNet - prevMonthNet,
    };
  } catch {
    return null;
  }
}

// ─── Transactions ───────────────────────────────────────────────────────────

export async function fetchKasRtTransactions(
  filters: {
    typeFilter?: string;
    categoryFilter?: string;
    blockFilter?: string;
    startDate?: string;
    endDate?: string;
  } = {},
): Promise<{ transactions: TransactionItem[]; total: number }> {
  try {
    const supabase = createServerClient();

    let countQuery = supabase
      .from("kas_rt_transactions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .is("deleted_at", null)
      .eq("is_shadow", false);

    if (filters.typeFilter && filters.typeFilter !== "all") {
      countQuery = countQuery.eq("type", filters.typeFilter);
    }
    if (filters.categoryFilter?.trim()) {
      countQuery = countQuery.ilike(
        "category",
        `%${filters.categoryFilter.trim()}%`,
      );
    }
    if (filters.blockFilter?.trim()) {
      countQuery = countQuery.ilike(
        "reference",
        `%${filters.blockFilter.trim()}%`,
      );
    }
    if (filters.startDate) {
      countQuery = countQuery.gte("date", filters.startDate);
    }
    if (filters.endDate) {
      countQuery = countQuery.lte("date", filters.endDate);
    }

    const { count: totalCount, error: countError } = await countQuery;
    if (countError) {
      console.error(
        "[kas-rt/data] fetchKasRtTransactions count error:",
        countError,
      );
    }

    let query = supabase
      .from("kas_rt_transactions")
      .select(
        "id, title, amount, type, date, created_at, created_by, reference, details, category, created_by_user:users!kas_rt_transactions_created_by_fkey(full_name), kas_rt_attachments(id, file_name, storage_path, mime_type), kas_rt_transaction_details(id, name, rate_per_warga, jumlah_warga, subtotal, sort_order)",
      )
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .is("deleted_at", null)
      .eq("is_shadow", false)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10);

    if (filters.typeFilter && filters.typeFilter !== "all") {
      query = query.eq("type", filters.typeFilter);
    }
    if (filters.categoryFilter?.trim()) {
      query = query.ilike("category", `%${filters.categoryFilter.trim()}%`);
    }
    if (filters.blockFilter?.trim()) {
      query = query.ilike("reference", `%${filters.blockFilter.trim()}%`);
    }
    if (filters.startDate) {
      query = query.gte("date", filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte("date", filters.endDate);
    }

    const { data: transactions, error } = await query;
    if (error) {
      console.error("[kas-rt/data] fetchKasRtTransactions query error:", error);
      return { transactions: [], total: 0 };
    }
    if (!transactions?.length) {
      return { transactions: [], total: totalCount ?? 0 };
    }

    const mappedTransactions = (transactions as any[]).map((tx) => {
      const createdByUser = Array.isArray(tx.created_by_user)
        ? tx.created_by_user[0]
        : tx.created_by_user;

      return {
        id: tx.id,
        title: tx.title,
        amount: Number(tx.amount),
        type: tx.type,
        date: tx.date,
        created_at: tx.created_at,
        created_by: tx.created_by,
        reference: tx.reference ?? "",
        details: tx.details ?? "",
        category: tx.category ?? null,
        created_by_full_name: createdByUser?.full_name ?? null,
        attachments: (tx.kas_rt_attachments ?? []).map((att: any) => ({
          id: att.id,
          file_name: att.file_name,
          url: getPublicUrlSafe(att.storage_path),
          mime_type: att.mime_type,
        })),
        transaction_details: tx.kas_rt_transaction_details ?? [],
      };
    });

    return { transactions: mappedTransactions, total: totalCount ?? 0 };
  } catch (err) {
    console.error("[kas-rt/data] fetchKasRtTransactions failed:", err);
    return { transactions: [], total: 0 };
  }
}

// ─── Summary ────────────────────────────────────────────────────────────────

export async function fetchKasRtSummary(
  year: number,
  month: number,
): Promise<KasRtSummaryResponse | null> {
  try {
    const { fetchKasRtSummaryData } = await import("@/lib/kas-rt-summary");
    return fetchKasRtSummaryData({ year, month: month - 1 });
  } catch {
    return null;
  }
}

// ─── House Statuses ─────────────────────────────────────────────────────────

export async function fetchKasRtHouseStatuses(): Promise<
  HouseTransactionStatus[]
> {
  try {
    const supabase = createServerClient();

    const { data: houses, error: housesError } = await supabase
      .from("houses")
      .select("name, blok_rumah, status")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .eq("is_active", true)
      .order("blok_rumah");

    if (housesError) {
      console.error(
        "[kas-rt/data] fetchKasRtHouseStatuses houses error:",
        housesError,
      );
      return [];
    }
    if (!houses?.length) {
      return [];
    }

    const blokList = houses.map((h) => h.blok_rumah).filter(Boolean);
    if (blokList.length === 0) return [];

    const currentYear = new Date().getFullYear();
    const { data: transactions, error: txError } = await supabase
      .from("kas_rt_transactions")
      .select("amount, date, reference, is_shadow")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .eq("is_shadow", false)
      .is("deleted_at", null)
      .gte("date", `${currentYear}-01-01`)
      .lt("date", `${currentYear + 1}-01-01`)
      .in("reference", blokList);

    if (txError) {
      return [];
    }

    const houseMap = new Map<string, HouseTransactionStatus>();
    houses.forEach((h) => {
      if (h.blok_rumah) {
        houseMap.set(h.blok_rumah, {
          blokRumah: h.blok_rumah,
          name: h.name,
          status: h.status as "PRIBADI" | "KONTRAKAN",
          total2026: 0,
          monthlyStatuses: Array(12).fill(0),
        });
      }
    });

    (transactions || []).forEach((tx) => {
      if (tx.reference && houseMap.has(tx.reference)) {
        const house = houseMap.get(tx.reference)!;
        const month = new Date(tx.date).getMonth();
        house.total2026 += Number(tx.amount);
        house.monthlyStatuses[month] += Number(tx.amount);
      }
    });

    return Array.from(houseMap.values()).sort((a, b) =>
      a.blokRumah.localeCompare(b.blokRumah),
    );
  } catch (err) {
    return [];
  }
}

// ─── Block Names ────────────────────────────────────────────────────────────

export async function fetchKasRtBlockNames(): Promise<string[]> {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("houses")
      .select("blok_rumah")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .eq("is_active", true)
      .not("blok_rumah", "is", null);

    if (error) {
      console.error("[kas-rt/data] fetchKasRtBlockNames error:", error);
      return [];
    }

    return data.map((h) => h.blok_rumah as string).sort(sortBlokRumah);
  } catch {
    return [];
  }
}
