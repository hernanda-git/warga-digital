/**
 * useLandingSections Hook
 *
 * Batches landing page section fetches (Articles, Jualan, Jasa)
 * in a single Promise.allSettled to guarantee parallel execution
 * and reduce React effect overhead.
 */

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { LANDING_API_ENDPOINTS } from "@/config/landing";
import type { ResidentPostItem } from "@/components/landing/ResidentPostsSection";
import type { JualanGoodsWithMedia } from "@/types/jualan";
import type { JasaServiceWithMedia } from "@/types/database";

interface ArticleApiItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string;
  created_at: string;
  author: {
    id: string;
    name: string;
    avatar_url: string | null;
    blok_rumah: string | null;
  };
}

function transformArticleToPost(article: ArticleApiItem): ResidentPostItem {
  return {
    id: article.slug,
    title: article.title,
    excerpt: article.excerpt ?? undefined,
    imageUrl: article.featured_image_url ?? null,
    author: article.author?.name ?? "Anonim",
    authorAvatar: article.author?.avatar_url ?? null,
    authorBlock: article.author?.blok_rumah ?? null,
    createdAt: article.created_at,
  };
}

export interface UseLandingSectionsReturn {
  articles: ResidentPostItem[];
  isArticlesLoaded: boolean;
  hasArticlesContent: boolean;
  articlesError: string | null;

  jualanGoods: JualanGoodsWithMedia[];
  isJualanLoaded: boolean;
  hasJualanContent: boolean;

  jasaServices: JasaServiceWithMedia[];
  isJasaServicesLoaded: boolean;
  hasDirectJasaContent: boolean;

  refresh: () => Promise<void>;
}

export function useLandingSections(): UseLandingSectionsReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [articles, setArticles] = useState<ResidentPostItem[]>([]);
  const [isArticlesLoaded, setIsArticlesLoaded] = useState(false);
  const [articlesError, setArticlesError] = useState<string | null>(null);

  const [jualanGoods, setJualanGoods] = useState<JualanGoodsWithMedia[]>([]);
  const [isJualanLoaded, setIsJualanLoaded] = useState(false);

  const [jasaServices, setJasaServices] = useState<JasaServiceWithMedia[]>([]);
  const [isJasaServicesLoaded, setIsJasaServicesLoaded] = useState(false);

  const loadAll = useCallback(async (getCancelled?: () => boolean) => {
    setIsArticlesLoaded(false);
    setArticlesError(null);
    setIsJualanLoaded(false);
    setIsJasaServicesLoaded(false);

    const [articlesRes, jualanRes, jasaRes] = await Promise.allSettled([
      apiFetch(LANDING_API_ENDPOINTS.ARTICLES),
      apiFetch(LANDING_API_ENDPOINTS.JUALAN_GOODS),
      apiFetch(LANDING_API_ENDPOINTS.JASA_SERVICES),
    ]);

    if (getCancelled?.()) {
      return;
    }

    // Articles
    try {
      if (articlesRes.status === "fulfilled" && articlesRes.value.ok) {
        const data = await articlesRes.value.json();
        const posts: ResidentPostItem[] = (data.articles ?? []).map(
          transformArticleToPost,
        );
        setArticles(posts);
      } else {
        setArticlesError("Gagal memuat artikel");
        setArticles([]);
      }
    } catch {
      setArticlesError("Gagal memuat artikel");
      setArticles([]);
    } finally {
      setIsArticlesLoaded(true);
    }

    // Jualan
    try {
      if (jualanRes.status === "fulfilled" && jualanRes.value.ok) {
        const data = await jualanRes.value.json();
        setJualanGoods(data.data?.goods ?? []);
      } else {
        setJualanGoods([]);
      }
    } catch {
      setJualanGoods([]);
    } finally {
      setIsJualanLoaded(true);
    }

    // Jasa
    try {
      if (jasaRes.status === "fulfilled" && jasaRes.value.ok) {
        const data = await jasaRes.value.json();
        setJasaServices(data.data?.services ?? []);
      } else {
        setJasaServices([]);
      }
    } catch {
      setJasaServices([]);
    } finally {
      setIsJasaServicesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setArticles([]);
      setIsArticlesLoaded(false);
      setArticlesError(null);
      setJualanGoods([]);
      setIsJualanLoaded(false);
      setJasaServices([]);
      setIsJasaServicesLoaded(false);
      return;
    }

    let cancelled = false;
    loadAll(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loadAll]);

  return {
    articles,
    isArticlesLoaded,
    hasArticlesContent: articles.length > 0,
    articlesError,

    jualanGoods,
    isJualanLoaded,
    hasJualanContent: jualanGoods.length > 0,

    jasaServices,
    isJasaServicesLoaded,
    hasDirectJasaContent: jasaServices.length > 0,

    refresh: loadAll,
  };
}
