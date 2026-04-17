/**
 * Landing Page API Service
 *
 * Service layer for all landing page API interactions.
 * Following SOLID principles:
 * - Single Responsibility: Each function handles one specific API call
 * - Dependency Inversion: Depends on apiFetch abstraction, not fetch directly
 * - Interface Segregation: Clean, focused function signatures
 *
 * This layer separates API concerns from UI logic, making it easier to:
 * - Test API calls in isolation
 * - Mock responses for testing
 * - Change API implementations without affecting UI
 * - Add error handling, retry logic, caching in one place
 */

import { apiFetch } from '@/lib/api-client';
import { LANDING_API_ENDPOINTS } from '@/config/landing';
import type {
  ProfileApiResponse,
  MarketplaceSummaryResponse,
  AnnouncementsApiResponse,
} from '@/types/landing';

// ─── Result Type for Better Error Handling ────────────────────────────────────

/**
 * Generic result type for API operations
 * Inspired by Rust's Result type for explicit error handling
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Profile Service ──────────────────────────────────────────────────────────

/**
 * Fetches user profile data including wallet balance and community info
 *
 * @returns Profile data or error message
 *
 * @example
 * const result = await fetchProfile();
 * if (result.success) {
 *   console.log(result.data.fullName);
 * } else {
 *   console.error(result.error);
 * }
 */
export async function fetchProfile(): Promise<ApiResult<ProfileApiResponse>> {
  try {
    const response = await apiFetch(LANDING_API_ENDPOINTS.PROFILE);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch profile: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json() as ProfileApiResponse;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching profile',
    };
  }
}

// ─── Marketplace Service ──────────────────────────────────────────────────────

/**
 * Fetches marketplace summary including UMKM and JASA categories
 *
 * @returns Marketplace data grouped by type (UMKM/JASA) or error message
 *
 * @example
 * const result = await fetchMarketplaceSummary();
 * if (result.success) {
 *   const umkmItems = result.data.data.UMKM;
 *   const jasaItems = result.data.data.JASA;
 * }
 */
export async function fetchMarketplaceSummary(): Promise<
  ApiResult<MarketplaceSummaryResponse>
> {
  try {
    const response = await apiFetch(LANDING_API_ENDPOINTS.MARKETPLACE_SUMMARY);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch marketplace: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json() as MarketplaceSummaryResponse;

    // Validate the response structure
    if (!data.success || !data.data) {
      return {
        success: false,
        error: 'Invalid marketplace response structure',
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching marketplace',
    };
  }
}

// ─── Announcements Service ────────────────────────────────────────────────────

/**
 * Fetches community announcements (Info Warga)
 *
 * @returns List of announcements or error message
 *
 * @example
 * const result = await fetchAnnouncements();
 * if (result.success) {
 *   result.data.announcements.forEach(announcement => {
 *     console.log(announcement.title);
 *   });
 * }
 */
export async function fetchAnnouncements(): Promise<
  ApiResult<AnnouncementsApiResponse>
> {
  try {
    const response = await apiFetch(LANDING_API_ENDPOINTS.ANNOUNCEMENTS);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch announcements: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json() as AnnouncementsApiResponse;

    // Ensure announcements array exists
    if (!Array.isArray(data.announcements)) {
      return {
        success: false,
        error: 'Invalid announcements response structure',
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error fetching announcements',
    };
  }
}

// ─── Batch Operations (Future Enhancement) ────────────────────────────────────

/**
 * Fetches all landing page data in parallel
 * Useful for initial page load optimization
 *
 * @returns Object containing all API results
 *
 * @example
 * const { profile, marketplace, announcements } = await fetchAllLandingData();
 * // Handle each result independently
 */
export async function fetchAllLandingData() {
  const [profile, marketplace, announcements] = await Promise.allSettled([
    fetchProfile(),
    fetchMarketplaceSummary(),
    fetchAnnouncements(),
  ]);

  return {
    profile: profile.status === 'fulfilled' ? profile.value : { success: false as const, error: 'Request failed' },
    marketplace: marketplace.status === 'fulfilled' ? marketplace.value : { success: false as const, error: 'Request failed' },
    announcements: announcements.status === 'fulfilled' ? announcements.value : { success: false as const, error: 'Request failed' },
  };
}
