import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import {
  generateSignedUploadUrl,
  sanitizeFilename,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/r2";

/**
 * POST /api/admin/settings/upload-logo
 *
 * Generates a signed upload URL for uploading a sidebar logo to R2.
 * Body: { filename: string, contentType: string }
 * Requires admin role.
 *
 * Returns: { objectKey, uploadUrl, publicUrl }
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    filename?: string;
    contentType?: string;
  };

  const filename = body.filename?.trim();
  if (!filename) {
    return NextResponse.json(
      { error: "Nama file wajib diisi." },
      { status: 400 },
    );
  }

  const contentType = body.contentType?.trim();
  if (!contentType) {
    return NextResponse.json(
      { error: "Content type wajib diisi." },
      { status: 400 },
    );
  }

  // Validate content type against allowed image types
  if (!ALLOWED_IMAGE_TYPES.includes(contentType as typeof ALLOWED_IMAGE_TYPES[number])) {
    return NextResponse.json(
      {
        error: `Tipe file tidak diizinkan. Tipe yang diizinkan: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Generate a unique object key
  const uuid = crypto.randomUUID();
  const sanitized = sanitizeFilename(filename);
  const objectKey = `branding/sidebar-logo-${uuid}-${sanitized}`;

  try {
    const result = await generateSignedUploadUrl(objectKey, contentType as typeof ALLOWED_IMAGE_TYPES[number]);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal membuat upload URL.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
