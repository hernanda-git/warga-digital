"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  ShareIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface GalleryImage {
  id: string;
  url: string;
  alt_text: string | null;
  width: number | null;
  height: number | null;
}

interface ImageLightboxProps {
  images: GalleryImage[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setImagePosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        navigate(-1);
      } else if (e.key === "ArrowRight") {
        navigate(1);
      } else if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(z + 0.25, 3));
      } else if (e.key === "-") {
        setZoom((z) => Math.max(z - 0.25, 1));
      } else if (e.key === "0") {
        setZoom(1);
        setImagePosition({ x: 0, y: 0 });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const navigate = useCallback(
    (direction: number) => {
      setCurrentIndex((prev) => {
        const newIndex = prev + direction;
        if (newIndex < 0) return images.length - 1;
        if (newIndex >= images.length) return 0;
        return newIndex;
      });
      setZoom(1);
      setImagePosition({ x: 0, y: 0 });
    },
    [images.length],
  );

  const handleDownload = async () => {
    const image = images[currentIndex];
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `foto-${currentIndex + 1}-${image.alt_text || "article"}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success("Gambar berhasil diunduh");
    } catch (error) {
      // Fallback: open in new tab
      window.open(image.url, "_blank");
      toast.info("Membuka gambar di tab baru");
    }
  };

  const handleShare = async () => {
    const image = images[currentIndex];
    
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        const response = await fetch(image.url);
        const blob = await response.blob();
        const file = new File([blob], "image.jpg", { type: "image/jpeg" });

        await navigator.share({
          title: image.alt_text || "Foto artikel",
          files: [file],
        });
        toast.success("Berhasil berbagi");
        return;
      } catch (error) {
        // User cancelled or share failed, fall through to clipboard
      }
    }
    
    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(image.url);
      toast.success("Link gambar disalin");
    } catch (error) {
      // Final fallback: open in new tab
      window.open(image.url, "_blank");
      toast.info("Membuka gambar di tab baru");
    }
  };

  // Touch/swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStart({
      x: e.touches[0].clientX - imagePosition.x,
      y: e.touches[0].clientY - imagePosition.y,
    });
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || zoom <= 1) return;
    setImagePosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        title="Tutup (ESC)"
      >
        <XMarkIcon className="h-6 w-6 text-white" />
      </button>

      {/* Navigation - Previous */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(-1);
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          title="Sebelumnya (←)"
        >
          <ArrowLeftIcon className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Navigation - Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(1);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          title="Berikutnya (→)"
        >
          <ArrowRightIcon className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Image container */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) translate(${imagePosition.x / zoom}px, ${imagePosition.y / zoom}px)`,
          }}
        >
          <Image
            src={currentImage.url}
            alt={currentImage.alt_text || "Foto artikel"}
            width={currentImage.width || 1200}
            height={currentImage.height || 800}
            className="max-w-full max-h-[90vh] object-contain"
            priority
            unoptimized
          />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
          {/* Image counter */}
          <div className="text-white text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </div>

          {/* Alt text */}
          {currentImage.alt_text && (
            <div className="flex-1 text-white text-sm text-center truncate px-4">
              {currentImage.alt_text}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-white/10 rounded-full px-1">
              {/* Reset zoom (when at 100%) */}
              {zoom === 1 ? (
                <button
                  onClick={() => {
                    setZoom(1);
                    setImagePosition({ x: 0, y: 0 });
                  }}
                  className="p-2 text-white/60 hover:text-white transition-colors"
                  title="Reset zoom"
                >
                  <span className="text-xs font-medium">100%</span>
                </button>
              ) : (
                /* Zoom out */
                <button
                  onClick={() => {
                    setZoom((z) => Math.max(z - 0.25, 1));
                    if (zoom <= 1.25) {
                      setImagePosition({ x: 0, y: 0 });
                    }
                  }}
                  className="p-2 hover:bg-white/20 text-white rounded-full transition-colors"
                  title="Zoom out (-)"
                >
                  <MagnifyingGlassMinusIcon className="h-5 w-5" />
                </button>
              )}

              {/* Zoom level indicator */}
              <span className="text-white text-xs font-medium px-2 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>

              {/* Zoom in */}
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                className={`p-2 rounded-full transition-colors ${zoom < 3 ? 'hover:bg-white/20 text-white' : 'text-white/30 cursor-not-allowed'}`}
                title="Zoom in (+)"
                disabled={zoom >= 3}
              >
                <MagnifyingGlassPlusIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              title="Unduh"
            >
              <ArrowDownIcon className="h-5 w-5 text-white" />
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              title="Bagikan"
            >
              <ShareIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Click outside hint */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        Klik di luar untuk menutup
      </div>
    </div>
  );
}
