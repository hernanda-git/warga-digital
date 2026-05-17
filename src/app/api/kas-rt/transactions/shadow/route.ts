"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import { notifyAllActiveUsers } from "@/lib/notifications";

// ── Guard: only RT_ADMIN (role_id = 4) can manage shadow transactions ────────
async function requireRtAdmin(supabase: ReturnType<typeof createServerClient>, userId: string): Promise<boolean> {
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!tenantUser) return false;

  const { data: roleRows } = await supabase
    .from("tenant_user_roles")
    .select("id")
    .eq("tenant_user_id", tenantUser.id)
    .eq("role_id", 4) // RT_ADMIN
    .is("revoked_at", null)
    .limit(1);

  return !!roleRows?.length;
}

// ── POST /api/kas-rt/transactions/shadow ─────────────────────────────────────
// Creates a shadow transaction (is_shadow = true) dated 31 December {year}.
// Only accessible by RT_ADMIN.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      blok_rumah?: string;
      amount?: number;
      year?: number;
      title?: string;
      details?: string;
      category?: string;
    };

    const blokRumah = body.blok_rumah?.trim() ?? "";
    const amount = body.amount != null && Number.isFinite(body.amount) ? Number(body.amount) : NaN;
    const year = body.year ?? new Date().getFullYear();

    // ── Validation ─────────────────────────────────────────────────────────
    if (!blokRumah) {
      return NextResponse.json({ message: "Blok rumah wajib dipilih." }, { status: 400 });
    }

    if (Number.isNaN(amount) || amount === 0) {
      return NextResponse.json({ message: "Nominal transaksi tidak valid. Harus bukan nol." }, { status: 400 });
    }

    if (!Number.isInteger(year) || year < 2020 || year > 2100) {
      return NextResponse.json({ message: "Tahun tidak valid." }, { status: 400 });
    }

    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ message: "Anda harus masuk." }, { status: 401 });
    }

    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json({ message: "Konfigurasi tenant/komunitas tidak ditemukan." }, { status: 500 });
    }

    const supabase = createServerClient();

    // ── Admin-only guard ───────────────────────────────────────────────────
    const isAdmin = await requireRtAdmin(supabase, session.userId);
    if (!isAdmin) {
      return NextResponse.json({ message: "Hanya Admin RT yang dapat membuat transaksi bayangan." }, { status: 403 });
    }

    // ── Auto-set date to 31 December {year} ────────────────────────────────
    const shadowDate = `${year}-12-31`;

    // ── Generate title ─────────────────────────────────────────────────────
    const category = body.category?.trim() || "IPL";
    const title = body.title?.trim() || `Penyesuaian ${category} Tahunan ${year} - Blok ${blokRumah}`;
    const details = body.details?.trim() || `Penyesuaian tahunan ${category} untuk blok ${blokRumah} periode ${year}`;

    // ── Insert shadow transaction ──────────────────────────────────────────
    const { data: createdTx, error: insertError } = await supabase
      .from("kas_rt_transactions")
      .insert({
        tenant_id: tenantId,
        community_id: communityId,
        title,
        amount,
        type: "income", // Shadow uses signed amount directly, type is metadata
        date: shadowDate,
        reference: blokRumah,
        details,
        category,
        is_shadow: true,
        created_by: session.userId,
      })
      .select("id, title, amount, type, date, reference, details, category, is_shadow, created_at, created_by")
      .single();

    if (insertError || !createdTx) {
      console.error("[kas-rt/transactions/shadow] Insert failed:", insertError);
      return NextResponse.json({ message: "Gagal menyimpan transaksi bayangan." }, { status: 500 });
    }

    // ── Notify all active users ────────────────────────────────────────────
    const { data: actorUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", session.userId)
      .maybeSingle();

    const actorFullName = actorUser?.full_name?.trim() || "Seseorang";
    const amountDisplay = Math.abs(amount).toLocaleString("id-ID");
    const amountType = amount > 0 ? "penambahan" : "pengurangan";

    await notifyAllActiveUsers(
      supabase,
      {
        tenant_id: tenantId,
        actor_user_id: session.userId,
        type: "KAS_RT",
        priority: "NORMAL",
        title: "Penyesuaian Kas RT Tahunan",
        body: `${title.trim()} – ${amountType} Rp ${amountDisplay} · Oleh: ${actorFullName}`,
        action_url: "/kas-rt",
        entity_table: "kas_rt_transactions",
        entity_id: createdTx.id,
        dedupe_key: `kas_rt_transaction:${createdTx.id}:CREATED`,
        metadata: {
          transactionId: createdTx.id,
          transactionType: "income",
          amount,
          date: shadowDate,
          action: "CREATED",
          actorFullName,
          isShadow: true,
        },
        created_by: session.userId,
      },
      session.userId,
    );

    return NextResponse.json({
      id: createdTx.id,
      title: createdTx.title,
      amount: Number(createdTx.amount),
      type: createdTx.type,
      date: createdTx.date,
      reference: createdTx.reference ?? "",
      details: createdTx.details ?? "",
      category: createdTx.category ?? null,
      is_shadow: createdTx.is_shadow,
      created_at: createdTx.created_at,
    });
  } catch (error) {
    console.error("[kas-rt/transactions/shadow] POST failed:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat menyimpan transaksi bayangan." }, { status: 500 });
  }
}

// ── GET /api/kas-rt/transactions/shadow ──────────────────────────────────────
// Lists all shadow transactions, grouped by year, for the admin UI.
export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ message: "Anda harus masuk." }, { status: 401 });
    }

    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json({ message: "Konfigurasi tenant/komunitas tidak ditemukan." }, { status: 500 });
    }

    const supabase = createServerClient();

    const isAdmin = await requireRtAdmin(supabase, session.userId);
    if (!isAdmin) {
      return NextResponse.json({ message: "Hanya Admin RT yang dapat melihat transaksi bayangan." }, { status: 403 });
    }

    const { data: transactions, error } = await supabase
      .from("kas_rt_transactions")
      .select("id, title, amount, type, date, reference, details, category, is_shadow, created_at, created_by, created_by_user:users!kas_rt_transactions_created_by_fkey(full_name)")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .eq("is_shadow", true)
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[kas-rt/transactions/shadow] GET failed:", error);
      return NextResponse.json({ message: "Gagal memuat transaksi bayangan." }, { status: 500 });
    }

    const mapped = (transactions ?? []).map((tx) => {
      const createdByUser = Array.isArray(tx.created_by_user)
        ? tx.created_by_user[0]
        : tx.created_by_user;

      return {
        id: tx.id,
        title: tx.title,
        amount: Number(tx.amount),
        type: tx.type,
        date: tx.date,
        reference: tx.reference ?? "",
        details: tx.details ?? "",
        category: tx.category ?? null,
        is_shadow: tx.is_shadow,
        created_at: tx.created_at,
        created_by_full_name: createdByUser?.full_name ?? null,
      };
    });

    return NextResponse.json({ transactions: mapped });
  } catch (error) {
    console.error("[kas-rt/transactions/shadow] GET failed:", error);
    return NextResponse.json({ message: "Terjadi kesalahan." }, { status: 500 });
  }
}
