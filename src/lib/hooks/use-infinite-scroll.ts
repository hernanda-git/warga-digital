"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  onIntersect: () => void;
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Infinite scroll hook using Intersection Observer.
 *
 * Returns a ref to attach to a sentinel element at the bottom of a list.
 * When the sentinel enters the viewport, `onIntersect` is called.
 *
 * Features:
 * - Debounced to prevent rapid-fire triggers
 * - Can be disabled (e.g. when loading or no more data)
 * - Automatically disconnects/reconnects when enabled changes
 */
export function useInfiniteScroll({
  onIntersect,
  threshold = 0.1,
  rootMargin = "100px",
  enabled = true,
  debounceMs = 300,
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isIntersectingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedIntersect = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onIntersect();
      isIntersectingRef.current = false;
    }, debounceMs);
  }, [onIntersect, debounceMs]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isIntersectingRef.current) {
          isIntersectingRef.current = true;
          debouncedIntersect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [enabled, threshold, rootMargin, debouncedIntersect]);

  return sentinelRef;
}
