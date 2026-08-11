import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  serverUpload,
  getPublicUrl,
  deleteObjects,
  sanitizeFilename,
  extractObjectKey,
  MAX_IMAGE_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/r2";
import { validateImageFile } from "@/lib/validation/image-validation";
import crypto from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { id } = await params;

  try {
    const { data: service, error: fetchError } = await supabase
      .from("jasa_services")
      .select("id, owner_user_id")
      .eq("id", id)
      .single();

    if (fetchError || !service) {
      return NextResponse.json(
        { success: false, error: "Layanan jasa tidak ditemukan" },
        { status: 404 },
      );
    }

    if (service.owner_user_id !== session.userId) {
      return NextResponse.json(
        { success: false, error: "Tidak memiliki izin untuk upload" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const isPrimaryParam = formData.get("is_primary") as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tidak ada file yang diupload" },
        { status: 400 },
      );
    }

    const existingMediaCount = await getMediaCount(supabase, id);
    const maxImages = 5;
    const canUploadCount = maxImages - existingMediaCount;

    if (canUploadCount <= 0) {
      return NextResponse.json(
        { success: false, error: `Maksimum ${maxImages} gambar per layanan` },
        { status: 400 },
      );
    }

    if (files.length > canUploadCount) {
      return NextResponse.json(
        {
          success: false,
          error: `Hanya dapat upload ${canUploadCount} gambar lagi`,
        },
        { status: 400 },
      );
    }

    // Validate all files first
    for (const file of files) {
      const validation = await validateImageFile(file, MAX_IMAGE_FILE_SIZE);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: `File "${file.name}": ${validation.error}` },
          { status: 400 },
        );
      }

      if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
        return NextResponse.json(
          {
            success: false,
            error: `Tipe file ${file.name} tidak didukung. Hanya JPEG, PNG, WebP, GIF, HEIC, AVIF.`,
          },
          { status: 400 },
        );
      }
    }

    const needsPrimary = !(await hasPrimaryImage(supabase, id));
    const uploadedKeys: string[] = [];
    const uploadedMedia: Array<{
      id: string;
      url: string;
      is_primary: boolean;
    }> = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isPrimary = needsPrimary && i === 0 && isPrimaryParam !== "false";

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const uniqueId = crypto.randomUUID();
        const sanitized = sanitizeFilename(file.name);
        const objectKey = `jasa-images/${id}/${year}/${month}/${day}/${uniqueId}-${sanitized}`;

        const buffer = new Uint8Array(await file.arrayBuffer());
        await serverUpload(buffer, objectKey, file.type);
        uploadedKeys.push(objectKey);

        const publicUrl = getPublicUrl(objectKey);

        const { data: mediaRecord, error: insertError } = await supabase
          .from("jasa_service_media")
          .insert({
            service_id: id,
            url: publicUrl,
            alt_text: `Gambar layanan ${i + 1}`,
            sort_order: existingMediaCount + i,
            is_primary: isPrimary,
          })
          .select("id, url, is_primary")
          .single();

        if (insertError) {
          throw new Error("Gagal menyimpan data gambar");
        }

        uploadedMedia.push(mediaRecord);
      }
    } catch (err) {
      if (uploadedKeys.length > 0) {
        await deleteObjects(uploadedKeys);
      }
      return NextResponse.json(
        { success: false, error: "Gagal upload gambar" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: uploadedMedia,
      message: `${files.length} gambar berhasil diupload`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Gagal upload gambar" },
      { status: 500 },
    );
  }
}

async function hasPrimaryImage(
  supabase: ReturnType<typeof createServerClient>,
  serviceId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("jasa_service_media")
    .select("id")
    .eq("service_id", serviceId)
    .eq("is_primary", true)
    .limit(1);

  return (data && data.length > 0) || false;
}

async function getMediaCount(
  supabase: ReturnType<typeof createServerClient>,
  serviceId: string,
): Promise<number> {
  const { count } = await supabase
    .from("jasa_service_media")
    .select("*", { count: "exact" })
    .eq("service_id", serviceId);

  return count || 0;
}
