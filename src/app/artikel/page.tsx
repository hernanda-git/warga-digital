"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CalendarDaysIcon, UserIcon } from "@heroicons/react/24/outline";
import { PageLoader } from "@/components/ui";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image_url: string | null;
  published_at: string;
  author: {
    id: string;
    name: string;
    avatar_url: string | null;
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

export default function ArtikelPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/artikel?page=${currentPage}&limit=12`);
        if (!res.ok) throw new Error("Failed to fetch articles");
        const data: ArticlesResponse = await res.json();
        setArticles(data.articles);
        setTotalPages(data.meta.totalPages);
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setLoading(false);
      }
    };

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

  if (loading && articles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Artikel
          </h1>
          <p className="text-lg text-gray-600">
            Berita, panduan, dan cerita dari komunitas Warga Digital
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {articles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">
              Belum ada artikel yang dipublikasikan.
            </p>
          </div>
        ) : (
          <>
            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => (
                <article
                  key={article.id}
                  onClick={() => handleArticleClick(article.slug)}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer group"
                >
                  {/* Featured Image */}
                  {article.featured_image_url && (
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={article.featured_image_url}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    {/* Title */}
                    <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h2>

                    {/* Excerpt */}
                    {article.excerpt && (
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {article.excerpt}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        {article.author.avatar_url ? (
                          <Image
                            src={article.author.avatar_url}
                            alt={article.author.name}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        ) : (
                          <UserIcon className="h-6 w-6" />
                        )}
                        <span className="line-clamp-1">
                          {article.author.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarDaysIcon className="h-4 w-4" />
                        <span>
                          {formatDate(article.published_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sebelumnya
                </button>

                <span className="px-4 py-2 text-gray-600">
                  Halaman {currentPage} dari {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Berikutnya
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
