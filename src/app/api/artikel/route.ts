import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const AVATARS_BUCKET = process.env.SUPABASE_BUCKET_AVATARS || "avatars";

/**
 * Construct full avatar URL from avatar_path
 */
function getAvatarUrl(avatarPath: string | null): string | null {
  if (!avatarPath || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${AVATARS_BUCKET}/${avatarPath}`;
}

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
          avatar_path,
          user_houses!user_houses_user_id_fkey (
            house_id,
            is_primary,
            houses!user_houses_house_id_fkey (
              blok_rumah
            )
          )
        )
      `,
        { count: "exact" },
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch articles", details: error.message },
        { status: 500 },
      );
    }

    // Transform data
    const transformedArticles = articles?.map((article: any) => {
      // Get primary house's blok_rumah from user_houses
      const userHouses = article.users?.user_houses || [];
      const primaryHouse = userHouses.find((uh: any) => uh.is_primary) || userHouses[0];
      const blokRumah = primaryHouse?.houses?.blok_rumah || null;

      return {
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
          avatar_url: getAvatarUrl(article.users?.avatar_path),
          blok_rumah: blokRumah,
        },
      };
    });

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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
