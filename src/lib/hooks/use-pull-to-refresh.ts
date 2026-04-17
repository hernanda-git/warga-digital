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
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

/**
 * Hook for handling pull-to-refresh functionality
 */
export function usePullToRefresh({
  onRefresh,
  isRefreshing,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, details")) return;
    setTouchStartY(e.touches[0].clientY);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, details")) return;
    if (touchStartY == null) return;

    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop > 0) {
      setTouchStartY(null);
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - touchStartY);
    setPullDistance(Math.min(distance, MAX_PULL_DISTANCE));
  }, [touchStartY]);

  const onTouchEnd = useCallback(() => {
    if (pullDistance > PULL_TO_REFRESH_THRESHOLD && !isRefreshing) {
      void onRefresh();
    }
    setPullDistance(0);
    setTouchStartY(null);
  }, [pullDistance, isRefreshing, onRefresh]);

  return {
    pullDistance,
    touchStartY,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
