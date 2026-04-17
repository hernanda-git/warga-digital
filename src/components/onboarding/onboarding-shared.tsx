"use client";

import { DotIndicators } from "@/components/ui";

export interface OnboardingScreenProps {
  onNext?: () => void;
  onPrev?: () => void;
  currentIndex: number;
  totalScreens: number;
}
