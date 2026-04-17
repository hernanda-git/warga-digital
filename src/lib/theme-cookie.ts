/**

 * Client-side cookie for theme persistence across pages.

 * Stores the user's selected theme ID so it persists across sessions

 * and is available immediately on page load (before Zustand hydrates).

 *

 * This works alongside the Zustand appearance store — the store reads

 * from localStorage, while this cookie provides an additional layer

 * of persistence.

 */

const THEME_COOKIE_NAME = "wd_theme";

const MAX_AGE_DAYS = 365; // 1 year — theme preference should be long-lived

/**

 * Get the theme ID from the cookie (client-side only).

 * Returns null if cookie doesn't exist or is invalid.

 */

export function getThemeCookie(): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(
      "(?:^|; )" +
        THEME_COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "=([^;]*)",
    ),
  );

  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**

 * Set the theme ID cookie (client-side only).

 * Call this whenever the user selects a new theme.

 */

export function setThemeCookie(themeId: string): void {
  if (typeof document === "undefined") return;

  const value = encodeURIComponent(themeId);

  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;

  document.cookie = `${THEME_COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

/**

 * Clear the theme cookie (client-side only).

 * Useful for resetting to default.

 */

export function clearThemeCookie(): void {
  if (typeof document === "undefined") return;

  document.cookie = `${THEME_COOKIE_NAME}=; path=/; max-age=0`;
}
