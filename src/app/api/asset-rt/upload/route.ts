import { NextRequest } from "next/server";
import crypto from "crypto";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import {
  serverUpload,
  getPublicUrl,
  sanitizeFilename,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/r2";
import { validateImageFile } from "@/lib/validation/image-validation";
import {
  successResponse,
  errorResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/api-response";

const MAX_ASSET_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

function generateObjectKey(filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const uniqueId = crypto.randomUUID().replace(/-/g, "");
  const sanitized = sanitizeFilename(filename);
  return `asset-rt/${year}/${month}/${day}/${uniqueId}-${sanitized}`;
}

/**
 * POST /api/asset-rt/upload
 *
 * Server-side asset image upload. Accepts multipart/form-data with:
 *   - file: a single image file (JPEG, PNG, WebP, GIF, HEIC, AVIF)
 *
 * This performs the R2 upload on the server (using the service-role R2
 * credentials) instead of returning a presigned URL for the browser to PUT
 * directly. That avoids the production CORS / presigned-checksum 403 failures
 * that the browser→R2 PUT path was hitting (see jualan fix 7536ea7).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const supabase = createServerClient();

    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return forbiddenResponse(
        "Hanya admin RT yang dapat mengunggah media aset.",
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData
      .getAll("file")
      .filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return badRequestResponse("Tidak ada file yang diunggah.");
    }

    if (files.length > 1) {
      return badRequestResponse("Hanya satu gambar yang diperbolehkan.");
    }

    const file = files[0];

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
      return badRequestResponse(
        `Tipe file tidak diizinkan: ${file.type}. Hanya JPEG, PNG, WebP, GIF, HEIC, dan AVIF yang diperbolehkan.`,
      );
    }

    if (file.size > MAX_ASSET_IMAGE_SIZE) {
      return badRequestResponse(
        `Ukuran file terlalu besar: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maksimal 10MB.`,
      );
    }

    const validation = await validateImageFile(file, MAX_ASSET_IMAGE_SIZE);
    if (!validation.valid) {
      return badRequestResponse(
        `File "${file.name}": ${validation.error ?? "Validasi gagal"}`,
      );
    }

    const objectKey = generateObjectKey(file.name);
    const buffer = new Uint8Array(await file.arrayBuffer());
    await serverUpload(buffer, objectKey, file.type);

    const publicUrl = getPublicUrl(objectKey);

    return successResponse({
      url: publicUrl,
      objectKey,
    });
  } catch (error) {
    console.error("[asset-rt/upload] error:", error);
    return errorResponse("Terjadi kesalahan server", 500);
  }
}
