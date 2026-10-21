/**
 * api-client.ts
 *
 * A thin wrapper around the native `fetch` that dispatches a custom DOM event
 * (`auth:unauthorized`) whenever a response comes back with HTTP 401.
 *
 * WHY THIS EXISTS
 * ───────────────
 * The previous approach in AuthInterceptor.tsx monkey-patched `window.fetch`
 * globally, which is fragile (double-mount risk, conflicts with React 18
 * concurrent features, hard to debug). This module replaces that pattern:
 *
 *  • All authenticated API calls go through `apiFetch` instead of raw `fetch`.
 *  • `AuthInterceptor` (or any component) listens for `auth:unauthorized` and
 *    reacts (e.g. clears session state, redirects to login).
 *  • Callers still receive the original Response so they can read the body,
 *    show error messages, etc.
 *
 * USAGE
 * ─────
 * import { apiFetch } from "@/lib/api-client";
 *
 * const res = await apiFetch("/api/profile");
 * if (res.ok) { ... }
 *
 * The function signature is identical to the native `fetch`, so it is a
 * drop-in replacement at every call-site.
 */

/** Custom event name dispatched when any API call returns HTTP 401. */
export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized" as const;

/**
 * Detail payload carried by the `auth:unauthorized` CustomEvent.
 * `url` is the request URL string so listeners can decide whether to act
 * (e.g. suppress the redirect when the 401 came from a login endpoint).
 */
export interface AuthUnauthorizedDetail {
  url: string;
}

/**
 * Dispatch `auth:unauthorized` on `window` (browser only).
 * Safe to call in SSR — the guard prevents any window access on the server.
 */
function dispatchUnauthorized(url: string): void {
  if (typeof window === "undefined") return;
  const detail: AuthUnauthorizedDetail = { url };
  window.dispatchEvent(
    new CustomEvent<AuthUnauthorizedDetail>(AUTH_UNAUTHORIZED_EVENT, {
      detail,
      bubbles: false,
      cancelable: false,
    }),
  );
}

/**
 * Normalise a RequestInfo | URL value into a plain string for inspection
 * (e.g. to check whether the URL is a login/auth endpoint).
 */
function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  // Request object
  return input.url;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Response cache
 *
 * A handful of GET endpoints are requested by nearly every page and change
 * rarely: the admin identity probe and the profile. Without a cache every
 * navigation to a new page re-asks the server for data it already had, which
 * on a mobile connection is a visible spinner.
 *
 * The cache is intentionally tiny and explicit:
 *   • only the URLs listed in CACHEABLE_GETS are cached,
 *   • entries are short-lived (seconds, not minutes),
 *   • any write (POST/PATCH/PUT/DELETE) to the same path drops the entry,
 *   • a 401 drops everything, because the session is gone.
 * ────────────────────────────────────────────────────────────────────────── */

interface CacheRule {
  /** Matches the request URL (without the query string). */
  path: string;
  /** How long a cached response may be reused, in milliseconds. */
  ttlMs: number;
}

const CACHEABLE_GETS: CacheRule[] = [
  { path: "/api/admin/me", ttlMs: 30_000 },
  { path: "/api/admin/stats", ttlMs: 15_000 },
  { path: "/api/profile", ttlMs: 20_000 },
];

interface CacheEntry {
  status: number;
  body: string;
  storedAt: number;
}

const responseCache = new Map<string, CacheEntry>();
const inflightGets = new Map<string, Promise<CacheEntry>>();

function toCacheKey(url: string): string {
  const path = url.split("?")[0];
  // Absolute URLs (rare in this app) are keyed by their pathname too.
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      return new URL(path).pathname;
    } catch {
      return path;
    }
  }
  return path;
}

function findCacheRule(url: string): CacheRule | undefined {
  const key = toCacheKey(url);
  return CACHEABLE_GETS.find((rule) => rule.path === key);
}

function buildJsonResponse(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Drop a cached response (used after writes and on sign-out). */
export function invalidateApiCache(path?: string): void {
  if (path) {
    responseCache.delete(toCacheKey(path));
    return;
  }
  responseCache.clear();
}


/**
 * Drop-in replacement for `fetch` that:
 *  1. Forwards the call to the native fetch unchanged.
 *  2. Dispatches `auth:unauthorized` on HTTP 401 so that any mounted
 *     AuthInterceptor can clear the session and redirect to login.
 *  3. Always returns the original Response — including on 401 — so callers
 *     can still read the body for error messages (e.g. "PIN salah").
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = resolveUrl(input);
  const method = (init?.method ?? "GET").toUpperCase();
  const rule = findCacheRule(url);
  // An explicit "no-store" request (manual refresh) must always hit the
  // server, and must not overwrite a fresher cached entry either.
  const bypassCache =
    init?.cache === "no-store" || init?.cache === "reload" || method !== "GET";

  // Writes invalidate the cached reads: a mutation can change the profile,
  // the role set, or both, so the next read must hit the server again.
  if (method !== "GET") {
    invalidateApiCache();
  }

  if (rule && !bypassCache) {
    const key = toCacheKey(url);
    const cached = responseCache.get(key);
    if (cached && Date.now() - cached.storedAt < rule.ttlMs) {
      return buildJsonResponse(cached.status, cached.body);
    }

    let pending = inflightGets.get(key);
    if (!pending) {
      pending = fetch(input, init)
        .then(async (response) => {
          const body = await response.text();
          const entry: CacheEntry = {
            status: response.status,
            body,
            storedAt: Date.now(),
          };
          if (response.ok) {
            responseCache.set(key, entry);
          } else if (response.status === 401) {
            responseCache.clear();
          }
          return entry;
        })
        .finally(() => {
          inflightGets.delete(key);
        });
      inflightGets.set(key, pending);
    }

    const entry = await pending;
    if (entry.status === 401) {
      dispatchUnauthorized(url);
    }
    return buildJsonResponse(entry.status, entry.body);
  }

  const response = await fetch(input, init);

  if (response.status === 401) {
    dispatchUnauthorized(url);
  }

  return response;
}
