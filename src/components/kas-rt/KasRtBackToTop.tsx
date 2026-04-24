"use client";

import { useEffect, useState } from "react";
import { ChevronUpIcon } from "@heroicons/react/24/outline";

interface KasRtBackToTopProps {
  containerRef: React.RefObject<HTMLElement | null>;
  /**
   * Show button only after user has scrolled past this many pixels
   * AND loaded at least one additional page.
   */
  minScroll?: number;
  /**
   * Show button only when at least this many items are visible
   * (i.e. after loading page 2+)
   */
  minVisibleItems?: number;
  visibleItemsCount: number;
}

/**
 * Floating back-to-top button that appears when user scrolls down
 * and has loaded additional pages.
 */
export function KasRtBackToTop({
  containerRef,
  minScroll = 200,
  minVisibleItems = 10,
  visibleItemsCount,
}: KasRtBackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const shouldShow =
        scrollTop > minScroll && visibleItemsCount >= minVisibleItems;
      setIsVisible(shouldShow);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // initial check

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [containerRef, minScroll, minVisibleItems, visibleItemsCount]);

  const handleClick = () => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`fixed bottom-6 right-6 z-30 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all duration-300 active:scale-90 ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
      style={{ background: "var(--color-primary)" }}
      aria-label="Kembali ke atas"
    >
      <ChevronUpIcon className="h-5 w-5 text-white" />
    </button>
  );
}
