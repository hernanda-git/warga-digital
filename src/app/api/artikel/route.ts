import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/artikel
 *
 * Public endpoint to fetch published articles
 * No authentication required - only returns published, non-deleted articles
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const offset = (page - 1) * limit;

    const supabase = createServerClient();

    // Fetch published articles with author info and featured image
    const { data: articles, error, count } = await supabase
      .from("articles")
      .select(
        `
        id,
        title,
        slug,
        excerpt,
        featured_image_url,
        published_at,
        created_at,
        author_id,
        users!articles_author_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `,
        { count: "exact" },
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching published articles:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: "Failed to fetch articles", details: error.message },
        { status: 500 },
      );
    }

    // Transform data
    const transformedArticles = articles?.map((article: any) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      featured_image_url: article.featured_image_url,
      published_at: article.published_at,
      created_at: article.created_at,
      author: {
        id: article.users?.id ?? article.author_id,
        name: article.users?.full_name ?? "Anonim",
        avatar_url: article.users?.avatar_url,
      },
    }));

    return NextResponse.json({
      articles: transformedArticles || [],
      meta: {
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (error) {
    console.error("Error in GET /api/artikel:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
