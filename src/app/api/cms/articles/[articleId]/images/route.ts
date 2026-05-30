import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { deleteObjects, generateObjectKey, serverUpload, getPublicUrl } from "@/lib/r2";
import { requireAdmin } from "@/lib/auth/admin-guard";

type RouteContext = { params: Promise<{ articleId: string }> };

/**
 * GET /api/cms/articles/[articleId]/images
 *
 * Fetch all images for an article
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { articleId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data: images, error } = await supabase
      .from("article_images")
      .select("*")
      .eq("article_id", articleId)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch images" },
        { status: 500 },
      );
    }

    return NextResponse.json({ images: images || [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/cms/articles/[articleId]/images
 *
 * Create a new article image or replace an existing one
 * Body (create new): { objectKey, url, mimeType, altText? }
 * Body (replace): { imageId, newFilename, newContentType }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { articleId } = await context.params;
  const session = await getSessionFromCookie();

  if (!session || !session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { imageId } = body;

  // If imageId is provided, it's a replace operation
  if (imageId) {
    return handleImageReplace(request, articleId, body);
  }

  // Otherwise, it's a create new image operation
  return handleImageCreate(request, articleId, body);
}

async function handleImageCreate(
  request: NextRequest,
  articleId: string,
  body: { objectKey: string; url: string; mimeType: string; altText?: string; sizeBytes?: number; width?: number; height?: number },
) {
  const { objectKey, url, mimeType, altText } = body;

  if (!objectKey || !url || !mimeType) {
    return NextResponse.json(
      { error: "Missing required fields: objectKey, url, mimeType" },
      { status: 400 },
    );
  }

  const supabase = createServerClient();

  // Get current max sort_order
  const { data: existingImages } = await supabase
    .from("article_images")
    .select("sort_order")
    .eq("article_id", articleId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const newSortOrder = (existingImages?.[0]?.sort_order ?? -1) + 1;

  // Insert new image record
  const { data: newImage, error: insertError } = await supabase
    .from("article_images")
    .insert({
      article_id: articleId,
      object_key: objectKey,
      url: url,
      mime_type: mimeType,
      alt_text: altText || null,
      size_bytes: body.sizeBytes || 0,
      width: body.width || null,
      height: body.height || null,
      sort_order: newSortOrder,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to create image record" },
      { status: 500 },
    );
  }

  return NextResponse.json({ image: newImage }, { status: 201 });
}

async function handleImageReplace(
  request: NextRequest,
  articleId: string,
  body: { imageId: string; newFilename: string; newContentType: string },
) {
  const { imageId, newFilename, newContentType } = body;
  try {
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!imageId || !newFilename || !newContentType) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: imageId, newFilename, newContentType",
        },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // 1. Fetch existing image
    const { data: existingImage, error: fetchError } = await supabase
      .from("article_images")
      .select("*")
      .eq("id", imageId)
      .eq("article_id", articleId)
      .single();

    if (fetchError || !existingImage) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // 2. Generate new object key
    const newObjectKey = generateObjectKey(articleId, newFilename);

    // 3. Return new object key and public URL template
    // The caller must upload the file and update the DB record
    const publicUrl = getPublicUrl(newObjectKey);

    return NextResponse.json({
      objectKey: newObjectKey,
      publicUrl,
      oldObjectKey: existingImage.object_key,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/cms/articles/[articleId]/images
 *
 * Delete all images for an article (bulk cleanup)
 * This is typically called when an article is deleted
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { articleId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // 1. Fetch all image object keys before deletion
    const { data: images, error: fetchError } = await supabase
      .from("article_images")
      .select("object_key")
      .eq("article_id", articleId);

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch images" },
        { status: 500 },
      );
    }

    const objectKeys = images?.map((img) => img.object_key) || [];

    // 2. Delete from R2 (if there are images)
    let r2DeleteError: Error | null = null;
    if (objectKeys.length > 0) {
      try {
        await deleteObjects(objectKeys);
      } catch (error) {
        r2DeleteError =
          error instanceof Error ? error : new Error("R2 delete failed");
        // Continue with DB deletion even if R2 fails
      }
    }

    // 3. Delete from database
    const { error: deleteError } = await supabase
      .from("article_images")
      .delete()
      .eq("article_id", articleId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete images from database" },
        { status: 500 },
      );
    }

    // 4. Return success with any R2 errors for monitoring
    return NextResponse.json({
      success: true,
      deletedCount: objectKeys.length,
      r2Error: r2DeleteError?.message,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/cms/articles/[articleId]/images/reorder
 *
 * Reorder images by updating sort_order
 * Body: { imageIds: string[] }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { articleId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageIds } = body;

    if (!Array.isArray(imageIds)) {
      return NextResponse.json(
        { error: "imageIds must be an array" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Update sort_order for each image
    const updates = imageIds.map((id: string, index: number) =>
      supabase
        .from("article_images")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("article_id", articleId),
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
