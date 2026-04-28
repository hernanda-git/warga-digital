import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { ArticleImage } from "@/types/article-image";

const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

function getAvatarUrl(avatarPath: string | null): string | null {
  if (!avatarPath || !R2_PUBLIC_BASE_URL) return null;
  return `${R2_PUBLIC_BASE_URL}/${avatarPath}`;
}

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * GET /api/artikel/[slug]
 *
 * Public endpoint to fetch a single published article by slug
 * No authentication required - only returns published, non-deleted articles
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { slug } = await context.params;

    const supabase = createServerClient();

    // Fetch article with author info and gallery images
    const { data: article, error } = await supabase
      .from("articles")
      .select(
        `
        *,
        users!articles_author_id_fkey (
          id,
          full_name,
          avatar_path
        ),
        article_images (
          id,
          url,
          alt_text,
          width,
          height,
          sort_order
        )
      `,
      )
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();

    if (error || !article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 },
      );
    }

    // Transform data
    const transformedArticle = {
      id: article.id,
      title: article.title,
      slug: article.slug,
      content: article.content,
      excerpt: article.excerpt,
      featured_image_url: article.featured_image_url,
      published_at: article.published_at,
      created_at: article.created_at,
      updated_at: article.updated_at,
      author: {
        id: article.users?.id ?? article.author_id,
        name: article.users?.full_name ?? "Anonim",
        avatar_url: getAvatarUrl(article.users?.avatar_path),
      },
      images: article.article_images?.sort(
        (a: ArticleImage, b: ArticleImage) => (a.sort_order || 0) - (b.sort_order || 0),
      ),
    };

    return NextResponse.json({ article: transformedArticle });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
