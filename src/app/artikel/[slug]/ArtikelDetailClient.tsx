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
  youtube_url: string | null;
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

function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace("www.", "");
    if (hostname === "youtube.com" || hostname === "youtube-nocookie.com") {
      if (parsed.pathname === "/watch") {
        return `https://www.youtube-nocookie.com/embed/${parsed.searchParams.get("v")}`;
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return `https://www.youtube-nocookie.com/embed/${parsed.pathname.split("/")[2]}`;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        return `https://www.youtube-nocookie.com/embed/${parsed.pathname.split("/")[2]}`;
      }
    }
    if (hostname === "youtu.be") {
      return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
    }
  } catch {}
  return null;
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
    <div className="min-h-screen bg-white">
      {/* Mobile sticky header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 lg:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => router.push("/artikel")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Kembali</span>
          </button>
        </div>
      </header>

      {/* Desktop top bar */}
      <div className="hidden lg:flex lg:items-center lg:justify-between lg:border-b lg:border-gray-200 lg:px-10 lg:py-4">
        <button
          onClick={() => router.push("/artikel")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="text-sm font-medium">Kembali ke Artikel</span>
        </button>
        <span className="rounded-full bg-app-primary-muted px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-app-primary">
          Warga Digital &middot; Sawangan Regensi RT 03
        </span>
      </div>

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

      <main className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-14">

          {/* Main content column */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 lg:text-[2.5rem] lg:leading-tight">
              {article.title}
            </h1>

            {/* Desktop meta row */}
            <div className="hidden lg:flex items-center gap-4 text-sm text-gray-600 mb-8 pb-8 border-b border-gray-200">
              <span className="font-semibold text-gray-900">
                {article.author.name}
              </span>
              <span className="text-gray-300">&bull;</span>
              <div className="flex items-center gap-1">
                <CalendarDaysIcon className="h-4 w-4" />
                <span>{formatDate(article.published_at)}</span>
              </div>
              {readingTime > 0 && (
                <>
                  <span className="text-gray-300">&bull;</span>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>{readingTime} menit baca</span>
                  </div>
                </>
              )}
            </div>

            {/* Mobile meta row */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-8 pb-8 border-b border-gray-200 lg:hidden">
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

              <span className="text-gray-300">&bull;</span>

              <div className="flex items-center gap-1">
                <CalendarDaysIcon className="h-4 w-4" />
                <span>{formatDate(article.published_at)}</span>
              </div>

              {readingTime > 0 && (
                <>
                  <span className="text-gray-300">&bull;</span>
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

            {(() => {
              const embedUrl = getYouTubeEmbedUrl(article.youtube_url);
              if (!embedUrl) return null;
              return (
                <div className="relative w-full aspect-video mb-8 rounded-xl overflow-hidden">
                  <iframe
                    src={embedUrl}
                    title={article.title}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              );
            })()}

            {article.content && <MarkdownRenderer content={article.content} />}

            {article.images && article.images.length > 0 && (
              <div className="mt-12 -mx-4 sm:-mx-6 lg:-mx-0">
                <h2 className="text-xl font-bold text-gray-900 mb-6 px-4 sm:px-6 lg:px-0">
                  Galeri Foto
                </h2>
                <div className="grid grid-cols-3 gap-0 lg:gap-1 lg:rounded-2xl lg:overflow-hidden">
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

            {/* Mobile login CTA */}
            {!isAuthenticated && (
              <div className="mt-16 mb-8 lg:hidden">
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
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-32 space-y-5">
              {/* Author card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                  Penulis
                </p>
                <div className="flex items-center gap-3">
                  {article.author.avatar_url ? (
                    <div className="h-12 w-12 rounded-full overflow-hidden shrink-0">
                      <Image
                        src={article.author.avatar_url}
                        alt={article.author.name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <UserIcon className="h-6 w-6 text-gray-500" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {article.author.name}
                    </p>
                    <p className="text-xs text-gray-500">Penulis</p>
                  </div>
                </div>
              </div>

              {/* Meta card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                  Detail Artikel
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarDaysIcon className="h-4 w-4 shrink-0" />
                  <span>{formatDate(article.published_at)}</span>
                </div>
                {readingTime > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ClockIcon className="h-4 w-4 shrink-0" />
                    <span>{readingTime} menit baca</span>
                  </div>
                )}
                <button
                  onClick={handleShare}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
                  title="Bagikan artikel"
                >
                  <ShareIcon className="h-4 w-4" />
                  <span>Bagikan Artikel</span>
                </button>
              </div>

              {/* Desktop login CTA */}
              {!isAuthenticated && (
                <div
                  className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
                  }}
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 pointer-events-none" aria-hidden />
                  <div className="relative z-10">
                    <p className="text-sm font-semibold text-white/90 mb-3">
                      Login untuk melihat semua fitur
                    </p>
                    <Link
                      href={`/auth/login?redirect=${encodeURIComponent(`/artikel/${article.slug}`)}`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-primary font-semibold rounded-xl hover:bg-white/90 active:scale-95 transition-all duration-200 shadow-lg w-full"
                      style={{ color: "var(--color-primary)" }}
                    >
                      <span>Login</span>
                      <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
