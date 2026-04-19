"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CalendarDaysIcon, UserCircleIcon, ChevronLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { PageLoader } from "@/components/ui";

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

function generateExcerpt(content: string, maxLength: number = 160): string {
  const plainText = content.replace(/<[^>]*>/g, "");
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
      const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const newArticles = data.articles.filter(article => {
        const createdDate = new Date(article.created_at);
        return createdDate >= oneWeekAgo;
      });
      setArticlesThisWeek(newArticles.length);
    } catch (error) {
      console.error("Error fetching articles:", error);
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
        className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white"
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
              {/* Back Button */}
              <button
                type="button"
                onClick={() => router.push("/landing")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
                aria-label="Kembali ke beranda"
              >
                <ChevronLeftIcon className="h-4 w-4 text-white" />
              </button>
              
              {/* Title Block */}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Warga Digital
                </p>
                <h1 className="text-lg font-extrabold leading-tight text-white">
                  Artikel
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
              <ArrowPathIcon className={`h-4 w-4 text-white ${loading || isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* Dynamic Subtitle */}
          <p className="mt-3 text-[13px] font-medium text-white/80 leading-relaxed">
            {totalArticles === 0 
              ? `Daftar lengkap seluruh artikel yang berisi berita, acara, panduan, dan informasi dari pengurus ${communityName || "Warga Digital"}. Belum ada artikel yang telah di publish.`
              : `Daftar lengkap seluruh artikel yang berisi berita, acara, panduan, dan informasi dari pengurus ${communityName || "Warga Digital"}. Berikut tersedia ${totalArticles} artikel yang telah di publish.`}
          </p>
          
          {/* Stats Pills */}
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
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-md px-4 py-6">
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
            {/* Articles Vertical List */}
            <div className="space-y-6">
              {articles.map((article) => {
                const displayExcerpt = article.excerpt || (article.content ? generateExcerpt(article.content) : "");

                return (
                  <article
                    key={article.id}
                    onClick={() => handleArticleClick(article.slug)}
                    className="bg-app-surface rounded-2xl shadow-sm overflow-hidden group cursor-pointer transition-all duration-300 active:scale-[0.98]"
                  >
                    {/* Featured Image - Full Width */}
                    {article.featured_image_url ? (
                      <div className="relative h-56 w-full">
                        <Image
                          src={article.featured_image_url}
                          alt={article.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 430px"
                        />
                      </div>
                    ) : (
                      <div className="relative h-56 w-full bg-app-primary-muted flex items-center justify-center">
                        <UserCircleIcon className="w-20 h-20 text-app-primary opacity-50" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-6">
                      {/* Title */}
                      <h2 className="text-xl font-bold text-[var(--color-title)] leading-tight mb-3 line-clamp-2 group-hover:text-app-primary transition-colors">
                        {article.title}
                      </h2>

                      {/* Excerpt */}
                      {displayExcerpt && (
                        <p className="text-sm text-[var(--color-body-muted)] leading-relaxed mb-3 line-clamp-3">
                          {displayExcerpt}
                        </p>
                      )}

                      {/* Date - Right aligned below excerpt */}
                      <div className="flex items-center justify-end gap-1.5 text-[var(--color-body-muted)] mb-4">
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-medium whitespace-nowrap">
                          {formatDate(article.created_at)}
                        </span>
                      </div>

                      {/* Meta Row - Author Info */}
                      <div className="pt-4 border-t border-[var(--color-input-border)]/20">
                        <div className="flex items-start gap-3">
                          {article.author.avatar_url ? (
                            <Image
                              src={article.author.avatar_url}
                              alt={article.author.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                              width={32}
                              height={32}
                            />
                          ) : (
                            <UserCircleIcon className="w-8 h-8 text-[var(--color-body-muted)] shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <p className="text-[10px] font-medium text-[var(--color-body-muted)] mb-0.5">
                              Dipublikasikan oleh:
                            </p>
                            <span className="text-xs font-bold text-[var(--color-body)] truncate">
                              {article.author.name}
                            </span>
                            {article.author.blok_rumah && (
                              <span className="text-[10px] font-medium text-[var(--color-primary)]">
                                {article.author.blok_rumah}
                              </span>
                            )}
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
