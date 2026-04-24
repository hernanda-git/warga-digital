"use server";

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
  ROLE_IDS_CAN_SUBMIT_KAS_RT,
} from "@/lib/constants/seed-ids";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

// ── POST /api/kas-rt/transactions/[id]/attachments ───────────────────────────
//
// Add attachment(s) to an existing transaction

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireKasRtRole();
  if (auth instanceof NextResponse) return auth;

  const { id: transactionId } = await params;
  if (!transactionId) {
    return NextResponse.json(
      { message: "ID transaksi tidak valid." },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Verify transaction exists and belongs to this tenant/community
  const { data: transaction, error: fetchError } = await supabase
    .from("kas_rt_transactions")
    .select("id, title, type")
    .eq("id", transactionId)
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

  if (!transaction) {
    return NextResponse.json(
      { message: "Transaksi tidak ditemukan." },
      { status: 404 },
    );
  }

  // Parse multipart form data
  const formData = await request.formData();
  const files = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { message: "Tidak ada file yang diunggah." },
      { status: 400 },
    );
  }

  // Validate file sizes
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          message: `Ukuran file ${file.name} melebihi batas maksimal 5MB.`,
          fileName: file.name,
        },
        { status: 400 },
      );
    }
  }

  const bucketId =
    process.env.SUPABASE_BUCKET_KAS_RT ?? "kas-rt-attachments";

  const attachmentsToInsert: {
    transaction_id: string;
    file_name: string;
    storage_path: string;
    mime_type: string | null;
    size_bytes: number;
  }[] = [];

  const uploadedAttachments: {
    file_name: string;
    url: string;
    mime_type: string | null;
  }[] = [];

  // Upload files to storage
  for (const file of files) {
    try {
      const extension =
        file.name.includes(".") && file.name.split(".").length > 1
          ? file.name.split(".").pop()
          : "bin";
      const path = `${transactionId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketId)
        .upload(path, file, {
          contentType: file.type || undefined,
        });

      if (uploadError) {
        return NextResponse.json(
          { message: `Gagal mengunggah file ${file.name}.` },
          { status: 500 },
        );
      }

      attachmentsToInsert.push({
        transaction_id: transactionId,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type || null,
        size_bytes: file.size,
      });
    } catch (err) {
      return NextResponse.json(
        { message: `Terjadi kesalahan saat mengunggah file ${file.name}.` },
        { status: 500 },
      );
    }
  }

  // Insert attachment records into database
  if (attachmentsToInsert.length > 0) {
    const { error: attachmentError } = await supabase
      .from("kas_rt_attachments")
      .insert(attachmentsToInsert);

    if (attachmentError) {
      return NextResponse.json(
        { message: "Gagal menyimpan data lampiran." },
        { status: 500 },
      );
    }
  }

  // Generate signed URLs for the uploaded attachments in parallel
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
    uploadedAttachments.push({
      file_name: att.file_name,
      url: signed?.signedUrl ?? "",
      mime_type: att.mime_type,
    });
  }

  return NextResponse.json({
    success: true,
    attachments: uploadedAttachments,
  });
}

// ── DELETE /api/kas-rt/transactions/[id]/attachments ─────────────────────────
//
// Remove attachment(s) from an existing transaction (hard delete from storage)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireKasRtRole();
  if (auth instanceof NextResponse) return auth;

  const { id: transactionId } = await params;
  if (!transactionId) {
    return NextResponse.json(
      { message: "ID transaksi tidak valid." },
      { status: 400 },
    );
  }

  // Get attachment IDs to delete from query params or body
  const searchParams = request.nextUrl.searchParams;
  const attachmentIdsParam = searchParams.get("attachmentIds");
  
  let attachmentIds: string[] = [];
  
  if (attachmentIdsParam) {
    attachmentIds = attachmentIdsParam.split(",");
  } else {
    try {
      const body = await request.json();
      if (body.attachmentIds && Array.isArray(body.attachmentIds)) {
        attachmentIds = body.attachmentIds;
      }
    } catch {
      // Ignore JSON parse error
    }
  }

  if (attachmentIds.length === 0) {
    return NextResponse.json(
      { message: "ID lampiran tidak valid." },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Fetch attachment records to get storage paths
  const { data: attachments, error: fetchError } = await supabase
    .from("kas_rt_attachments")
    .select("id, storage_path, file_name")
    .in("id", attachmentIds)
    .eq("transaction_id", transactionId);

  if (fetchError) {
    return NextResponse.json(
      { message: "Gagal memverifikasi lampiran." },
      { status: 500 },
    );
  }

  if (!attachments || attachments.length === 0) {
    return NextResponse.json(
      { message: "Lampiran tidak ditemukan." },
      { status: 404 },
    );
  }

  const bucketId =
    process.env.SUPABASE_BUCKET_KAS_RT ?? "kas-rt-attachments";

  // Delete files from storage
  const storagePaths = attachments.map((att) => att.storage_path);
  const { error: storageError } = await supabase.storage
    .from(bucketId)
    .remove(storagePaths);

  if (storageError) {
    // Continue to delete database records even if storage deletion fails
  }

  // Delete attachment records from database
  const { error: deleteError } = await supabase
    .from("kas_rt_attachments")
    .delete()
    .in("id", attachmentIds);

  if (deleteError) {
    return NextResponse.json(
      { message: "Gagal menghapus lampiran." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    deletedCount: attachments.length,
    deletedFiles: attachments.map((att) => att.file_name),
  });
}
