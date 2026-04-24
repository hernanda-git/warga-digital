/**
 * Kas-RT Server Data Layer
 *
 * Fetches Kas-RT page data directly on the server using Supabase.
 * Eliminates client-side hydration delay and HTTP overhead.
 */

import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
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
      .from("kas_rt_categories")
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
      .select("type, amount, date")
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
      const isIncome = tx.type === "income";
      const signed = isIncome ? amount : -amount;
      balance += signed;
      if (tx.date <= prevMonthEndStr) balanceEndOfPrevMonth += signed;
      if (tx.date >= thisMonthStartStr) {
        if (isIncome) thisMonthIncome += amount;
        else thisMonthExpense += amount;
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
): Promise<TransactionItem[]> {
  try {
    const supabase = createServerClient();
    const bucketId =
      process.env.SUPABASE_BUCKET_KAS_RT ?? "kas-rt-attachments";
    const signedUrlExpiresIn = 3600;

    let query = supabase
      .from("kas_rt_transactions")
      .select(
        "id, title, amount, type, date, created_at, created_by, reference, details, category, created_by_user:users!kas_rt_transactions_created_by_fkey(full_name), kas_rt_attachments(id, file_name, storage_path, mime_type), kas_rt_transaction_details(id, name, rate_per_warga, jumlah_warga, subtotal, sort_order)",
      )
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .is("deleted_at", null)
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
    if (error || !transactions?.length) {
      if (error)
      return [];
    }

    // Parallel signed URL generation
    const allAttachmentRefs: {
      txId: string;
      attId: string;
      file_name: string;
      storage_path: string;
      mime_type: string | null;
    }[] = [];
    for (const tx of transactions) {
      for (const att of (tx as any).kas_rt_attachments ?? []) {
        allAttachmentRefs.push({
          txId: (tx as any).id,
          attId: att.id,
          file_name: att.file_name,
          storage_path: att.storage_path,
          mime_type: att.mime_type,
        });
      }
    }

    const signedResults = await Promise.all(
      allAttachmentRefs.map((ref) =>
        supabase.storage
          .from(bucketId)
          .createSignedUrl(ref.storage_path, signedUrlExpiresIn),
      ),
    );

    const signedUrlByAttId = new Map<string, string>();
    for (let i = 0; i < allAttachmentRefs.length; i++) {
      signedUrlByAttId.set(
        allAttachmentRefs[i].attId,
        signedResults[i].data?.signedUrl ?? "",
      );
    }

    return (transactions as any[]).map((tx) => {
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
          url: signedUrlByAttId.get(att.id) ?? "",
          mime_type: att.mime_type,
        })),
        transaction_details: tx.kas_rt_transaction_details ?? [],
      };
    });
  } catch (err) {
    return [];
  }
}

// ─── Summary ────────────────────────────────────────────────────────────────

export async function fetchKasRtSummary(
  year: number,
  month: number,
): Promise<KasRtSummaryResponse | null> {
  try {
    // Re-use the existing API route logic by calling it internally
    // This avoids duplicating the complex aggregation logic
    const { GET } = await import("@/app/api/kas-rt/summary/route");
    const request = new Request(
      `http://localhost/api/kas-rt/summary?year=${year}&month=${month}`,
    );
    const response = await GET(request);
    if (!response.ok) return null;
    return (await response.json()) as KasRtSummaryResponse;
  } catch (err) {
    return null;
  }
}

// ─── House Statuses ─────────────────────────────────────────────────────────

export async function fetchKasRtHouseStatuses(): Promise<HouseTransactionStatus[]> {
  try {
    const supabase = createServerClient();

    const { data: houses, error: housesError } = await supabase
      .from("houses")
      .select("name, blok_rumah, status")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .eq("is_active", true)
      .order("blok_rumah");

    if (housesError || !houses?.length) {
      if (housesError)
      return [];
    }

    const blokList = houses.map((h) => h.blok_rumah).filter(Boolean);
    if (blokList.length === 0) return [];

    const { data: transactions, error: txError } = await supabase
      .from("kas_rt_transactions")
      .select("amount, date, reference")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .gte("date", "2026-01-01")
      .lt("date", "2027-01-01")
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
