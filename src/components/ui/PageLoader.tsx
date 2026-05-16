interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = "Memuat..." }: PageLoaderProps) {
  return (
    <div
      className="flex h-full min-h-[inherit] w-full flex-col items-center justify-center bg-app-surface-alt px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Animated spinner — layered circles in app-green palette */}
        <div className="relative h-16 w-16" role="status" aria-label="Memuat">
          {/* Outer track ring */}
          <div
            className="absolute inset-0 rounded-full border-[3px] border-[var(--color-indicator-inactive)] opacity-40"
            aria-hidden
          />
          {/* Middle ring — primary spinner */}
          <div
            className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent"
            style={{
              borderTopColor: "var(--color-primary)",
              borderRightColor: "var(--color-primary-muted)",
            }}
            aria-hidden
          />
          {/* Inner ring — reverse spinner for visual richness */}
          <div
            className="absolute inset-[6px] animate-spin rounded-full border-[3px] border-transparent"
            style={{
              animationDirection: "reverse",
              animationDuration: "0.9s",
              borderBottomColor: "var(--color-primary-hover)",
              borderLeftColor: "var(--color-primary)",
            }}
            aria-hidden
          />
          {/* Center dot */}
          <div
            className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "var(--color-primary)" }}
            aria-hidden
          />
        </div>
        <p className="text-sm font-semibold text-app-body-muted tracking-wide">
          {message}
        </p>
      </div>
    </div>
  );
}
