"use client";

import { useCallback, useState } from "react";
import { PULL_TO_REFRESH_THRESHOLD, MAX_PULL_DISTANCE } from "@/lib/kas-rt-constants";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  isRefreshing: boolean;
}

interface UsePullToRefreshReturn {
  pullDistance: number;
  touchStartY: number | null;
  touchStartX: number | null;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

// Minimum vertical movement to trigger pull-to-refresh (prevents accidental triggers)
const MIN_PULL_THRESHOLD = 10;

/**
 * Hook for handling pull-to-refresh functionality with improved gesture detection
 */
export function usePullToRefresh({
  onRefresh,
  isRefreshing,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    
    // Exclude interactive elements and transaction cards
    if (target.closest("button, a, input, select, textarea, details, article, [data-no-ptr]")) {
      return;
    }
    
    setTouchStartY(e.touches[0].clientY);
    setTouchStartX(e.touches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    
    // Exclude interactive elements and transaction cards
    if (target.closest("button, a, input, select, textarea, details, article, [data-no-ptr]")) {
      return;
    }
    
    if (touchStartY == null || touchStartX == null) return;

    // Find the actual scrollable container to check scroll position
    const scrollContainer = target.closest(".overflow-y-auto") || 
                           (target as HTMLElement).parentElement?.closest(".overflow-y-auto") ||
                           document.querySelector("main .overflow-y-auto");
    
    const scrollTop = scrollContainer ? (scrollContainer as HTMLElement).scrollTop : 0;
    
    // Only allow pull-to-refresh when at the very top of scroll
    if (scrollTop > MIN_PULL_THRESHOLD) {
      setTouchStartY(null);
      setTouchStartX(null);
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - touchStartY;
    const deltaX = Math.abs(currentX - touchStartX);

    // Check if movement is primarily vertical (not horizontal swipe)
    // If horizontal movement is more than 50% of vertical, cancel pull-to-refresh
    if (deltaX > Math.abs(deltaY) * 0.5) {
      setTouchStartY(null);
      setTouchStartX(null);
      setPullDistance(0);
      return;
    }

    // Only trigger on downward pull (positive deltaY)
    if (deltaY <= 0) {
      setPullDistance(0);
      return;
    }

    // Apply minimum threshold to prevent accidental triggers
    if (deltaY < MIN_PULL_THRESHOLD) {
      setPullDistance(0);
      return;
    }

    // Calculate pull distance with resistance (diminishing returns)
    const distance = Math.min(deltaY * 0.6, MAX_PULL_DISTANCE);
    setPullDistance(distance);
  }, [touchStartY, touchStartX]);

  const onTouchEnd = useCallback(() => {
    if (pullDistance > PULL_TO_REFRESH_THRESHOLD && !isRefreshing) {
      void onRefresh();
    }
    setPullDistance(0);
    setTouchStartY(null);
    setTouchStartX(null);
  }, [pullDistance, isRefreshing, onRefresh]);

  return {
    pullDistance,
    touchStartY,
    touchStartX,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
