import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { signSessionToken, verifySessionToken } from "./jwt";
import { hashSha256 } from "@/lib/crypto";
import { uuidv7 } from "uuidv7";

const SESSION_COOKIE = "wd_session";
const SESSION_MAX_AGE = 365 * 24 * 60 * 60; // 365 days in seconds

const LAST_ACTIVE_SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const SESSION_RENEW_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // renew if < 30 days remaining

function hashToken(token: string): string {
  return hashSha256(token);
}

/**
 * Cookie attributes for the wd_session cookie.
 *
 * Mobile durability is the priority: iOS Safari (ITP), Android Chrome,
 * PWA home-screen launches and in-app webviews routinely drop a
 * `SameSite=Lax` cookie across an app/browser restart — that is what was
 * kicking users back to /auth/login the next day.
 *
 *  • Production : SameSite=None + Secure + Partitioned  → survives cross-site
 *                / webview / PWA contexts.
 *  • Development: SameSite=Lax (Secure cannot be set over http://localhost,
 *                and SameSite=None REQUIRES Secure, so lax is the only option
 *                that keeps login working on http).
 */
export function buildCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "none";
  maxAge: number;
  path: string;
  partitioned?: boolean;
} {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    return {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: SESSION_MAX_AGE,
      path: "/",
      partitioned: true,
    };
  }
  return {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  };
}

export async function createSession(userId: string): Promise<string> {
  const supabase = createServerClient();
  const sessionId = uuidv7();
  const rawToken = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  const now = new Date().toISOString();

  const { error } = await supabase.from("sessions").insert({
    id: sessionId,
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    last_active_at: now,
  });

  if (error) {
    throw new Error("Failed to create session");
  }

  await supabase.from("users").update({ last_active_at: now }).eq("id", userId);

  const jwt = await signSessionToken(sessionId, userId);
  return jwt;
}

/** Set the session cookie on the active cookie store (Server Component / Route Handler). */
export async function setSessionCookie(jwt: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, jwt, buildCookieOptions());
}

export async function getSessionFromCookie(): Promise<{
  userId: string;
  sessionId: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const supabase = createServerClient();
  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("id, user_id, expires_at, last_active_at")
    .eq("id", payload.sessionId)
    .maybeSingle();

  if (fetchError) {
    return null;
  }

  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  // NOTE: cookie re-issuance is intentionally NOT done here. This function is
  // called on every request (incl. middleware + RSC) where the cookie store is
  // read-only and a detached write would never reach the response. Sliding
  // renewal + cookie re-issue happens in the dedicated /api/auth/refresh
  // endpoint (see src/app/api/auth/refresh/route.ts), driven by the client
  // keep-alive in AuthInterceptor. That path owns a writable NextResponse and
  // correctly persists the refreshed Set-Cookie.
  return { userId: payload.userId, sessionId: payload.sessionId };
}

/**
 * Sliding-expiry extension used by the refresh endpoint. Re-arms the DB
 * session expiry to +365d and updates last_active_at. Awaited (unlike the
 * old fire-and-forget block) so failures are observable.
 */
export async function extendSessionExpiry(sessionId: string, userId: string): Promise<void> {
  const supabase = createServerClient();
  const newExpiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  const now = new Date().toISOString();
  await supabase
    .from("sessions")
    .update({ last_active_at: now, expires_at: newExpiresAt.toISOString() })
    .eq("id", sessionId);
  await supabase.from("users").update({ last_active_at: now }).eq("id", userId);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function destroySession(sessionId: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) {
  }
}

export { SESSION_COOKIE, SESSION_MAX_AGE };
