import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  generateSignedUploadUrl,
  generateObjectKey,
  isAllowedContentType,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/r2";
import { rateLimitResponse, generalApiLimiter } from "@/lib/rate-limiter";
import {
  validateArticleImage,
  validateFilename,
} from "@/lib/validation/image-validation";

/**
 * POST /api/cms/articles/upload-url
 *
 * Generates a pre-signed URL for direct browser-to-R2 upload.
 *
 * Request body:
 * {
 *   articleId: string,
 *   filename: string,
 *   contentType: string,
 *   fileSize?: number
 * }
 *
 * Response:
 * {
 *   objectKey: string,
 *   uploadUrl: string,
 *   publicUrl: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 20 requests per minute per user
    const rateLimitKey = `upload-url:${request.headers.get("x-forwarded-for") || "unknown"}`;
    const rateResult = generalApiLimiter.consume(rateLimitKey);
    if (!rateResult.allowed) {
      return rateLimitResponse(rateResult);
    }

    // Parse request body
    const body = await request.json();
    const { articleId, filename, contentType, fileSize } = body;

    // Validate required fields
    if (!articleId || !filename || !contentType) {
      return NextResponse.json(
        { error: "Missing required fields: articleId, filename, contentType" },
        { status: 400 },
      );
    }

    // Validate filename
    const filenameValidation = validateFilename(filename);
    if (!filenameValidation.valid) {
      return NextResponse.json(
        { error: filenameValidation.error },
        { status: 400 },
      );
    }

    // Validate content type
    if (!isAllowedContentType(contentType)) {
      return NextResponse.json(
        {
          error: `Invalid content type: ${contentType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate file size if provided
    if (fileSize !== undefined) {
      if (
        typeof fileSize !== "number" ||
        fileSize <= 0 ||
        fileSize > MAX_FILE_SIZE
      ) {
        return NextResponse.json(
          {
            error: `File size must be between 1 and ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          },
          { status: 400 },
        );
      }
    }

    // Additional server-side validation (if file object is available)
    // This will be enforced when the actual file is uploaded via the signed URL
    // The client should perform this validation before requesting the upload URL

    // Verify authentication
    const session = await getSessionFromCookie();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify authorization: user can edit the article
    const supabase = createServerClient();

    // Check if article exists and user has permission to edit
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, author_id, deleted_at")
      .eq("id", articleId)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Check if article is soft-deleted
    if (article.deleted_at !== null) {
      return NextResponse.json(
        { error: "Article has been deleted" },
        { status: 404 },
      );
    }

    // Check if user is the author (or add admin check if needed)
    if (article.author_id !== session.userId) {
      // TODO: Add admin role check here if admins should be able to edit any article
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to edit this article" },
        { status: 403 },
      );
    }

    // Generate object key
    const objectKey = generateObjectKey(articleId, filename);

    // Generate signed upload URL
    const signedUrl = await generateSignedUploadUrl(
      objectKey,
      contentType,
      300, // 5 minutes expiry
    );

    // Return the signed URL and metadata
    return NextResponse.json({
      objectKey: signedUrl.objectKey,
      uploadUrl: signedUrl.uploadUrl,
      publicUrl: signedUrl.publicUrl,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/cms/articles/upload-url
 *
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
