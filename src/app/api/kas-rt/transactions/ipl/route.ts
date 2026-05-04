"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
  ROLE_IDS_CAN_SUBMIT_KAS_RT,
} from "@/lib/constants/seed-ids";
import { getMonthNameIndonesian, applyTemplate } from "@/lib/kas-rt-utils";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      blok_rumah?: string;
      amount?: number;
      override?: boolean;
      title?: string;
      details?: string;
    };

    const blokRumah = body.blok_rumah?.trim() ?? "";
    const amount =
      body.amount != null && Number.isFinite(body.amount)
        ? Number(body.amount)
        : NaN;
    const override = body.override === true;
    const customTitle = body.title?.trim();
    const customDetails = body.details?.trim();

    if (!blokRumah) {
      return NextResponse.json(
        { message: "Blok rumah wajib dipilih." },
        { status: 400 },
      );
    }

    if (Number.isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Nominal IPL tidak valid." },
        { status: 400 },
      );
    }

    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json(
        { message: "Anda harus masuk untuk mencatat transaksi." },
        { status: 401 },
      );
    }

    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json(
        { message: "Konfigurasi tenant/komunitas tidak ditemukan." },
        { status: 500 },
      );
    }

    const supabase = createServerClient();

    // ── Permission check ───────────────────────────────────────────────────
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", session.userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!tenantUser) {
      return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
    }

    const { data: roleAssignments } = await supabase
      .from("tenant_user_roles")
      .select("id")
      .eq("tenant_user_id", tenantUser.id)
      .in("role_id", ROLE_IDS_CAN_SUBMIT_KAS_RT)
      .is("revoked_at", null);

    if (!roleAssignments?.length) {
      return NextResponse.json(
        {
          message: "Anda tidak memiliki izin untuk mencatat transaksi kas RT.",
        },
        { status: 403 },
      );
    }

    // ── Fetch IPL category templates ───────────────────────────────────────
    const { data: iplCategory } = await supabase
      .from("kas_rt_transaction_categories")
      .select("name, title_template, desc_template")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .eq("name", "IPL")
      .eq("is_active", true)
      .maybeSingle();

    const monthName = getMonthNameIndonesian(new Date());
    const titleTemplate = iplCategory?.title_template ?? "IPL Bulan {bulan}";
    const descTemplate =
      iplCategory?.desc_template ??
      "Pembayaran IPL untuk blok {blok} periode {bulan}";

    const generatedTitle = applyTemplate(titleTemplate, {
      bulan: monthName,
      blok: blokRumah,
    });
    const generatedDetails = applyTemplate(descTemplate, {
      bulan: monthName,
      blok: blokRumah,
    });

    const title = customTitle || generatedTitle;
    const details = customDetails || generatedDetails;

    const today = new Date().toISOString().slice(0, 10);

    // ── Duplicate check ────────────────────────────────────────────────────
    if (!override) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth(); // 0-indexed

      const { data: duplicates } = await supabase
        .from("kas_rt_transactions")
        .select("id, title, amount, date")
        .eq("tenant_id", tenantId)
        .eq("community_id", communityId)
        .eq("type", "income")
        .eq("category", "IPL")
        .eq("reference", blokRumah)
        .is("deleted_at", null)
        .gte("date", `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`)
        .lt(
          "date",
          `${currentYear}-${String(currentMonth + 2).padStart(2, "0")}-01`,
        );

      if (duplicates && duplicates.length > 0) {
        return NextResponse.json(
          {
            message: `Blok ${blokRumah} sudah tercatat membayar IPL bulan ${monthName} ini.`,
            duplicates: duplicates.map((d) => ({
              id: d.id,
              title: d.title,
              amount: Number(d.amount),
              date: d.date,
            })),
          },
          { status: 409 },
        );
      }
    }

    // ── Insert transaction ─────────────────────────────────────────────────
    const { data: createdTx, error: insertError } = await supabase
      .from("kas_rt_transactions")
      .insert({
        tenant_id: tenantId,
        community_id: communityId,
        title: title.trim(),
        amount,
        type: "income",
        date: today,
        reference: blokRumah,
        details: details.trim(),
        category: "IPL",
        created_by: session.userId,
      })
      .select(
        "id, title, amount, type, date, reference, details, category, created_at, created_by",
      )
      .single();

    if (insertError || !createdTx) {
      console.error("[kas-rt/transactions/ipl] Insert failed:", insertError);
      return NextResponse.json(
        { message: "Gagal menyimpan transaksi IPL." },
        { status: 500 },
      );
    }

    // ── Notifications (same logic as existing income POST) ─────────────────
    const { data: actorUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", session.userId)
      .maybeSingle();

    const actorFullName = actorUser?.full_name?.trim() || "Seseorang";
    const notifTitle = "Pemasukan Kas RT Baru";
    const notifBody =
      `${title.trim()} – Rp ${Math.round(amount).toLocaleString("id-ID")}` +
      ` · Dicatat oleh: ${actorFullName}`;
    const notifMeta = {
      transactionId: createdTx.id,
      transactionType: "income",
      amount,
      date: today,
      action: "CREATED",
      actorFullName,
    };

    const { data: roleRows, error: roleErr } = await supabase
      .from("tenant_user_roles")
      .select("tenant_user_id")
      .in("role_id", ROLE_IDS_CAN_SUBMIT_KAS_RT)
      .is("revoked_at", null);

    if (roleErr) {
      console.error(
        "[kas-rt/transactions/ipl] Role query error:",
        roleErr,
      );
    } else if (roleRows?.length) {
      const authorizedTenantUserIds = roleRows.map((r) => r.tenant_user_id);

      const { data: recipientRows, error: recipientErr } = await supabase
        .from("tenant_users")
        .select("user_id")
        .eq("tenant_id", tenantId)
        .eq("status", "ACTIVE")
        .in("id", authorizedTenantUserIds)
        .neq("user_id", session.userId);

      if (recipientErr) {
        console.error(
          "[kas-rt/transactions/ipl] Recipient query error:",
          recipientErr,
        );
      } else if (recipientRows && recipientRows.length > 0) {
        const uniqueRecipients = Array.from(
          new Set(recipientRows.map((row) => row.user_id).filter(Boolean)),
        );

        const notificationRows = uniqueRecipients.map((recipientUserId) => ({
          tenant_id: tenantId,
          recipient_user_id: recipientUserId,
          actor_user_id: session.userId,
          type: "KAS_RT",
          priority: "NORMAL",
          title: notifTitle,
          body: notifBody,
          action_url: "/kas-rt",
          entity_table: "kas_rt_transactions",
          entity_id: createdTx.id,
          dedupe_key: `kas_rt_transaction:${createdTx.id}:CREATED:to:${recipientUserId}`,
          metadata: notifMeta,
          created_by: session.userId,
        }));

        const { error: notifErr } = await supabase
          .from("notifications")
          .insert(notificationRows);

        if (notifErr) {
          console.error(
            "[kas-rt/transactions/ipl] Failed to insert notifications:",
            notifErr,
          );
        }
      }
    }

    return NextResponse.json({
      id: createdTx.id,
      title: createdTx.title,
      amount: Number(createdTx.amount),
      type: createdTx.type,
      date: createdTx.date,
      created_at: createdTx.created_at,
      created_by: createdTx.created_by,
      reference: createdTx.reference ?? "",
      details: createdTx.details ?? "",
      category: createdTx.category ?? null,
      attachments: [],
      transaction_details: [],
    });
  } catch (error) {
    console.error("[kas-rt/transactions/ipl] POST failed:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menyimpan transaksi IPL." },
      { status: 500 },
    );
  }
}
