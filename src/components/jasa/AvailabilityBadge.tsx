"use client";

interface AvailabilityBadgeProps {
  is_available: boolean;
  className?: string;
}

/**
 * AvailabilityBadge - Shows the availability status of a service
 *
 * Displays status badges based on status:
 * - AVAILABLE: green badge "Tersedia"
 * - NOT_AVAILABLE: gray badge "Tidak Tersedia"
 *
 * Used in JasaCard and detail views.
 */
export function AvailabilityBadge({
  is_available,
  className = "",
}: AvailabilityBadgeProps) {
  const config = is_available
    ? {
        label: "Tersedia",
        bgColor: "bg-green-500/90",
        textColor: "text-white",
      }
    : {
        label: "Tidak Tersedia",
        bgColor: "bg-gray-500/90",
        textColor: "text-white",
      };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${config.bgColor} ${config.textColor} ${className}`}
      aria-label={config.label}
    >
      {config.label}
    </span>
  );
}
