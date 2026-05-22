"use server";

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
  ROLE_IDS_CAN_SUBMIT_KAS_RT,
} from "@/lib/constants/seed-ids";
import {
  serverUpload,
  getPublicUrl,
  getPublicUrlSafe,
  ALLOWED_ATTACHMENT_TYPES,
} from "@/lib/r2";
import { notifyAllActiveUsers } from "@/lib/notifications";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireKasRtRole(): Promise<{ userId: string } | NextResponse> {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json(
      { message: "Anda harus masuk untuk melakukan tindakan ini." },
      { status: 401 },
    );
  }

  const supabase = createServerClient();

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", DEFAULT_TENANT_ID)
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
      { message: "Anda tidak memiliki izin untuk mengelola transaksi kas RT." },
      { status: 403 },
    );
  }

  return { userId: session.userId };
}

// ── Notification helper ───────────────────────────────────────────────────────
//
// Sends a KAS_RT notification to every active authorized manager
// (ROLE_IDS_CAN_SUBMIT_KAS_RT) EXCEPT the user who performed the action.

async function sendKasRtNotification(
  supabase: ReturnType<typeof createServerClient>,
  tenantId: string,
  actorUserId: string,
  transactionId: string,
  transactionTitle: string,
  transactionAmount: number,
  transactionType: "income" | "expense",
  date: string,
  action: "UPDATED" | "DELETED",
) {
  try {
    // 1. Resolve actor's full name
    const { data: actorUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", actorUserId)
      .maybeSingle();

    const actorFullName = actorUser?.full_name?.trim() || "Seseorang";

    // 2. Build notification content
    const titleMap: Record<"UPDATED" | "DELETED", string> = {
      UPDATED:
        transactionType === "income"
          ? "Pemasukan Kas RT Diperbarui"
          : "Pengeluaran Kas RT Diperbarui",
      DELETED:
        transactionType === "income"
          ? "Pemasukan Kas RT Dihapus"
          : "Pengeluaran Kas RT Dihapus",
    };

    const actionLabelMap: Record<"UPDATED" | "DELETED", string> = {
      UPDATED: "Diperbarui oleh",
      DELETED: "Dihapus oleh",
    };

    const body =
      `${transactionTitle.trim()} – Rp ${Math.round(transactionAmount).toLocaleString("id-ID")}` +
      ` · ${actionLabelMap[action]}: ${actorFullName}`;

    // 3. Send to all active users in the community
    await notifyAllActiveUsers(
      supabase,
      {
        tenant_id: tenantId,
        actor_user_id: actorUserId,
        type: "KAS_RT",
        priority: "NORMAL",
        title: titleMap[action],
        body,
        action_url: "/kas-rt",
        entity_table: "kas_rt_transactions",
        entity_id: transactionId,
        dedupe_key: `kas_rt_transaction:${transactionId}:${action}`,
        metadata: {
          transactionId,
          transactionType,
          amount: transactionAmount,
          date,
          action,
          actorFullName,
        },
        created_by: actorUserId,
      },
      actorUserId,
    );
  } catch (error) {
    console.error(
      "[kas-rt/transactions/id] sendKasRtNotification error:",
      error,
    );
  }
}

// ── PATCH /api/kas-rt/transactions/[id] ──────────────────────────────────────
//
// Edit an existing transaction. Only fields present in the body are updated.
// Authorised roles: ROLE_IDS_CAN_SUBMIT_KAS_RT.
// Notifies all other authorized managers with the editor's name.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireKasRtRole();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "ID transaksi tidak valid." },
      { status: 400 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  let body: {
    title?: string;
    amount?: number;
    type?: string;
    date?: string;
    reference?: string | null;
    details?: string | null;
    category?: string | null;
    asset_id?: string | null;
    transaction_details?:
      | {
          name: string;
          rate_per_warga: number;
          jumlah_warga: number;
          subtotal: number;
        }[]
      | null;
    attachments?: File[];
  } = {};

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const getString = (key: string) => {
      const value = form.get(key);
      return typeof value === "string" ? value : null;
    };

    body.title = getString("title") ?? undefined;
    const amountRaw = getString("amount");
    body.amount = amountRaw != null ? Number(amountRaw) : undefined;
    const typeRaw = getString("type");
    body.type =
      typeRaw === "income" || typeRaw === "expense" ? typeRaw : undefined;
    body.date = getString("date") ?? undefined;
    body.reference = getString("reference");
    body.details = getString("details");
    const catRaw = getString("category");
    body.category =
      catRaw != null && String(catRaw).trim() ? String(catRaw).trim() : null;

    const assetIdRaw = getString("asset_id");
    body.asset_id = assetIdRaw?.trim() || null;

    const detailsRaw = getString("transaction_details");
    if (detailsRaw) {
      try {
        body.transaction_details = JSON.parse(detailsRaw) as {
          name: string;
          rate_per_warga: number;
          jumlah_warga: number;
          subtotal: number;
        }[];
      } catch {
        // Invalid JSON, ignore
      }
    }

    body.attachments = form
      .getAll("attachments")
      .filter((value): value is File => value instanceof File);
  } else {
    body = await request.json().catch(() => ({}));
  }

  // Build partial update payload
  const patch: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json(
        { message: "Judul transaksi tidak boleh kosong." },
        { status: 400 },
      );
    }
    patch.title = title;
  }

  if (body.amount !== undefined) {
    if (
      typeof body.amount !== "number" ||
      !Number.isFinite(body.amount) ||
      body.amount <= 0
    ) {
      return NextResponse.json(
        { message: "Nominal transaksi tidak valid." },
        { status: 400 },
      );
    }
    patch.amount = body.amount;
  }

  if (body.type !== undefined) {
    if (body.type !== "income" && body.type !== "expense") {
      return NextResponse.json(
        { message: "Jenis transaksi tidak valid." },
        { status: 400 },
      );
    }
    patch.type = body.type;
  }

  if (body.date !== undefined) {
    if (!body.date) {
      return NextResponse.json(
        { message: "Tanggal transaksi wajib diisi." },
        { status: 400 },
      );
    }
    const parsed = new Date(body.date);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { message: "Format tanggal tidak valid." },
        { status: 400 },
      );
    }
    patch.date = body.date;
  }

  if (body.reference !== undefined) {
    patch.reference = body.reference?.trim() || null;
  }

  if (body.details !== undefined) {
    patch.details = body.details?.trim() || null;
  }

  if (body.category !== undefined) {
    patch.category =
      body.category && body.category.trim() ? body.category.trim() : null;
  }

  if (body.asset_id !== undefined) {
    patch.asset_id = body.asset_id?.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { message: "Tidak ada perubahan yang dikirim." },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Verify the transaction belongs to this tenant/community and is not deleted
  const { data: existing, error: fetchError } = await supabase
    .from("kas_rt_transactions")
    .select("id, title, amount, type, date, asset_id")
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { message: "Gagal memverifikasi transaksi." },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { message: "Transaksi tidak ditemukan." },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("kas_rt_transactions")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .select(
      "id, title, amount, type, date, reference, details, category, created_at, created_by, asset_id",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      { message: "Gagal memperbarui transaksi." },
      { status: 500 },
    );
  }

  // Notify all other authorized managers about the edit
  await sendKasRtNotification(
    supabase,
    DEFAULT_TENANT_ID,
    auth.userId,
    data.id,
    data.title,
    Number(data.amount),
    data.type as "income" | "expense",
    data.date,
    "UPDATED",
  );

  // ── Asset log for expense with linked asset ──────────────────────────────
  const newAssetId = patch.asset_id !== undefined ? (patch.asset_id as string | null) : existing.asset_id;

  if (data.type === "expense" && newAssetId && newAssetId !== existing.asset_id) {
    await supabase.from("rt_asset_logs").insert({
      asset_id: newAssetId,
      tenant_id: DEFAULT_TENANT_ID,
      log_type: "expense",
      notes: `Pengeluaran: ${data.title.trim()} - Rp ${Math.round(Number(data.amount)).toLocaleString("id-ID")}`,
      transaction_id: data.id,
      payment_amount: Number(data.amount),
      payment_date: data.date,
      logged_by: auth.userId,
    });
  }

  // ── Handle transaction details (expense breakdown) ───────────────────────────
  let savedTransactionDetails: {
    id: string;
    name: string;
    rate_per_warga: number;
    jumlah_warga: number;
    subtotal: number;
    sort_order: number;
  }[] = [];

  if (body.transaction_details !== undefined) {
    // Delete existing details first
    await supabase
      .from("kas_rt_transaction_details")
      .delete()
      .eq("transaction_id", id);

    // If new details provided, insert them
    if (body.transaction_details && body.transaction_details.length > 0) {
      const detailsToInsert = body.transaction_details.map((d, index) => ({
        transaction_id: id,
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
  } else {
    // Fetch existing details if not provided in body
    const { data: existingDetails } = await supabase
      .from("kas_rt_transaction_details")
      .select("id, name, rate_per_warga, jumlah_warga, subtotal, sort_order")
      .eq("transaction_id", id)
      .order("sort_order");

    if (existingDetails) {
      savedTransactionDetails = existingDetails;
    }
  }

  let savedAttachments: {
    id: string;
    file_name: string;
    url: string | null;
    mime_type: string | null;
  }[] = [];

  const { data: existingAttachments } = await supabase
    .from("kas_rt_attachments")
    .select("id, file_name, storage_path, mime_type")
    .eq("transaction_id", id)
    .order("created_at", { ascending: true });

  if (existingAttachments && existingAttachments.length > 0) {
    for (const att of existingAttachments) {
      savedAttachments.push({
        id: att.id,
        file_name: att.file_name,
        url: getPublicUrlSafe(att.storage_path),
        mime_type: att.mime_type,
      });
    }
  }

  if (body.attachments && body.attachments.length > 0) {
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    for (const file of body.attachments) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            message: `Ukuran file ${file.name} melebihi batas maksimal 5MB.`,
            fileName: file.name,
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

    const attachmentsToInsert: {
      transaction_id: string;
      file_name: string;
      storage_path: string;
      mime_type: string | null;
      size_bytes: number;
    }[] = [];

    try {
      console.log(
        `[kas-rt/transactions/${id}] Starting upload of ${body.attachments.length} attachment(s)`,
      );

      for (const file of body.attachments) {
        const extension =
          file.name.includes(".") && file.name.split(".").length > 1
            ? file.name.split(".").pop()
            : "bin";
        const objectKey = `kas-rt/${id}/${Date.now()}-${Math.random()
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
          `[kas-rt/transactions/${id}] Uploaded attachment "${file.name}" to ${objectKey}`,
        );

        attachmentsToInsert.push({
          transaction_id: id,
          file_name: file.name,
          storage_path: objectKey,
          mime_type: file.type || null,
          size_bytes: file.size,
        });
      }

      if (attachmentsToInsert.length > 0) {
        const { data: insertedAttachments, error: attachmentError } =
          await supabase
            .from("kas_rt_attachments")
            .insert(attachmentsToInsert)
            .select("id, file_name, storage_path, mime_type");

        if (attachmentError) {
          console.error(
            `[kas-rt/transactions/${id}] Failed to insert attachment records:`,
            JSON.stringify(attachmentError),
          );
          return NextResponse.json(
            {
              message:
                "Transaksi diperbarui, tetapi gagal menyimpan data lampiran.",
            },
            { status: 500 },
          );
        }

        console.log(
          `[kas-rt/transactions/${id}] Inserted ${insertedAttachments.length} attachment record(s)`,
        );
        for (const att of insertedAttachments) {
          savedAttachments.push({
            id: att.id,
            file_name: att.file_name,
            url: getPublicUrlSafe(att.storage_path),
            mime_type: att.mime_type,
          });
        }
      }
    } catch (err) {
      console.error(
        `[kas-rt/transactions/${id}] Attachment upload failed:`,
        err,
      );
      return NextResponse.json(
        { message: "Gagal mengunggah lampiran. Transaksi tidak diperbarui." },
        { status: 500 },
      );
    }
  }

  // ── Resolve asset name ───────────────────────────────────────────────────
  let patchedAssetName: string | null = null;
  if (data.asset_id) {
    const { data: patchedAsset } = await supabase
      .from("rt_assets")
      .select("name")
      .eq("id", data.asset_id)
      .maybeSingle();
    patchedAssetName = patchedAsset?.name ?? null;
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
    attachments: savedAttachments,
    transaction_details: savedTransactionDetails,
    asset_id: data.asset_id,
    asset_name: patchedAssetName,
  });
}

// ── DELETE /api/kas-rt/transactions/[id] ─────────────────────────────────────
//
// Soft-deletes a transaction by setting deleted_at = now().
// The record is retained for audit purposes and excluded from all public reads.
// Notifies all other authorized managers with the deleter's name.

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireKasRtRole();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { message: "ID transaksi tidak valid." },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Verify the transaction exists, belongs to this tenant/community, and isn't already deleted
  const { data: existing, error: fetchError } = await supabase
    .from("kas_rt_transactions")
    .select("id, title, amount, type, date")
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { message: "Gagal memverifikasi transaksi." },
      { status: 500 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { message: "Transaksi tidak ditemukan atau sudah dihapus." },
      { status: 404 },
    );
  }

  const { error: deleteError } = await supabase
    .from("kas_rt_transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID);

  if (deleteError) {
    return NextResponse.json(
      { message: "Gagal menghapus transaksi." },
      { status: 500 },
    );
  }

  // Notify all other authorized managers about the deletion
  await sendKasRtNotification(
    supabase,
    DEFAULT_TENANT_ID,
    auth.userId,
    existing.id,
    existing.title,
    Number(existing.amount),
    existing.type as "income" | "expense",
    existing.date,
    "DELETED",
  );

  return NextResponse.json({
    deleted: true,
    id,
    title: existing.title,
  });
}
