/**
 * LandingSection Component
 *
 * Reusable wrapper component for landing page sections.
 * Following SOLID principles:
 * - Single Responsibility: Only handles section layout and structure
 * - Open-Closed: Open for extension via children, closed for modification
 * - Interface Segregation: Clean, minimal props interface
 *
 * Features:
 * - Consistent spacing and padding across all landing sections
 * - Optional title with "view all" link
 * - Semantic HTML with proper accessibility
 * - Flexible content area via children prop
 */

import { ReactNode } from "react";
import Link from "next/link";

// ─── Props Interface ──────────────────────────────────────────────────────────

interface LandingSectionProps {
  /** Section title (optional) */
  title?: string;
  /** Link text for "view all" action (optional) */
  viewAllText?: string;
  /** URL for "view all" link (optional) */
  viewAllHref?: string;
  /** Section content */
  children: ReactNode;
  /** Additional CSS classes for the section wrapper */
  className?: string;
  /** Additional CSS classes for the content area */
  contentClassName?: string;
  /** Custom ID for the section (for accessibility and anchoring) */
  id?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * LandingSection Component
 *
 * Provides consistent section layout for landing page content.
 *
 * @example
 * // Basic section with title
 * <LandingSection title="Featured Items">
 *   <div>Content goes here</div>
 * </LandingSection>
 *
 * @example
 * // Section with "view all" link
 * <LandingSection
 *   title="Marketplace"
 *   viewAllText="Lihat semua"
 *   viewAllHref="/marketplace"
 * >
 *   <MarketplaceGrid />
 * </LandingSection>
 *
 * @example
 * // Section without title (content only)
 * <LandingSection>
 *   <FeatureGrid />
 * </LandingSection>
 */
export function LandingSection({
  title,
  viewAllText = "Lihat semua",
  viewAllHref,
  children,
  className = "",
  contentClassName = "",
  id,
}: LandingSectionProps) {
  const sectionId =
    id ||
    (title ? `section-${title.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  const titleId = title ? `${sectionId}-title` : undefined;

  return (
    <section
      className={`py-4 lg:py-6 ${className}`}
      id={sectionId}
      aria-labelledby={titleId}
    >
      {title && (
        <div         className="mb-3 flex items-center justify-between px-4 lg:px-8">
          <h2
            id={titleId}
            className="text-lg font-bold text-app-title lg:text-xl"
          >
            {title}
          </h2>

          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-sm font-medium text-app-primary transition-opacity hover:opacity-80 active:opacity-60 lg:text-base"
            >
              {viewAllText}
            </Link>
          )}
        </div>
      )}

      <div className={contentClassName || (title ? "px-4 lg:px-8" : "")}>
        {children}
      </div>
    </section>
  );
}
