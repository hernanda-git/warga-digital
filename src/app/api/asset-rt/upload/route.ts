import { NextRequest } from "next/server";
import crypto from "crypto";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
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
} from "@/lib/api-response";

function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

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
 * Generate a signed R2 upload URL for direct browser upload.
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

    const body = await request.json();
    const { filename, contentType, size } = body;

    if (!filename || !contentType) {
      return badRequestResponse("Filename and content type are required.");
    }

    if (!isAllowedContentType(contentType)) {
      return badRequestResponse(
        `Tipe file tidak diizinkan: ${contentType}. Hanya JPEG, PNG, WebP, dan GIF yang diperbolehkan.`,
      );
    }

    if (size && !isValidFileSize(size)) {
      return badRequestResponse(
        `Ukuran file terlalu besar: ${(size / 1024 / 1024).toFixed(2)}MB. Maksimal 10MB.`,
      );
    }

    const objectKey = generateObjectKey(filename);
    const { uploadUrl, publicUrl } = await generateSignedUploadUrl(
      objectKey,
      contentType,
    );

    return successResponse({
      uploadUrl,
      publicUrl,
      objectKey,
    });
  } catch (error) {
    console.error("[asset-rt/upload] error:", error);
    return errorResponse("Terjadi kesalahan server", 500);
  }
}
