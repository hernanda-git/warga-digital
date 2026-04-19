/**
 * useArticlesData Hook
 *
 * Custom hook for managing articles data on the landing page Info Warga section.
 * Following SOLID principles:
 * - Single Responsibility: Only handles articles data fetching and state
 * - Dependency Inversion: Uses apiFetch instead of direct fetch calls
 * - Interface Segregation: Returns only what consumers need
 *
 * Features:
 * - Fetches latest published articles (up to 5)
 * - Transforms API data into UI-ready post items
 * - Manages loading and error states
 * - Provides refresh capability
 * - Auto-fetch on authentication and every page visit
 */

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import type { ResidentPostItem } from "@/components/landing/ResidentPostsSection";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Article {
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

interface ArticlesApiResponse {
  articles: Article[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Hook Return Type ─────────────────────────────────────────────────────────

export interface UseArticlesDataReturn {
  /** Article items ready for display */
  items: ResidentPostItem[];
  /** Whether articles data is currently loading */
  isLoading: boolean;
  /** Whether initial data has been loaded */
  isLoaded: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether there are articles to display */
  hasContent: boolean;
  /** Function to manually refresh articles data */
  refresh: () => Promise<void>;
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Transform API article to ResidentPostItem format
 */
function transformArticleToPost(article: Article): ResidentPostItem {
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

/**
 * Check if there are articles to display
 */
function hasArticlesContent(items: ResidentPostItem[]): boolean {
  return items.length > 0;
}

// ─── Hook Implementation ──────────────────────────────────────────────────────

/**
 * Hook for managing articles data on landing page Info Warga section
 *
 * @returns Articles state and operations
 *
 * @example
 * function LandingPage() {
 *   const {
 *     items: articles,
 *     isLoaded,
 *     hasContent,
 *     error
 *   } = useArticlesData();
 *
 *   if (!isLoaded) {
 *     return null; // Section hidden while loading
 *   }
 *
 *   if (!hasContent) {
 *     return <EmptyState error={error} />;
 *   }
 *
 *   return <ResidentPostsSection items={articles} />;
 * }
 */
export function useArticlesData(): UseArticlesDataReturn {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // ── State ──────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<ResidentPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch Articles Data ────────────────────────────────────────────────────
  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetch("/api/artikel?page=1&limit=5");

      if (!response.ok) {
        throw new Error(
          `Failed to fetch articles: ${response.status} ${response.statusText}`,
        );
      }

      const data: ArticlesApiResponse = await response.json();

      // Transform API response to UI models
      const posts = data.articles.map(transformArticleToPost);

      setItems(posts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat artikel");
      setItems([]);
    } finally {
      setIsLoading(false);
      setIsLoaded(true);
    }
  }, []);

  // ── Auto-fetch on Authentication ──────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      // Reset state when not authenticated
      setItems([]);
      setIsLoaded(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiFetch("/api/artikel?page=1&limit=5");

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          throw new Error(
            `Failed to fetch articles: ${response.status} ${response.statusText}`,
          );
        }

        const data: ArticlesApiResponse = await response.json();

        // Transform API data to UI models
        const posts = data.articles.map(transformArticleToPost);

        setItems(posts);
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Gagal memuat artikel");
        setItems([]);
      } finally {
        setIsLoading(false);
        setIsLoaded(true);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // ── Compute Derived State ─────────────────────────────────────────────────
  const hasContent = hasArticlesContent(items);

  // ── Return Hook API ───────────────────────────────────────────────────────
  return {
    items,
    isLoading,
    isLoaded,
    error,
    hasContent,
    refresh: loadArticles,
  };
}
