"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDaysIcon,
  UserIcon,
  ClockIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ShareIcon,
  SparklesIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { PageLoader } from "@/components/ui";
import { toast } from "sonner";
import Head from "next/head";
import { ImageLightbox } from "@/components/articles/ImageLightbox";
import { useAuthStore } from "@/stores/auth-store";

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

interface ArticleResponse {
  article: Article;
}

export default function ArtikelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [readingTime, setReadingTime] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/artikel/${slug}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Artikel tidak ditemukan");
            router.push("/artikel");
            return;
          }
          throw new Error("Failed to fetch article");
        }
        const data: ArticleResponse = await res.json();
        setArticle(data.article);

        // Calculate reading time
        if (data.article.content) {
          const wordsPerMinute = 200;
          const wordCount = data.article.content
            .replace(/<[^>]*>/g, "")
            .split(/\s+/).length;
          setReadingTime(Math.ceil(wordCount / wordsPerMinute));
        }
      } catch (error) {
        console.error("Error fetching article:", error);
        toast.error("Gagal memuat artikel");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchArticle();
    }
  }, [slug, router]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = article?.title || "Artikel Warga Digital";

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
        toast.success("Berhasil berbagi");
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link disalin ke clipboard");
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <PageLoader />
      </div>
    );
  }

  if (!article) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{article.title} - Warga Digital</title>
        <meta name="description" content={article.excerpt || article.title} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.excerpt || article.title} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={window.location.href} />
        {article.featured_image_url && (
          <meta property="og:image" content={article.featured_image_url} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={article.title} />
        <meta name="twitter:description" content={article.excerpt || article.title} />
        {article.featured_image_url && (
          <meta name="twitter:image" content={article.featured_image_url} />
        )}
        <link rel="canonical" href={window.location.href} />
      </Head>

      <div className="min-h-screen bg-white">
      {/* Header - Only shown for authenticated users */}
      {isAuthenticated && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Kembali</span>
            </button>
          </div>
        </header>
      )}

        {/* Article Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Featured Image */}
          {article.featured_image_url && (
            <div className="relative w-full h-64 sm:h-96 mb-8 rounded-xl overflow-hidden">
              <Image
                src={article.featured_image_url}
                alt={article.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 50vw"
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            {article.title}
          </h1>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-8 pb-8 border-b border-gray-200">
            {/* Author */}
            <div className="flex items-center gap-2">
              {article.author.avatar_url ? (
                <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={article.author.avatar_url}
                    alt={article.author.name}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <UserIcon className="h-5 w-5 text-gray-500" />
                </div>
              )}
              <span className="font-medium text-gray-900">
                {article.author.name}
              </span>
            </div>

            <span className="text-gray-300">•</span>

            {/* Published Date */}
            <div className="flex items-center gap-1">
              <CalendarDaysIcon className="h-4 w-4" />
              <span>
                {formatDate(article.published_at)}
              </span>
            </div>

            {readingTime > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1">
                  <ClockIcon className="h-4 w-4" />
                  <span>{readingTime} menit baca</span>
                </div>
              </>
            )}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              title="Bagikan artikel"
            >
              <ShareIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Bagikan</span>
            </button>
          </div>

          {/* Content */}
          {article.content && (
            <div
              className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          )}

          {/* Article Images Gallery */}
          {article.images && article.images.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Galeri Foto
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {article.images.map((image, index) => (
                  <div
                    key={image.id}
                    onClick={() => openLightbox(index)}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                  >
                    <Image
                      src={image.url}
                      alt={image.alt_text || article.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 20vw"
                      loading={index < 3 ? "eager" : "lazy"}
                    />
                    
                    {/* Image counter badge */}
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded-md">
                      {index + 1}
                    </div>

                    {/* Alt text on hover */}
                    {image.alt_text && (
                      <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-3 py-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        {image.alt_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Image Lightbox */}
          {article.images && (
            <ImageLightbox
              images={article.images}
              initialIndex={lightboxIndex}
              isOpen={lightboxOpen}
              onClose={closeLightbox}
            />
          )}

          {/* Last Updated */}
          {article.updated_at !== article.published_at && (
            <div className="mt-12 pt-8 border-t border-gray-200 text-sm text-gray-500">
              Terakhir diperbarui: {formatDate(article.updated_at)}
            </div>
          )}

          {/* Login CTA for Anonymous Users */}
          {!isAuthenticated && (
            <div className="mt-16 mb-8">
              <div
                className="relative overflow-hidden rounded-2xl p-6 shadow-lg"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
                }}
              >
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-semibold text-white/90">
                      Login untuk melihat semua fitur
                    </p>
                  </div>
                  <Link
                    href={`/auth/login?redirect=${encodeURIComponent(`/artikel/${slug}`)}`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 active:scale-95 transition-all duration-200 shadow-lg shrink-0"
                    style={{ color: "var(--color-primary)" }}
                  >
                    <span>Login</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
