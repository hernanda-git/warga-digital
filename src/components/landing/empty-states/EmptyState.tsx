/**
 * EmptyState Component
 *
 * Reusable component for displaying empty state messages.
 * Following SOLID principles:
 * - Single Responsibility: Only renders empty states
 * - Open-Closed: Open for extension via variants, closed for modification
 * - Liskov Substitution: Can be used anywhere an empty state is needed
 *
 * Features:
 * - Multiple variants (default, info, success, warning)
 * - Consistent styling across the app
 * - Accessible with proper semantic HTML
 * - Customizable with optional icon and action button
 */

import { ReactNode } from 'react';

// ─── Props Interface ──────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** Main title text */
  title: string;
  /** Description/helper text */
  description: string;
  /** Visual variant that determines colors */
  variant?: 'default' | 'info' | 'success' | 'warning';
  /** Optional icon to display */
  icon?: ReactNode;
  /** Optional action button/link */
  action?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ─── Variant Styles ───────────────────────────────────────────────────────────

const VARIANT_STYLES = {
  default: {
    container: 'border-app-primary/20 bg-app-primary-muted/30',
    title: 'text-app-title',
    description: 'text-app-body-muted',
  },
  info: {
    container: 'border-app-primary/20 bg-app-primary-muted/30',
    title: 'text-app-title',
    description: 'text-app-body-muted',
  },
  success: {
    container: 'border-emerald-200/50 bg-emerald-50/50',
    title: 'text-emerald-800',
    description: 'text-emerald-700',
  },
  warning: {
    container: 'border-amber-200/50 bg-amber-50/50',
    title: 'text-amber-800',
    description: 'text-amber-700',
  },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * EmptyState Component
 *
 * Displays a consistent empty state message with optional icon and action.
 *
 * @example
 * // Basic usage
 * <EmptyState
 *   title="No items found"
 *   description="Try adjusting your filters."
 * />
 *
 * @example
 * // With variant and action
 * <EmptyState
 *   variant="success"
 *   title="All done!"
 *   description="You've completed all tasks."
 *   action={<Button>Add More</Button>}
 * />
 */
export function EmptyState({
  title,
  description,
  variant = 'default',
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={`rounded-xl border border-dashed ${styles.container} p-6 flex flex-col items-center justify-center text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div className="mb-3" aria-hidden="true">
          {icon}
        </div>
      )}

      <p className={`text-[14px] font-semibold mb-1 ${styles.title}`}>
        {title}
      </p>

      <p className={`text-[12px] leading-relaxed ${styles.description}`}>
        {description}
      </p>

      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
