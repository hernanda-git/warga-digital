import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import crypto from "crypto";
import {
  generateSignedUploadUrl,
  isAllowedContentType,
  isValidFileSize,
} from "@/lib/r2";
import {
  successResponse,
  errorResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "@/lib/api-response";

/**
 * POST /api/jualan/[id]/upload
 * Generate signed R2 upload URLs for direct browser upload
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const supabase = createServerClient();
    const resolvedParams = await params;

    const { data: goods } = await supabase
      .from("jualan_goods")
      .select("owner_user_id, tenant_id")
      .eq("id", resolvedParams.id)
      .single();

    if (!goods) {
      return notFoundResponse("Barang tidak ditemukan");
    }

    if (goods.owner_user_id !== session.userId) {
      return forbiddenResponse("Anda bukan pemilik barang ini");
    }

    const body = await request.json();
    const { files } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return badRequestResponse("Tidak ada file yang diunggah");
    }

    if (files.length > 5) {
      return badRequestResponse("Maksimal 5 gambar per barang");
    }

    const uploadUrls = [];

    for (const file of files) {
      const { filename, contentType, size } = file;

      if (!isAllowedContentType(contentType)) {
        return badRequestResponse(
          `Tipe file tidak diizinkan: ${contentType}. Hanya JPEG, PNG, WebP, dan GIF yang diperbolehkan.`,
        );
      }

      if (!isValidFileSize(size)) {
        return badRequestResponse(
          `Ukuran file terlalu besar: ${(size / 1024 / 1024).toFixed(2)}MB. Maksimal 10MB.`,
        );
      }

      const objectKey = generateObjectKey(resolvedParams.id, filename);

      const { uploadUrl, publicUrl } = await generateSignedUploadUrl(
        objectKey,
        contentType,
      );

      uploadUrls.push({
        filename,
        uploadUrl,
        publicUrl,
        objectKey,
      });
    }

    return successResponse({
      uploadUrls,
      message: `Generated ${uploadUrls.length} signed upload URL(s)`,
    });
  } catch (error) {
    return errorResponse("Terjadi kesalahan server", 500);
  }
}

/**
 * POST /api/jualan/[id]/upload/confirm
 * Confirm upload and save media records to database
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const supabase = createServerClient();
    const resolvedParams = await params;

    const { data: goods } = await supabase
      .from("jualan_goods")
      .select("owner_user_id")
      .eq("id", resolvedParams.id)
      .single();

    if (!goods) {
      return notFoundResponse("Barang tidak ditemukan");
    }

    if (goods.owner_user_id !== session.userId) {
      return forbiddenResponse("Anda bukan pemilik barang ini");
    }

    const body = await request.json();
    const { media } = body;

    if (!media || !Array.isArray(media) || media.length === 0) {
      return badRequestResponse("Tidak ada media yang dikonfirmasi");
    }

    const mediaRecords = media.map((m, index) => ({
      item_id: resolvedParams.id,
      url: m.publicUrl,
      alt_text: m.altText || m.filename,
      sort_order: m.sortOrder ?? index,
      is_primary: m.isPrimary ?? index === 0,
    }));

    const { error } = await supabase
      .from("jualan_item_media")
      .insert(mediaRecords);

    if (error) {
      return errorResponse("Gagal menyimpan data media", 500);
    }

    return successResponse({
      message: "Media berhasil disimpan",
      count: mediaRecords.length,
    });
  } catch (error) {
    return errorResponse("Terjadi kesalahan server", 500);
  }
}

function generateObjectKey(itemId: string, filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const uniqueId = crypto.randomUUID().replace(/-/g, "");
  const sanitized = sanitizeFilename(filename);

  return `jualan/${itemId}/${year}/${month}/${day}/${uniqueId}-${sanitized}`;
}

function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
