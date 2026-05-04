import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { ArtikelDetailClient } from "./ArtikelDetailClient";
import type { ArticleImage } from "@/types/article-image";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string;
  updated_at: string;
  author: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  images: Array<{
    id: string;
    url: string;
    alt_text: string | null;
    width: number | null;
    height: number | null;
    sort_order: number;
  }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServerClient();

  const { data: article } = await supabase
    .from("articles")
    .select("title, excerpt, featured_image_url")
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .single();

  if (!article) return {};

  const images = article.featured_image_url
    ? [{ url: article.featured_image_url, width: 1200, height: 630 }]
    : [{ url: "/og-image.png", width: 1200, height: 630 }];

  return {
    title: `${article.title} - Warga Digital`,
    description: article.excerpt || article.title,
    openGraph: {
      title: article.title,
      description: article.excerpt || article.title,
      type: "article",
      url: `https://warga-digital.com/artikel/${slug}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt || article.title,
      images: images.map((i) => i.url),
    },
    alternates: {
      canonical: `https://warga-digital.com/artikel/${slug}`,
    },
  };
}

export default async function ArtikelDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerClient();

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
    notFound();
  }

  const transformedArticle: Article = {
    id: article.id,
    title: article.title,
    slug: article.slug,
    content: article.content,
    excerpt: article.excerpt,
    featured_image_url: article.featured_image_url,
    published_at: article.published_at,
    updated_at: article.updated_at,
    author: {
      id: article.users?.id ?? article.author_id,
      name: article.users?.full_name ?? "Anonim",
      avatar_url: article.users?.avatar_path ?? null,
    },
    images: (article.article_images ?? []).sort(
      (a: ArticleImage, b: ArticleImage) => (a.sort_order || 0) - (b.sort_order || 0),
    ),
  };

  return <ArtikelDetailClient article={transformedArticle} />;
}
