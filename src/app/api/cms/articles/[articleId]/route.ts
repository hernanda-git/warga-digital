import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ articleId: string }> };

/**
 * Generate a URL-safe slug from text
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove non-word chars except space/hyphen
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

/**
 * GET /api/cms/articles/[articleId]
 *
 * Fetch a single article with its images
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { articleId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data: article, error } = await supabase
      .from("articles")
      .select("*, article_images(*)")
      .eq("id", articleId)
      .is("deleted_at", null)
      .single();

    if (error || !article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error("Error in GET /api/cms/articles/[articleId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/cms/articles/[articleId]
 *
 * Update an article
 * Body: { title?, slug?, excerpt?, content?, status?, featured_image_url? }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { articleId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug, excerpt, content, status, featured_image_url } = body;

    const supabase = createServerClient();

    // Verify article exists and user can edit
    const { data: existing, error: fetchError } = await supabase
      .from("articles")
      .select("id, author_id, status, deleted_at")
      .eq("id", articleId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (existing.deleted_at !== null) {
      return NextResponse.json(
        { error: "Article has been deleted" },
        { status: 404 },
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title.trim();
    if (slug !== undefined) updateData.slug = slug;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (content !== undefined) updateData.content = content;
    if (featured_image_url !== undefined)
      updateData.featured_image_url = featured_image_url;

    if (status !== undefined) {
      updateData.status = status;
      // Set published_at when publishing for the first time
      if (status === "published" && existing.status !== "published") {
        updateData.published_at = new Date().toISOString();
      }
      // Clear published_at when unpublishing
      if (status !== "published" && existing.status === "published") {
        updateData.published_at = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const { data: article, error } = await supabase
      .from("articles")
      .update(updateData)
      .eq("id", articleId)
      .select()
      .single();

    if (error) {
      console.error("Error updating article:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An article with this slug already exists" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Failed to update article" },
        { status: 500 },
      );
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error("Error in PUT /api/cms/articles/[articleId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/cms/articles/[articleId]
 *
 * Update an article with autosave support
 * Body: {
 *   title?, slug?, excerpt?, content?, status?, featured_image_url?,
 *   autosave?: boolean   // if true, don't update published_at
 * }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { articleId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      slug,
      excerpt,
      content,
      status,
      featured_image_url,
      autosave,
    } = body;

    const supabase = createServerClient();

    // Verify article exists and user can edit
    const { data: existing, error: fetchError } = await supabase
      .from("articles")
      .select("id, author_id, status, deleted_at")
      .eq("id", articleId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (existing.deleted_at !== null) {
      return NextResponse.json(
        { error: "Article has been deleted" },
        { status: 404 },
      );
    }

    // Auto-slug: generate from title if slug not provided
    let finalSlug = slug;
    if (title !== undefined && !slug && title.trim()) {
      finalSlug = generateSlug(title.trim());
    }

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title.trim();
    if (finalSlug !== undefined) updateData.slug = finalSlug;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (content !== undefined) updateData.content = content;
    if (featured_image_url !== undefined)
      updateData.featured_image_url = featured_image_url;

    if (status !== undefined) {
      updateData.status = status;
      // Only update published_at on explicit saves, not autosaves
      if (!autosave) {
        if (status === "published" && existing.status !== "published") {
          updateData.published_at = new Date().toISOString();
        }
        if (status !== "published" && existing.status === "published") {
          updateData.published_at = null;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const { data: article, error } = await supabase
      .from("articles")
      .update(updateData)
      .eq("id", articleId)
      .select()
      .single();

    if (error) {
      console.error("Error updating article:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "An article with this slug already exists" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Failed to update article" },
        { status: 500 },
      );
    }

    return NextResponse.json({ article, autosaved: !!autosave });
  } catch (error) {
    console.error("Error in PATCH /api/cms/articles/[articleId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/cms/articles/[articleId]
 *
 * Soft-delete an article and clean up its images
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { articleId } = await context.params;
    const session = await getSessionFromCookie();

    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // Verify article exists
    const { data: existing, error: fetchError } = await supabase
      .from("articles")
      .select("id, deleted_at")
      .eq("id", articleId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    if (existing.deleted_at !== null) {
      return NextResponse.json(
        { error: "Article already deleted" },
        { status: 400 },
      );
    }

    // Soft-delete the article
    const { error: deleteError } = await supabase
      .from("articles")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: session.userId,
      })
      .eq("id", articleId);

    if (deleteError) {
      console.error("Error soft-deleting article:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete article" },
        { status: 500 },
      );
    }

    // Clean up images via the existing endpoint (best-effort)
    try {
      await fetch(`${request.url}/images`, {
        method: "DELETE",
        headers: { cookie: request.headers.get("cookie") || "" },
      });
    } catch (cleanupError) {
      console.error("Image cleanup failed (non-blocking):", cleanupError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/cms/articles/[articleId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
