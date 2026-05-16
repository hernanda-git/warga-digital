"use client";

import { OnboardingCarousel } from "@/components/onboarding/onboarding-carousel";

export default function OnboardingPage() {
  return (
    <div className="lg:max-w-2xl lg:mx-auto lg:w-full lg:px-6 lg:py-6 h-full">
      <div
        className="h-full min-h-0 w-full min-w-0 overflow-hidden bg-app-surface-alt"
        style={{
          background:
            "linear-gradient(180deg, var(--color-surface-gradient-start) 0%, var(--color-surface-gradient-mid) 40%, var(--color-surface-gradient-end) 100%)",
        }}
      >
        <OnboardingCarousel />
      </div>
    </div>
  );
}
