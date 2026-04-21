/**
 * Landing Page Data Transformers
 *
 * Pure functions for transforming API responses into UI models.
 * Following SOLID principles:
 * - Single Responsibility: Each function transforms one specific data type
 * - Pure Functions: No side effects, predictable outputs for given inputs
 * - Open-Closed: Easy to extend with new transformers without modifying existing ones
 *
 * These transformers serve as an anti-corruption layer between API contracts
 * and UI components, allowing either side to evolve independently.
 */

import { formatRupiah } from "@/lib/constants/marketplace-catalog";
import { UI_CONFIG } from "@/config/landing";
import type {
  ProfileApiResponse,
  HeaderProfile,
  MarketplaceCategorySummary,
  AnnouncementApiItem,
  CommunityInfo,
} from "@/types/landing";
import type { HorizontalCardItem } from "@/components/landing/HorizontalCardStrip";
import type { ResidentPostItem } from "@/components/landing/ResidentPostsSection";

// ─── Profile Transformers ─────────────────────────────────────────────────────

/**
 * Builds the "Blok - N2" display string from the house object.
 *
 * Business Rules:
 * - If blok_rumah exists, format as "Blok - {value}"
 * - Otherwise, return default placeholder
 *
 * @param house - House data from API (may be null/undefined)
 * @returns Formatted block label string
 *
 * @example
 * buildBlokLabel({ blok_rumah: 'A-12' }) // => "Blok - A-12"
 * buildBlokLabel({ blok_rumah: null })   // => "Blok —"
 * buildBlokLabel(null)                    // => "Blok —"
 */
export function buildBlokLabel(
  house: { blok_rumah?: string | null; name?: string } | null | undefined,
): string {
  if (house?.blok_rumah) {
    return `Blok - ${house.blok_rumah}`;
  }
  return UI_CONFIG.DEFAULT_BLOK_LABEL;
}



/**
 * Transforms API profile response into header profile UI model
 *
 * @param profile - Raw profile data from API
 * @param fallbackName - Optional fallback name if API doesn't provide one
 * @returns Header profile display data
 *
 * @example
 * const headerProfile = transformProfileToHeader(apiResponse, 'John Doe');
 */
export function transformProfileToHeader(
  profile: ProfileApiResponse,
  fallbackName?: string,
): HeaderProfile {
  return {
    name: profile.fullName ?? fallbackName ?? UI_CONFIG.DEFAULT_USER_NAME,
    profilePictureUrl: profile.profilePictureUrl ?? null,
    blokRumah: buildBlokLabel(profile.house),
  };
}

/**
 * Extracts community information from profile response
 *
 * @param profile - Raw profile data from API
 * @returns Community info or null if not available
 */
export function extractCommunityInfo(
  profile: ProfileApiResponse,
): CommunityInfo | null {
  if (!profile.community) {
    return null;
  }

  return {
    id: profile.community.id,
    name: profile.community.name,
  };
}

/**
 * Extracts wallet balance from profile response
 *
 * @param profile - Raw profile data from API
 * @returns Formatted wallet balance string
 */
export function extractWalletBalance(profile: ProfileApiResponse): string {
  return profile.walletBalanceFormatted ?? UI_CONFIG.DEFAULT_WALLET_BALANCE;
}

// ─── Marketplace Transformers ─────────────────────────────────────────────────

/**
 * Transforms a single marketplace category into UI card item
 *
 * Business Rules:
 * - Use cheapest price as description if available
 * - Otherwise fall back to category description
 * - Icon is preserved for UI component to resolve
 *
 * @param category - Marketplace category summary from API
 * @returns UI card item for horizontal strip
 */
export function transformCategoryToCard(
  category: MarketplaceCategorySummary,
): HorizontalCardItem {
  const description =
    category.cheapest !== null && category.cheapest !== undefined
      ? `Mulai ${formatRupiah(category.cheapest)}`
      : (category.description ?? "");

  return {
    id: category.id,
    icon: category.icon ?? "",
    title: category.title,
    description,
  };
}

/**
 * Transforms marketplace categories into horizontal card items
 *
 * Business Rules:
 * - Only include categories with at least one active item
 * - Preserve order from API
 * - Transform pricing information into readable format
 *
 * @param categories - Array of category summaries from API
 * @returns Filtered and transformed card items ready for display
 *
 * @example
 * const umkmCards = transformCategoriesToCards(apiResponse.data.UMKM);
 */
export function transformCategoriesToCards(
  categories: MarketplaceCategorySummary[],
): HorizontalCardItem[] {
  return categories
    .filter((category) => category.itemCount > 0)
    .map(transformCategoryToCard);
}

// ─── Announcement Transformers ────────────────────────────────────────────────

/**
 * Transforms a single announcement API item into UI post item
 *
 * @param announcement - Announcement data from API
 * @returns UI post item for resident posts section
 *
 * @example
 * const post = transformAnnouncementToPost(apiAnnouncement);
 */
export function transformAnnouncementToPost(
  announcement: AnnouncementApiItem,
): ResidentPostItem {
  return {
    id: announcement.id,
    title: announcement.title,
    excerpt: announcement.excerpt ?? "",
    author: announcement.authorLabel,
  };
}

/**
 * Transforms array of announcements into UI post items
 *
 * @param announcements - Array of announcements from API
 * @returns Array of UI post items
 *
 * @example
 * const posts = transformAnnouncementsToPosts(apiResponse.announcements);
 */
export function transformAnnouncementsToPosts(
  announcements: AnnouncementApiItem[],
): ResidentPostItem[] {
  return announcements.map(transformAnnouncementToPost);
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

/**
 * Checks if profile data is valid and complete enough to display
 *
 * @param profile - Profile data to validate
 * @returns true if profile has minimum required data
 */
export function isValidProfile(
  profile: HeaderProfile | null,
): profile is HeaderProfile {
  return (
    profile !== null &&
    typeof profile.name === "string" &&
    profile.name.length > 0
  );
}

/**
 * Checks if marketplace data has any displayable content
 *
 * @param items - Marketplace card items
 * @returns true if there are items to display
 */
export function hasMarketplaceContent(items: HorizontalCardItem[]): boolean {
  return items.length > 0;
}

/**
 * Checks if announcements data has any displayable content
 *
 * @param items - Announcement post items
 * @returns true if there are announcements to display
 */
export function hasAnnouncementContent(items: ResidentPostItem[]): boolean {
  return items.length > 0;
}
