import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import crypto from "crypto";
import {
  serverUpload,
  getPublicUrl,
  getPublicUrlSafe,
  isAllowedContentType,
  isValidFileSize,
  sanitizeFilename,
  extractObjectKey,
} from "@/lib/r2";
import { validateImageFile } from "@/lib/validation/image-validation";
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
 *
 * Upload images for a jualan goods listing (server-side upload).
 * Accepts multipart/form-data with:
 *   - files: one or more image files (max 5)
 *
 * This uses server-side upload to avoid CORS issues with direct browser-to-R2
 * uploads, and ensures proper error handling throughout the flow.
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

    // Verify the goods item exists and belongs to the user
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

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return badRequestResponse("Tidak ada file yang diunggah");
    }

    if (files.length > 5) {
      return badRequestResponse("Maksimal 5 gambar per barang");
    }

    // Check existing media count to determine sort order and primary
    const { count: existingCount } = await supabase
      .from("jualan_item_media")
      .select("*", { count: "exact", head: true })
      .eq("item_id", resolvedParams.id);

    const existingMediaCount = existingCount ?? 0;
    const needsPrimary = existingMediaCount === 0;

    // Process each file: validate, upload to R2, and save media record
    // Validate all files first (type, size, magic bytes)
    for (const file of files) {
      const validation = await validateImageFile(file);
      if (!validation.valid) {
        return badRequestResponse(
          `File "${file.name}": ${validation.error}`,
        );
      }
    }

    const uploadedMedia: Array<{
      id: string;
      url: string;
      alt_text: string;
      sort_order: number;
      is_primary: boolean;
    }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Generate object key
        const objectKey = generateObjectKey(resolvedParams.id, file.name);

        // Upload to R2 server-side (no CORS issues, no UNSIGNED-PAYLOAD concerns)
        const buffer = new Uint8Array(await file.arrayBuffer());
        await serverUpload(buffer, objectKey, file.type);

        const publicUrl = getPublicUrl(objectKey);

        const isPrimary = needsPrimary && i === 0;

        // Save media record to database
        const { data: mediaRecord, error: insertError } = await supabase
          .from("jualan_item_media")
          .insert({
            item_id: resolvedParams.id,
            url: publicUrl,
            alt_text: file.name,
            sort_order: existingMediaCount + i,
            is_primary: isPrimary,
          })
          .select("id, url, alt_text, sort_order, is_primary")
          .single();

        if (insertError) {
          // Roll back R2 upload
          await deleteR2Object(objectKey);
          await cleanupUploadedMedia(
            supabase,
            resolvedParams.id,
            uploadedMedia,
          );
          return errorResponse("Gagal menyimpan data gambar", 500);
        }

        uploadedMedia.push(mediaRecord);
      } catch (uploadErr) {
        // Clean up already-uploaded files on failure
        await cleanupUploadedMedia(supabase, resolvedParams.id, uploadedMedia);
        return errorResponse("Gagal mengunggah gambar", 500);
      }
    }

    return successResponse({
      media: uploadedMedia,
      message: `${files.length} gambar berhasil diunggah`,
    });
  } catch (error) {
    return errorResponse("Terjadi kesalahan server", 500);
  }
}

/**
 * Clean up media records and R2 objects if upload fails midway
 */
async function cleanupUploadedMedia(
  supabase: ReturnType<typeof createServerClient>,
  itemId: string,
  uploadedMedia: Array<{ id: string; url: string }>,
): Promise<void> {
  if (uploadedMedia.length === 0) return;

  // Delete media records
  const mediaIds = uploadedMedia.map((m) => m.id);
  await supabase.from("jualan_item_media").delete().in("id", mediaIds);

  // Delete R2 objects
  for (const media of uploadedMedia) {
    const key = extractObjectKey(media.url);
    if (key) {
      try {
        await deleteR2Object(key);
      } catch {
        // Best-effort cleanup
      }
    }
  }
}

/**
 * Delete an object from R2 by its key
 */
async function deleteR2Object(objectKey: string): Promise<void> {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const { getR2Client, getBucketName } = await import("@/lib/r2");

  const client = getR2Client();
  const bucketName = getBucketName();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    }),
  );
}

/**
 * Generate a deterministic object key for jualan images
 * Format: jualan/{itemId}/{yyyy}/{MM}/{dd}/{uuid}-{sanitized-filename}
 */
function generateObjectKey(itemId: string, filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const uniqueId = crypto.randomUUID().replace(/-/g, "");
  const sanitized = sanitizeFilename(filename);

  return `jualan/${itemId}/${year}/${month}/${day}/${uniqueId}-${sanitized}`;
}
