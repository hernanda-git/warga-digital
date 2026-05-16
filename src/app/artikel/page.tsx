"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CalendarDaysIcon,
  UserCircleIcon,
  ChevronLeftIcon,
  ArrowRightOnRectangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { PageLoader } from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
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

interface ArticlesResponse {
  articles: Article[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function stripMarkdown(md: string): string {
  return md
    .replace(/<[^>]*>/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/^###\s+/gm, "")
    .replace(/^##\s+/gm, "")
    .replace(/^#\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^---+$/gm, "")
    .replace(/^={3,}$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function generateExcerpt(content: string, maxLength: number = 300): string {
  const plainText = stripMarkdown(content);
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength) + "...";
}

function getCommunityNameFromCookie(): string {
  if (typeof document === "undefined") return "Warga Digital";
  const match = document.cookie.match(/community_name=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "Warga Digital";
}

export default function ArtikelPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalArticles, setTotalArticles] = useState(0);
  const [articlesThisWeek, setArticlesThisWeek] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [communityName] = useState<string>(getCommunityNameFromCookie());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [navigatingSlug, setNavigatingSlug] = useState<string | null>(null);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/artikel?page=${currentPage}&limit=10`);
      if (!res.ok) throw new Error("Failed to fetch articles");
      const data: ArticlesResponse = await res.json();
      setArticles(data.articles);
      setTotalPages(data.meta.totalPages);
      setTotalArticles(data.meta.total);

      // Calculate articles this week
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const newArticles = data.articles.filter((article) => {
        const createdDate = new Date(article.created_at);
        return createdDate >= oneWeekAgo;
      });
      setArticlesThisWeek(newArticles.length);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [currentPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleArticleClick = (slug: string) => {
    setNavigatingSlug(slug);
    router.push(`/artikel/${slug}`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    await fetchArticles();
    setIsRefreshing(false);
  };

  if (loading && articles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-surface-alt">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-surface-alt">
      {/* Hero Section */}
      <section
        className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white lg:px-6 lg:py-8"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
        }}
        aria-label="Artikel"
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10"
          aria-hidden
        />

        <div className="relative z-10">
          {/* Header Row: Back Button + Title + Refresh */}
          <div className="flex items-start justify-between gap-3">
            {/* Left: Back Button + Title */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {/* Back / Login Button */}
              <button
                type="button"
                onClick={() => router.push("/landing")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
                aria-label={isAuthenticated ? "Kembali ke beranda" : "Masuk"}
              >
                {isAuthenticated ? (
                  <ChevronLeftIcon className="h-4 w-4 text-white" />
                ) : (
                  <ArrowRightOnRectangleIcon className="h-4 w-4 text-white" />
                )}
              </button>

              {/* Title Block */}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Warga Digital
                </p>
                <h1 className="text-lg font-extrabold leading-tight text-white">
                  {isAuthenticated ? "Artikel" : "Berita & Informasi Terbaru"}
                </h1>
              </div>
            </div>

            {/* Right: Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 disabled:opacity-50"
              aria-label="Muat ulang"
            >
              <ArrowPathIcon
                className={`h-4 w-4 text-white ${loading || isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Dynamic Subtitle */}
          <p className="mt-3 text-[13px] font-medium text-white/80 leading-relaxed">
            {isAuthenticated
              ? totalArticles === 0
                ? `Daftar lengkap seluruh artikel yang berisi berita, acara, panduan, dan informasi dari pengurus ${communityName || "Warga Digital"}. Belum ada artikel yang telah di publish.`
                : `Daftar lengkap seluruh artikel yang berisi berita, acara, panduan, dan informasi dari pengurus ${communityName || "Warga Digital"}. Berikut tersedia ${totalArticles} artikel yang telah di publish.`
              : `Akses berita terbaru, informasi kegiatan warga, dan berbagai update penting di lingkungan RT 03 RW 14 Sawangan Regensi dalam satu platform terintegrasi.`}
          </p>

          {/* Stats Pills */}
          {isAuthenticated && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {/* Total Articles */}
              <div className="rounded-xl bg-white/15 px-3 py-2.5 text-center backdrop-blur-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/60">
                  Total
                </p>
                <p className="mt-1 text-sm font-extrabold leading-tight text-white">
                  {loading ? "—" : totalArticles}
                </p>
              </div>

              {/* This Week */}
              <div className="rounded-xl bg-white/15 px-3 py-2.5 text-center backdrop-blur-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/60">
                  Baru
                </p>
                <p className="mt-1 text-sm font-extrabold leading-tight text-white">
                  {loading ? "—" : articlesThisWeek}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-md px-4 py-6 lg:max-w-4xl lg:px-6 lg:py-6">
        {articles.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 rounded-full bg-app-primary-muted flex items-center justify-center mb-4">
              <UserCircleIcon className="w-12 h-12 text-app-primary" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-title)] mb-2">
              Belum ada artikel
            </h3>
            <p className="text-[var(--color-body-muted)] text-sm">
              Artikel akan muncul setelah admin memposting konten baru
            </p>
          </div>
        ) : (
          <>
            {/* Articles Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {articles.map((article) => {
                const displayExcerpt = article.content
                  ? generateExcerpt(article.content)
                  : "";

                return (
                  <article
                    key={article.id}
                    onClick={() => handleArticleClick(article.slug)}
                    className="relative bg-app-surface rounded-2xl shadow-sm overflow-hidden group cursor-pointer transition-all duration-300 active:scale-[0.98]"
                  >
                    {navigatingSlug === article.slug && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                        <div className="h-8 w-8 animate-spin rounded-full border-3 border-white/30 border-t-white" />
                      </div>
                    )}
                    {/* Featured Image - 16:9 Full Width, No Padding */}
                    {article.featured_image_url ? (
                      <div className="relative w-full aspect-video">
                        <Image
                          src={article.featured_image_url}
                          alt={article.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 430px"
                        />
                      </div>
                    ) : (
                      <div className="relative w-full aspect-video bg-app-primary-muted flex items-center justify-center">
                        <UserCircleIcon className="w-20 h-20 text-app-primary opacity-50" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-6">
                      {/* Spacer for optimal gap between image and title */}
                      {/* Title */}
                      <h2 className="text-xl font-bold text-[var(--color-title)] leading-tight mb-4 line-clamp-2 group-hover:text-app-primary transition-colors">
                        {article.title}
                      </h2>

                      {/* Excerpt */}
                      {displayExcerpt && (
                        <p className="text-sm text-[var(--color-body-muted)] leading-relaxed mb-3 line-clamp-5">
                          {displayExcerpt}
                        </p>
                      )}

                      {/* Meta Row - Author Info */}
                      <div className="pt-4 border-t border-[var(--color-input-border)]/20">
                        <div className="flex items-center gap-2">
                          {article.author.avatar_url ? (
                            <Image
                              src={article.author.avatar_url}
                              alt={article.author.name}
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                              width={24}
                              height={24}
                            />
                          ) : (
                            <UserCircleIcon className="w-6 h-6 text-[var(--color-body-muted)] shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <p className="text-[11px] font-medium text-[var(--color-body-muted)] truncate">
                              Dipublish oleh:{" "}
                              <span className="font-semibold text-[var(--color-body)]">
                                {article.author.name}
                              </span>
                              {article.author.blok_rumah && (
                                <>
                                  {" "}
                                  -{" "}
                                  <span className="font-medium text-[var(--color-primary)]">
                                    {article.author.blok_rumah}
                                  </span>
                                </>
                              )}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <CalendarDaysIcon className="w-3 h-3 text-[var(--color-body-muted)]" />
                              <span className="text-[10px] font-medium text-[var(--color-body-muted)]">
                                {formatDate(article.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-40"
                  style={{
                    border: "1.5px solid var(--color-input-border)",
                    color: "var(--color-body)",
                    background: "var(--color-surface)",
                  }}
                >
                  ← Sebelumnya
                </button>

                <span className="text-xs font-medium text-[var(--color-body-muted)]">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40"
                  style={{
                    background: "var(--color-primary)",
                    boxShadow: "0 4px 12px -4px var(--color-primary-shadow)",
                  }}
                >
                  Selanjutnya →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
