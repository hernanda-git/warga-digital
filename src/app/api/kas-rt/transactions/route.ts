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
import {
  serverUpload,
  getPublicUrlSafe,
  ALLOWED_ATTACHMENT_TYPES,
} from "@/lib/r2";

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

    const attachmentNames: string[] = [];
    const attachmentsToInsert: {
      transaction_id: string;
      file_name: string;
      storage_path: string;
      mime_type: string | null;
      size_bytes: number;
    }[] = [];

    if (files.length > 0) {
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json(
            {
              message: `Ukuran file ${file.name} melebihi batas maksimal 5MB.`,
            },
            { status: 400 },
          );
        }
        if (
          !(ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(file.type)
        ) {
          return NextResponse.json(
            { message: `Tipe file ${file.name} tidak didukung.` },
            { status: 400 },
          );
        }
      }

      console.log(
        `[kas-rt/transactions] Starting upload of ${files.length} attachment(s) for tx ${data.id}`,
      );

      for (const file of files) {
        const extension =
          file.name.includes(".") && file.name.split(".").length > 1
            ? file.name.split(".").pop()
            : "bin";
        const objectKey = `kas-rt/${data.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${extension}`;

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        await serverUpload(
          fileBuffer,
          objectKey,
          file.type || "application/octet-stream",
          "public, max-age=3600",
        );
        console.log(
          `[kas-rt/transactions] Uploaded attachment "${file.name}" to ${objectKey}`,
        );

        attachmentsToInsert.push({
          transaction_id: data.id,
          file_name: file.name,
          storage_path: objectKey,
          mime_type: file.type || null,
          size_bytes: file.size,
        });

        attachmentNames.push(file.name);
      }

      if (attachmentsToInsert.length > 0) {
        const { error: attachmentError } = await supabase
          .from("kas_rt_attachments")
          .insert(attachmentsToInsert);
        if (attachmentError) {
          console.error(
            "[kas-rt/transactions] Failed to insert attachment records:",
            JSON.stringify(attachmentError),
          );
          return NextResponse.json(
            {
              message:
                "Transaksi tersimpan, tetapi gagal menyimpan data lampiran.",
            },
            { status: 500 },
          );
        }
        console.log(
          `[kas-rt/transactions] Inserted ${attachmentsToInsert.length} attachment record(s) for tx ${data.id}`,
        );
      }
    }

    const attachmentPayload: {
      file_name: string;
      url: string | null;
      mime_type: string | null;
    }[] = [];
    if (files.length > 0 && attachmentsToInsert.length > 0) {
      for (const att of attachmentsToInsert) {
        attachmentPayload.push({
          file_name: att.file_name,
          url: getPublicUrlSafe(att.storage_path),
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
        console.error(
          "[kas-rt/transactions] Failed to insert transaction details:",
          detailsError,
        );
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
    console.error("[kas-rt/transactions] POST failed:", error);
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
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json(
        { message: "Anda harus masuk untuk melihat transaksi." },
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
      .is("deleted_at", null)
      .eq("is_shadow", false);

    // Apply filters to count query
    if (typeFilter && (typeFilter === "income" || typeFilter === "expense")) {
      countQuery = countQuery.eq("type", typeFilter);
    }
    if (categoryFilter) {
      countQuery = countQuery.ilike("category", `%${categoryFilter}%`);
    }
    if (blockFilter) {
      countQuery = countQuery.eq("reference", blockFilter);
    }
    if (startDate) {
      countQuery = countQuery.gte("date", startDate);
    }
    if (endDate) {
      countQuery = countQuery.lte("date", endDate);
    }

    const { count: totalCount, error: countError } = await countQuery;
    if (countError) {
      console.error("[kas-rt/transactions] Count query failed:", countError);
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
      .eq("is_shadow", false)
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
      query = query.eq("reference", blockFilter);
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

    const processedTransactions = (transactions ?? []).map((tx) => {
      const attachmentPayload = (tx.kas_rt_attachments ?? []).map((att) => ({
        id: att.id,
        file_name: att.file_name,
        url: getPublicUrlSafe(att.storage_path) ?? "",
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
    console.error("[kas-rt/transactions] GET failed:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data transaksi." },
      { status: 500 },
    );
  }
}
