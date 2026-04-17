/**
 * Landing Page Type Definitions
 *
 * Centralizes all type definitions for the landing page following SOLID principles.
 * Separates API contracts from UI models for better maintainability.
 */

// ─── API Response Types ───────────────────────────────────────────────────────

/**
 * Profile API response structure from /api/profile
 */
export interface ProfileApiResponse {
  fullName?: string;
  profilePictureUrl?: string | null;
  house?: {
    blok_rumah?: string | null;
    name?: string;
  } | null;
  walletBalanceFormatted?: string;
  community?: {
    id: string;
    name: string | null;
  } | null;
}

/**
 * Marketplace category summary from API
 */
export interface MarketplaceCategorySummary {
  id: string;
  icon: string | null;
  title: string;
  description: string | null;
  cheapest: number | null;
  itemCount: number;
}

/**
 * Marketplace summary API response from /api/marketplace/summary
 */
export interface MarketplaceSummaryResponse {
  success: boolean;
  data: {
    UMKM: MarketplaceCategorySummary[];
    JASA: MarketplaceCategorySummary[];
  };
}

/**
 * Single announcement item from API
 */
export interface AnnouncementApiItem {
  id: string;
  title: string;
  excerpt: string | null;
  authorLabel: string;
  isPinned: boolean;
  publishedAt: string;
}

/**
 * Announcements API response from /api/announcements
 */
export interface AnnouncementsApiResponse {
  announcements: AnnouncementApiItem[];
}

// ─── UI Model Types ───────────────────────────────────────────────────────────

/**
 * Header profile display data
 */
export interface HeaderProfile {
  name: string;
  profilePictureUrl: string | null;
  blokRumah: string;
}

/**
 * Community information for cookie storage
 */
export interface CommunityInfo {
  id: string;
  name: string | null;
}

// ─── State Types ──────────────────────────────────────────────────────────────

/**
 * Loading states for different sections
 */
export interface LandingLoadingState {
  profile: boolean;
  marketplace: boolean;
  announcements: boolean;
}

/**
 * Error states for different sections
 */
export interface LandingErrorState {
  profile: string | null;
  marketplace: string | null;
  announcements: string | null;
}

// ─── Configuration Types ──────────────────────────────────────────────────────

/**
 * Configuration for marketplace sections
 */
export interface MarketplaceSection {
  type: 'UMKM' | 'JASA';
  title: string;
  emptyStateConfig: EmptyStateConfig;
}

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
  title: string;
  description: string;
  variant?: 'default' | 'success' | 'info' | 'warning';
}
