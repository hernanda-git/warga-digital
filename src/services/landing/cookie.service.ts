/**
 * Landing Page Cookie Service
 *
 * Handles cookie management for landing page data (community info).
 * Following SOLID principles:
 * - Single Responsibility: Only manages cookies for landing page
 * - Dependency Inversion: Abstracts cookie implementation details
 *
 * This service provides a clean API for setting and clearing cookies,
 * making it easier to:
 * - Test cookie logic in isolation
 * - Change cookie storage strategy (e.g., to localStorage)
 * - Ensure consistent cookie formatting
 * - Handle SSR safely
 */

import { COOKIE_CONFIG, FEATURE_FLAGS } from '@/config/landing';
import type { CommunityInfo } from '@/types/landing';

// ─── Cookie Utilities ─────────────────────────────────────────────────────────

/**
 * Checks if we're in a browser environment (not SSR)
 * @returns true if document and cookies are available
 */
function isBrowser(): boolean {
  return typeof document !== 'undefined';
}

/**
 * Formats a cookie string with all necessary attributes
 *
 * @param name - Cookie name
 * @param value - Cookie value (will be URI encoded)
 * @param maxAge - Max age in seconds (0 to delete)
 * @param path - Cookie path
 * @returns Formatted cookie string
 */
function formatCookie(
  name: string,
  value: string,
  maxAge: number,
  path: string,
): string {
  const encodedValue = encodeURIComponent(value);
  return `${name}=${encodedValue}; path=${path}; max-age=${maxAge}`;
}

/**
 * Sets a single cookie
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param maxAge - Max age in seconds
 * @param path - Cookie path
 */
function setCookie(
  name: string,
  value: string,
  maxAge: number,
  path: string,
): void {
  if (!isBrowser()) {
    return;
  }

  document.cookie = formatCookie(name, value, maxAge, path);
}

/**
 * Clears a single cookie by setting max-age to 0
 *
 * @param name - Cookie name
 * @param path - Cookie path
 */
function clearCookie(name: string, path: string): void {
  if (!isBrowser()) {
    return;
  }

  document.cookie = formatCookie(name, '', 0, path);
}

// ─── Community Cookie Management ──────────────────────────────────────────────

/**
 * Saves community information to cookies
 *
 * This allows the community context to persist across page reloads
 * and be available for API calls that need community filtering.
 *
 * @param community - Community information to save
 *
 * @example
 * saveCommunityToCookies({
 *   id: '123',
 *   name: 'RT 03 RW 02'
 * });
 */
export function saveCommunityToCookies(community: CommunityInfo): void {
  if (!FEATURE_FLAGS.ENABLE_COMMUNITY_COOKIES) {
    return;
  }

  const { COMMUNITY_ID, COMMUNITY_NAME } = COOKIE_CONFIG;

  setCookie(
    COMMUNITY_ID.key,
    community.id,
    COMMUNITY_ID.maxAge,
    COMMUNITY_ID.path,
  );

  setCookie(
    COMMUNITY_NAME.key,
    community.name ?? '',
    COMMUNITY_NAME.maxAge,
    COMMUNITY_NAME.path,
  );
}

/**
 * Clears community information from cookies
 *
 * This should be called when:
 * - User logs out
 * - Profile has no community association
 * - User switches communities
 *
 * @example
 * clearCommunityCookies();
 */
export function clearCommunityCookies(): void {
  if (!FEATURE_FLAGS.ENABLE_COMMUNITY_COOKIES) {
    return;
  }

  const { COMMUNITY_ID, COMMUNITY_NAME } = COOKIE_CONFIG;

  clearCookie(COMMUNITY_ID.key, COMMUNITY_ID.path);
  clearCookie(COMMUNITY_NAME.key, COMMUNITY_NAME.path);
}

/**
 * Updates community cookies based on community info
 *
 * If community exists, saves it to cookies.
 * If community is null, clears the cookies.
 *
 * This is a convenience function that handles both cases.
 *
 * @param community - Community info or null
 *
 * @example
 * // After fetching profile
 * updateCommunityCookies(profile.community);
 */
export function updateCommunityCookies(community: CommunityInfo | null): void {
  if (community) {
    saveCommunityToCookies(community);
  } else {
    clearCommunityCookies();
  }
}

// ─── Future Enhancements ──────────────────────────────────────────────────────

/**
 * Reads a cookie value by name
 *
 * @param name - Cookie name to read
 * @returns Cookie value or null if not found
 *
 * Note: Not currently used but provided for future needs
 */
export function readCookie(name: string): string | null {
  if (!isBrowser()) {
    return null;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue ? decodeURIComponent(cookieValue) : null;
  }

  return null;
}

/**
 * Reads community information from cookies
 *
 * @returns Community info if cookies exist, null otherwise
 *
 * Note: Not currently used but provided for future needs
 */
export function readCommunityFromCookies(): CommunityInfo | null {
  const id = readCookie(COOKIE_CONFIG.COMMUNITY_ID.key);
  const name = readCookie(COOKIE_CONFIG.COMMUNITY_NAME.key);

  if (id) {
    return {
      id,
      name: name || null,
    };
  }

  return null;
}
