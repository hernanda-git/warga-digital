"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDaysIcon,
  UserIcon,
  ClockIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { ImageLightbox } from "@/components/articles/ImageLightbox";
import { useAuthStore } from "@/stores/auth-store";
import MarkdownRenderer from "@/components/articles/MarkdownRenderer";

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

export function ArtikelDetailClient({ article }: { article: Article }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const readingTime = useMemo(() => {
    if (!article.content) return 0;
    const wordsPerMinute = 200;
    const wordCount = article.content
      .replace(/<[^>]*>/g, "")
      .split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }, [article.content]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = article?.title || "Artikel Warga Digital";

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
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

  return (
    <div className="min-h-screen bg-white lg:max-w-3xl lg:mx-auto lg:w-full lg:px-6 lg:py-6">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push("/artikel")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors lg:hidden"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Kembali</span>
          </button>
        </div>
      </header>

      {/* Featured image — full width edge-to-edge, 16:9, no rounded corners */}
      {article.featured_image_url && (
        <div className="relative w-full aspect-video">
          <Image
            src={article.featured_image_url}
            alt={article.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-8 pb-8 border-b border-gray-200">
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
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <UserIcon className="h-5 w-5 text-gray-500" />
              </div>
            )}
            <span className="font-medium text-gray-900">
              {article.author.name}
            </span>
          </div>

          <span className="text-gray-300">•</span>

          <div className="flex items-center gap-1">
            <CalendarDaysIcon className="h-4 w-4" />
            <span>{formatDate(article.published_at)}</span>
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

          <button
            onClick={handleShare}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Bagikan artikel"
          >
            <ShareIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Bagikan</span>
          </button>
        </div>

        {article.content && <MarkdownRenderer content={article.content} />}

        {article.images && article.images.length > 0 && (
          <div className="mt-12 -mx-4 sm:-mx-6 lg:-mx-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 px-4 sm:px-6 lg:px-8">
              Galeri Foto
            </h2>
            <div className="grid grid-cols-3 gap-0">
              {article.images.map((image, index) => (
                <div
                  key={image.id}
                  onClick={() => openLightbox(index)}
                  className="group relative aspect-square overflow-hidden bg-gray-100 cursor-pointer"
                >
                  <Image
                    src={image.url}
                    alt={image.alt_text || article.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 20vw"
                    loading={index < 3 ? "eager" : "lazy"}
                  />
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

        {article.images && (
          <ImageLightbox
            images={article.images}
            initialIndex={lightboxIndex}
            isOpen={lightboxOpen}
            onClose={closeLightbox}
          />
        )}

        {article.updated_at !== article.published_at && (
          <div className="mt-12 pt-8 border-t border-gray-200 text-sm text-gray-500">
            Terakhir diperbarui: {formatDate(article.updated_at)}
          </div>
        )}

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
                  href={`/auth/login?redirect=${encodeURIComponent(`/artikel/${article.slug}`)}`}
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
  );
}
