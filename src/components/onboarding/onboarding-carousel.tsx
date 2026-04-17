"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { ScreenWelcome } from "./screen-welcome";
import { ScreenCommunity } from "./screen-community";
import { ScreenTrust } from "./screen-trust";

const SCREENS = [
  { id: 0, Component: ScreenWelcome },
  { id: 1, Component: ScreenCommunity },
  { id: 2, Component: ScreenTrust },
];

const SWIPE_THRESHOLD = 50;

export function OnboardingCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  const setCompleted = useOnboardingStore((s) => s.setCompleted);
  const dragStartX = useRef(0);

  const handleSkip = useCallback(() => {
    setCompleted(true);
    router.replace("/auth/login");
  }, [setCompleted, router]);

  const goNext = useCallback(() => {
    if (currentIndex < SCREENS.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleSkip();
    }
  }, [currentIndex, handleSkip]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const slideWidthPercent = 100 / SCREENS.length;

  return (
    <div className="relative h-full w-full min-h-0 overflow-hidden">
      {/* Skip button — rendered once at the carousel level */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute right-4 z-20 rounded-xl bg-white/20 px-3.5 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/30 active:scale-95"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        Lewati
      </button>

      <motion.div
        className="flex h-full shrink-0"
        style={{
          width: `${SCREENS.length * 100}%`,
        }}
        animate={{ x: `-${currentIndex * slideWidthPercent}%` }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 40,
        }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragStart={(_, info) => {
          dragStartX.current = info.point.x;
        }}
        onDragEnd={(_, info) => {
          const delta = info.point.x - dragStartX.current;
          if (Math.abs(delta) > SWIPE_THRESHOLD) {
            if (delta > 0) {
              goPrev();
            } else {
              goNext();
            }
          }
        }}
      >
        {SCREENS.map(({ id, Component }) => (
          <div
            key={id}
            className="flex h-full flex-shrink-0 items-stretch"
            style={{
              width: `${slideWidthPercent}%`,
              minWidth: 0,
            }}
          >
            <Component
              onNext={goNext}
              onPrev={goPrev}
              currentIndex={currentIndex}
              totalScreens={SCREENS.length}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
