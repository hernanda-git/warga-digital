"use server";

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
  ROLE_IDS_CAN_SUBMIT_KAS_RT,
} from "@/lib/constants/seed-ids";

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

    // 2. Get all tenant_user row IDs that carry a kas-rt role (non-revoked)
    const { data: roleRows, error: roleErr } = await supabase
      .from("tenant_user_roles")
      .select("tenant_user_id")
      .in("role_id", ROLE_IDS_CAN_SUBMIT_KAS_RT)
      .is("revoked_at", null);

    if (roleErr) {
      console.error("[Kas RT] Fetch role rows error:", roleErr);
      return;
    }

    if (!roleRows?.length) return;

    const authorizedTenantUserIds = roleRows.map((r) => r.tenant_user_id);

    // 3. Resolve to user_ids: active, in this tenant, NOT the actor
    const { data: tenantUsers, error: tuErr } = await supabase
      .from("tenant_users")
      .select("user_id")
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE")
      .in("id", authorizedTenantUserIds)
      .neq("user_id", actorUserId);

    if (tuErr) {
      console.error("[Kas RT] Fetch recipients error:", tuErr);
      return;
    }

    if (!tenantUsers?.length) return;

    const uniqueRecipients = Array.from(
      new Set(tenantUsers.map((r) => r.user_id).filter(Boolean)),
    );

    if (uniqueRecipients.length === 0) return;

    // 4. Build notification content
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

    // 5. Insert one notification row per recipient
    const notificationRows = uniqueRecipients.map((recipientUserId) => ({
      tenant_id: tenantId,
      recipient_user_id: recipientUserId,
      actor_user_id: actorUserId,
      type: "KAS_RT",
      priority: "NORMAL",
      title: titleMap[action],
      body,
      action_url: "/kas-rt",
      entity_table: "kas_rt_transactions",
      entity_id: transactionId,
      dedupe_key: `kas_rt_transaction:${transactionId}:${action}:to:${recipientUserId}`,
      metadata: {
        transactionId,
        transactionType,
        amount: transactionAmount,
        date,
        action,
        actorFullName,
      },
      created_by: actorUserId,
    }));

    const { error: notifErr } = await supabase
      .from("notifications")
      .insert(notificationRows);

    if (notifErr) {
      console.error("[Kas RT] Insert notifications error:", notifErr);
    }
  } catch (error) {
    console.error("[Kas RT] Unexpected notification error:", error);
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
    transaction_details?: { name: string; rate_per_warga: number; jumlah_warga: number; subtotal: number }[] | null;
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
    .select("id, title, amount, type, date")
    .eq("id", id)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    console.error("[Kas RT] PATCH fetch error:", fetchError);
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
      "id, title, amount, type, date, reference, details, category, created_at, created_by",
    )
    .single();

  if (error || !data) {
    console.error("[Kas RT] PATCH update error:", error);
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

  // ── Handle transaction details (expense breakdown) ───────────────────────────
  let savedTransactionDetails: { id: string; name: string; rate_per_warga: number; jumlah_warga: number; subtotal: number; sort_order: number }[] = [];
  
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
        console.error("[Kas RT] PATCH insert transaction details error:", detailsError);
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

  // ── Handle attachments ───────────────────────────────────────────────────────
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  let savedAttachments: { id: string; file_name: string; url: string; mime_type: string | null }[] = [];
  
  // First, fetch existing attachments
  const { data: existingAttachments } = await supabase
    .from("kas_rt_attachments")
    .select("id, file_name, storage_path, mime_type")
    .eq("transaction_id", id)
    .order("created_at", { ascending: true });

  const bucketId =
    process.env.SUPABASE_BUCKET_KAS_RT ?? "kas-rt-attachments";
  const signedUrlExpiresIn = 3600;

  // Generate signed URLs for existing attachments in parallel
  if (existingAttachments && existingAttachments.length > 0) {
    const signedResults = await Promise.all(
      existingAttachments.map((att) =>
        supabase.storage
          .from(bucketId)
          .createSignedUrl(att.storage_path, signedUrlExpiresIn),
      ),
    );
    for (let i = 0; i < existingAttachments.length; i++) {
      const att = existingAttachments[i];
      const signed = signedResults[i].data;
      savedAttachments.push({
        id: att.id,
        file_name: att.file_name,
        url: signed?.signedUrl ?? "",
        mime_type: att.mime_type,
      });
    }
  }

  // Upload new attachments if provided
  if (body.attachments && body.attachments.length > 0) {
    const attachmentsToInsert: {
      transaction_id: string;
      file_name: string;
      storage_path: string;
      mime_type: string | null;
      size_bytes: number;
    }[] = [];

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

      try {
        const extension =
          file.name.includes(".") && file.name.split(".").length > 1
            ? file.name.split(".").pop()
            : "bin";
        const path = `${id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(bucketId)
          .upload(path, file, {
            contentType: file.type || undefined,
          });

        if (uploadError) {
          console.error(
            "[Kas RT] PATCH upload attachment error:",
            uploadError,
          );
          continue;
        }

        attachmentsToInsert.push({
          transaction_id: id,
          file_name: file.name,
          storage_path: path,
          mime_type: file.type || null,
          size_bytes: file.size,
        });
      } catch (err) {
        console.error("[Kas RT] PATCH unexpected upload error:", err);
      }
    }

    if (attachmentsToInsert.length > 0) {
      const { data: insertedAttachments, error: attachmentError } = await supabase
        .from("kas_rt_attachments")
        .insert(attachmentsToInsert)
        .select("id, file_name, storage_path, mime_type");

      if (attachmentError) {
        console.error(
          "[Kas RT] PATCH insert attachment rows error:",
          attachmentError,
        );
      } else if (insertedAttachments) {
        // Generate signed URLs for newly uploaded attachments in parallel
        const signedResults = await Promise.all(
          insertedAttachments.map((att) =>
            supabase.storage
              .from(bucketId)
              .createSignedUrl(att.storage_path, signedUrlExpiresIn),
          ),
        );
        for (let i = 0; i < insertedAttachments.length; i++) {
          const att = insertedAttachments[i];
          const signed = signedResults[i].data;
          savedAttachments.push({
            id: att.id,
            file_name: att.file_name,
            url: signed?.signedUrl ?? "",
            mime_type: att.mime_type,
          });
        }
      }
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
    attachments: savedAttachments,
    transaction_details: savedTransactionDetails,
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
    console.error("[Kas RT] DELETE fetch error:", fetchError);
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
    console.error("[Kas RT] DELETE soft-delete error:", deleteError);
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
