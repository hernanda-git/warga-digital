"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
  ROLE_IDS_CAN_SUBMIT_KAS_RT,
} from "@/lib/constants/seed-ids";
import { notifyAllActiveUsers } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let title: string | undefined;
    let amount: number | undefined;
    let type: "income" | "expense" | undefined;
    let date: string | undefined;
    let reference: string | undefined | null;
    let details: string | undefined | null;
    let category: string | undefined | null;
    let transactionDetails:
      | {
          name: string;
          rate_per_warga: number;
          jumlah_warga: number;
          subtotal: number;
        }[]
      | undefined;
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const getString = (key: string) => {
        const value = form.get(key);
        return typeof value === "string" ? value : null;
      };

      title = getString("title") ?? undefined;
      const amountRaw = getString("amount");
      amount = amountRaw != null ? Number(amountRaw) : undefined;
      const typeRaw = getString("type");
      type =
        typeRaw === "income" || typeRaw === "expense" ? typeRaw : undefined;
      date = getString("date") ?? undefined;
      reference = getString("reference");
      details = getString("details");
      const catRaw = getString("category");
      category =
        catRaw != null && String(catRaw).trim() ? String(catRaw).trim() : null;

      const detailsRaw = getString("transaction_details");
      if (detailsRaw) {
        try {
          transactionDetails = JSON.parse(detailsRaw) as {
            name: string;
            rate_per_warga: number;
            jumlah_warga: number;
            subtotal: number;
          }[];
        } catch {
          // Invalid JSON, ignore
        }
      }

      files = form
        .getAll("attachments")
        .filter((value): value is File => value instanceof File);
    } else {
      const body = (await request.json()) as {
        title?: string;
        amount?: number;
        type?: "income" | "expense";
        date?: string;
        reference?: string | null;
        details?: string | null;
        category?: string | null;
      };
      title = body.title;
      amount = body.amount;
      type = body.type;
      date = body.date;
      reference = body.reference ?? null;
      details = body.details ?? null;
      category =
        body.category != null && String(body.category).trim()
          ? String(body.category).trim()
          : null;
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { message: "Judul transaksi wajib diisi." },
        { status: 400 },
      );
    }

    if (
      amount == null ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        { message: "Nominal transaksi tidak valid." },
        { status: 400 },
      );
    }

    if (type !== "income" && type !== "expense") {
      return NextResponse.json(
        { message: "Jenis transaksi tidak valid." },
        { status: 400 },
      );
    }

    if (!date || typeof date !== "string") {
      return NextResponse.json(
        { message: "Tanggal transaksi wajib diisi." },
        { status: 400 },
      );
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { message: "Format tanggal tidak valid." },
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
    const supabaseAuth = createServerClient();
    const { data: tenantUser } = await supabaseAuth
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("user_id", session.userId)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (!tenantUser) {
      return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
    }
    const { data: roleAssignments } = await supabaseAuth
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

    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json(
        { message: "Konfigurasi tenant/komunitas tidak ditemukan." },
        { status: 500 },
      );
    }

    const supabase = createServerClient();

    const detailsValue = (details ?? "").trim() || null;

    const { data, error } = await supabase
      .from("kas_rt_transactions")
      .insert({
        tenant_id: tenantId,
        community_id: communityId,
        title: title.trim(),
        amount,
        type,
        date,
        reference: reference?.trim() || null,
        details: detailsValue,
        category: category?.trim() || null,
        created_by: session.userId,
      })
      .select(
        "id, title, amount, type, date, reference, details, category, created_at, created_by",
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { message: "Gagal menyimpan transaksi kas RT." },
        { status: 500 },
      );
    }

    // ── Notifications ─────────────────────────────────────────────────────────
    const { data: actorUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", session.userId)
      .maybeSingle();

    const actorFullName = actorUser?.full_name?.trim() || "Seseorang";

    const notifTitle =
      type === "income" ? "Pemasukan Kas RT Baru" : "Pengeluaran Kas RT Baru";
    const notifBody =
      `${title.trim()} – Rp ${Math.round(amount).toLocaleString("id-ID")}` +
      ` · Dicatat oleh: ${actorFullName}`;
    const notifMeta = {
      transactionId: data.id,
      transactionType: type,
      amount,
      date,
      action: "CREATED",
      actorFullName,
    };

    if (type === "expense") {
      await notifyAllActiveUsers(
        supabase,
        {
          tenant_id: tenantId,
          actor_user_id: session.userId,
          type: "KAS_RT",
          priority: "NORMAL",
          title: notifTitle,
          body: notifBody,
          action_url: "/kas-rt",
          entity_table: "kas_rt_transactions",
          entity_id: data.id,
          dedupe_key: `kas_rt_transaction:${data.id}:CREATED`,
          metadata: notifMeta,
          created_by: session.userId,
        },
        session.userId,
      );
    } else {
      const { data: roleRows, error: roleErr } = await supabase
        .from("tenant_user_roles")
        .select("tenant_user_id")
        .in("role_id", ROLE_IDS_CAN_SUBMIT_KAS_RT)
        .is("revoked_at", null);

      if (roleErr) {
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
            entity_id: data.id,
            dedupe_key: `kas_rt_transaction:${data.id}:CREATED:to:${recipientUserId}`,
            metadata: notifMeta,
            created_by: session.userId,
          }));

          const { error: notifErr } = await supabase
            .from("notifications")
            .insert(notificationRows);

          if (notifErr) {
          }
        }
      }
    }

    const attachmentNames: string[] = [];
    const attachmentsToInsert: {
      transaction_id: string;
      file_name: string;
      storage_path: string;
      mime_type: string | null;
      size_bytes: number;
    }[] = [];

    if (files.length > 0) {
      const bucketId =
        process.env.SUPABASE_BUCKET_KAS_RT ?? "kas-rt-attachments";

      for (const file of files) {
        try {
          const extension =
            file.name.includes(".") && file.name.split(".").length > 1
              ? file.name.split(".").pop()
              : "bin";
          const path = `${data.id}/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${extension}`;

          const uploadResult = await supabase.storage
            .from(bucketId)
            .upload(path, file, {
              contentType: file.type || undefined,
            });

          if (uploadResult.error) {
            continue;
          }

          attachmentsToInsert.push({
            transaction_id: data.id,
            file_name: file.name,
            storage_path: path,
            mime_type: file.type || null,
            size_bytes: file.size,
          });

          attachmentNames.push(file.name);
        } catch (err) {
        }
      }

      if (attachmentsToInsert.length > 0) {
        const { error: attachmentError } = await supabase
          .from("kas_rt_attachments")
          .insert(attachmentsToInsert);
        if (attachmentError) {
        }
      }
    }

    const attachmentPayload: {
      file_name: string;
      url: string;
      mime_type: string | null;
    }[] = [];
    if (files.length > 0 && attachmentsToInsert.length > 0) {
      const bucketId =
        process.env.SUPABASE_BUCKET_KAS_RT ?? "kas-rt-attachments";
      const signedUrlExpiresIn = 3600;
      const signedResults = await Promise.all(
        attachmentsToInsert.map((att) =>
          supabase.storage
            .from(bucketId)
            .createSignedUrl(att.storage_path, signedUrlExpiresIn),
        ),
      );
      for (let i = 0; i < attachmentsToInsert.length; i++) {
        const att = attachmentsToInsert[i];
        const signed = signedResults[i].data;
        attachmentPayload.push({
          file_name: att.file_name,
          url: signed?.signedUrl ?? "",
          mime_type: att.mime_type,
        });
      }
    }

    // ── Save transaction details (expense breakdown) ───────────────────────────
    let savedTransactionDetails: {
      id: string;
      name: string;
      rate_per_warga: number;
      jumlah_warga: number;
      subtotal: number;
      sort_order: number;
    }[] = [];
    if (
      type === "expense" &&
      transactionDetails &&
      transactionDetails.length > 0
    ) {
      const detailsToInsert = transactionDetails.map((d, index) => ({
        transaction_id: data.id,
        name: d.name,
        rate_per_warga: d.rate_per_warga,
        jumlah_warga: d.jumlah_warga,
        subtotal: d.subtotal,
        sort_order: index,
      }));

      const { data: insertedDetails, error: detailsError } = await supabase
        .from("kas_rt_transaction_details")
        .insert(detailsToInsert)
        .select("id, name, rate_per_warga, jumlah_warga, subtotal, sort_order");

      if (detailsError) {
      } else if (insertedDetails) {
        savedTransactionDetails = insertedDetails;
      }
    }

    return NextResponse.json({
      id: data.id,
      title: data.title,
      amount: Number(data.amount),
      type: data.type,
      date: data.date,
      created_at: data.created_at,
      created_by: data.created_by,
      reference: data.reference ?? "",
      details: data.details ?? "",
      category: data.category ?? null,
      attachments: attachmentPayload,
      transaction_details: savedTransactionDetails,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menyimpan transaksi." },
      { status: 500 },
    );
  }
}

