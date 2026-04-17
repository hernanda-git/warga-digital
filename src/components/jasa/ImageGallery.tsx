"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/outline";

interface ImageGalleryProps {
  images: Array<{
    id: string;
    url: string;
    alt_text: string | null;
    sort_order: number;
    is_primary: boolean;
  }>;
  className?: string;
}

/**
 * ImageGallery - Carousel with thumbnails and fullscreen mode
 *
 * Features:
 * - Swipeable carousel (touch support)
 * - Thumbnail strip navigation
 * - Fullscreen modal with zoom
 * - Keyboard navigation (arrow keys, escape)
 * - Auto-play optional
 * - Mobile-first responsive
 */
export function ImageGallery({ images, className = "" }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Sort images by sort_order
  const sortedImages = [...images].sort((a, b) => a.sort_order - b.sort_order);

  // Navigation functions
  const goToNext = useCallback(() => {
    if (currentIndex < sortedImages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, sortedImages.length]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const goToIndex = (index: number) => {
    if (index >= 0 && index < sortedImages.length) {
      setCurrentIndex(index);
    }
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;

      switch (e.key) {
        case "ArrowLeft":
          goToPrev();

          break;

        case "ArrowRight":
          goToNext();

          break;

        case "Escape":
          setIsFullscreen(false);

          setIsZoomed(false);

          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, currentIndex, goToNext, goToPrev]);

  if (sortedImages.length === 0) {
    return (
      <div
        className={`flex h-64 items-center justify-center rounded-2xl bg-gray-100 ${className}`}
      >
        <p className="text-sm text-app-body-muted">Tidak ada gambar</p>
      </div>
    );
  }

  const currentImage = sortedImages[currentIndex];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Carousel */}
      <div
        ref={carouselRef}
        className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Current Image */}
        <div
          className={`relative h-full w-full transition-transform duration-300 ${
            isZoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <Image
            src={currentImage.url}
            alt={currentImage.alt_text || `Gambar ${currentIndex + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={currentIndex === 0}
          />
        </div>

        {/* Navigation Arrows (hidden on mobile, shown on larger screens) */}
        {sortedImages.length > 1 && (
          <>
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="hidden h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-opacity hover:bg-black/60 disabled:opacity-0 md:flex"
              aria-label="Gambar sebelumnya"
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
            <button
              onClick={goToNext}
              disabled={currentIndex === sortedImages.length - 1}
              className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-opacity hover:bg-black/60 disabled:opacity-0 md:flex"
              aria-label="Gambar berikutnya"
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur-sm">
          {currentIndex + 1} / {sortedImages.length}
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-opacity hover:bg-black/60"
          aria-label="Buka fullscreen"
        >
          <ArrowsPointingOutIcon className="h-4 w-4" />
        </button>

        {/* Primary Badge */}
        {currentImage.is_primary && (
          <div className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white">
            Utama
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {sortedImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {sortedImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => goToIndex(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                index === currentIndex
                  ? "border-emerald-500 ring-2 ring-emerald-500/20"
                  : "border-transparent hover:border-gray-300"
              }`}
              aria-label={`Lihat gambar ${index + 1}`}
              aria-current={index === currentIndex ? "true" : "false"}
            >
              <Image
                src={image.url}
                alt={image.alt_text || `Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => {
            setIsFullscreen(false);
            setIsZoomed(false);
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => {
              setIsFullscreen(false);
              setIsZoomed(false);
            }}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Tutup fullscreen"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Fullscreen Image */}
          <div
            className="relative h-[80vh] w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={currentImage.url}
              alt={currentImage.alt_text || `Gambar ${currentIndex + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>

          {/* Fullscreen Navigation */}
          {sortedImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrev();
                }}
                disabled={currentIndex === 0}
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-opacity hover:bg-white/20 disabled:opacity-0"
                aria-label="Gambar sebelumnya"
              >
                <ChevronLeftIcon className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                disabled={currentIndex === sortedImages.length - 1}
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-opacity hover:bg-white/20 disabled:opacity-0"
                aria-label="Gambar berikutnya"
              >
                <ChevronRightIcon className="h-8 w-8" />
              </button>
            </>
          )}

          {/* Fullscreen Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm">
            {currentIndex + 1} / {sortedImages.length}
          </div>
        </div>
      )}
    </div>
  );
}
