/**
 * IPL Page Server Data Layer
 */

import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import type { TransactionItem } from "@/types/kas-rt";

export async function requireAuth() {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/auth/login");
  }
  return session;
}

export async function getUserBlokRumah(userId: string): Promise<string | null> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("user_houses")
      .select("houses(blok_rumah)")
      .eq("user_id", userId)
      .eq("is_primary", true)
      .maybeSingle();
    return (data?.houses as any)?.blok_rumah ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch IPL (income) transactions for a specific house block in the current year.
 * Lightweight: no attachment signed URLs to keep it fast.
 */
export async function fetchIplTransactions(
  blokRumah: string,
): Promise<TransactionItem[]> {
  try {
    const supabase = createServerClient();
    const year = new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year + 1}-01-01`;

    const { data: rows, error } = await supabase
      .from("kas_rt_transactions")
      .select(
        "id, title, amount, type, date, created_at, created_by, reference, details, category, created_by_user:users!kas_rt_transactions_created_by_fkey(full_name)",
      )
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .eq("reference", blokRumah)
      .eq("type", "income")
      .is("deleted_at", null)
      .gte("date", yearStart)
      .lt("date", yearEnd)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !rows?.length) {
      return [];
    }

    return (rows as any[]).map((tx) => {
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
        created_by_full_name: createdByUser?.full_name ?? null,
        reference: tx.reference ?? "",
        details: tx.details ?? "",
        category: tx.category ?? null,
        attachments: [],
        transaction_details: [],
      };
    });
  } catch {
    return [];
  }
}