// ── GET /api/kas-rt/transactions ─────────────────────────────────────────────
// Server-side filtering with pagination
// Filters: type, category, block (reference), startDate, endDate
export async function GET(request: Request) {
  try {
    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json(
        { message: "Konfigurasi tenant/komunitas tidak ditemukan." },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);

    // ── Filter parameters (server-side filtering) ───────────────────────────
    const typeFilter = searchParams.get("type")?.trim() || null;
    const categoryFilter = searchParams.get("category")?.trim() || null;
    const blockFilter = searchParams.get("block")?.trim() || null;
    const startDate = searchParams.get("startDate")?.trim() || null;
    const endDate = searchParams.get("endDate")?.trim() || null;

    // ── Pagination parameters ──────────────────────────────────────────────
    const rawLimit = parseInt(searchParams.get("limit") ?? "50", 10);
    const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(
      Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1),
      200,
    );
    const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);

    const supabase = createServerClient();

    // ── Get total count for pagination metadata ────────────────────────────
    let countQuery = supabase
      .from("kas_rt_transactions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .is("deleted_at", null);

    // Apply filters to count query
    if (typeFilter && (typeFilter === "income" || typeFilter === "expense")) {
      countQuery = countQuery.eq("type", typeFilter);
    }
    if (categoryFilter) {
      countQuery = countQuery.ilike("category", `%${categoryFilter}%`);
    }
    if (blockFilter) {
      countQuery = countQuery.ilike("reference", `%${blockFilter}%`);
    }
    if (startDate) {
      countQuery = countQuery.gte("date", startDate);
    }
    if (endDate) {
      countQuery = countQuery.lte("date", endDate);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
    }

    // ── Fetch paginated transactions with filters ──────────────────────────
    let query = supabase
      .from("kas_rt_transactions")
      .select(
        "id, title, amount, type, date, created_at, created_by, reference, details, category, created_by_user:users!kas_rt_transactions_created_by_fkey(full_name), kas_rt_attachments(id, file_name, storage_path, mime_type), kas_rt_transaction_details(id, name, rate_per_warga, jumlah_warga, subtotal, sort_order)",
      )
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply server-side filters
    if (typeFilter && (typeFilter === "income" || typeFilter === "expense")) {
      query = query.eq("type", typeFilter);
    }
    if (categoryFilter) {
      query = query.ilike("category", `%${categoryFilter}%`);
    }
    if (blockFilter) {
      query = query.ilike("reference", `%${blockFilter}%`);
    }
    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    const { data: transactions, error: fetchError } = await query;
    if (fetchError) {
      return NextResponse.json(
        { message: "Gagal mengambil data transaksi." },
        { status: 500 },
      );
    }

    // ── Process attachments: generate signed URLs in parallel ─────────────
    const bucketId = process.env.SUPABASE_BUCKET_KAS_RT ?? "kas-rt-attachments";
    const signedUrlExpiresIn = 3600;

    // Collect all attachments across all transactions for parallel signing
    const allAttachmentRefs: {
      txId: string;
      attId: string;
      file_name: string;
      storage_path: string;
      mime_type: string | null;
    }[] = [];
    for (const tx of transactions ?? []) {
      for (const att of tx.kas_rt_attachments ?? []) {
        allAttachmentRefs.push({
          txId: tx.id,
          attId: att.id,
          file_name: att.file_name,
          storage_path: att.storage_path,
          mime_type: att.mime_type,
        });
      }
    }

    // Fetch all signed URLs in one parallel batch
    const signedResults = await Promise.all(
      allAttachmentRefs.map((ref) =>
        supabase.storage
          .from(bucketId)
          .createSignedUrl(ref.storage_path, signedUrlExpiresIn),
      ),
    );

    // Map signed URLs back by attachment ID
    const signedUrlByAttId = new Map<string, string>();
    for (let i = 0; i < allAttachmentRefs.length; i++) {
      signedUrlByAttId.set(
        allAttachmentRefs[i].attId,
        signedResults[i].data?.signedUrl ?? "",
      );
    }

    const processedTransactions = (transactions ?? []).map((tx) => {
      const attachmentPayload = (tx.kas_rt_attachments ?? []).map((att) => ({
        id: att.id,
        file_name: att.file_name,
        url: signedUrlByAttId.get(att.id) ?? "",
        mime_type: att.mime_type,
      }));

      // Handle created_by_user - Supabase returns it as array for FK joins
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
        attachments: attachmentPayload,
        transaction_details: tx.kas_rt_transaction_details ?? [],
      };
    });

    // ── Return paginated response with metadata ───────────────────────────
    const totalPages = Math.ceil((totalCount ?? 0) / limit);

    return NextResponse.json({
      transactions: processedTransactions,
      pagination: {
        total: totalCount ?? 0,
        limit,
        offset,
        has_more: offset + limit < (totalCount ?? 0),
        total_pages: totalPages,
        current_page: Math.floor(offset / limit) + 1,
      },
      filters: {
        type: typeFilter,
        category: categoryFilter,
        block: blockFilter,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data transaksi." },
      { status: 500 },
    );
  }
}
