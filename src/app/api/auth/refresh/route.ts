import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie, setSessionCookie, extendSessionExpiry } from "@/lib/auth/session";
import { signSessionToken } from "@/lib/auth/jwt";

/**
 * POST /api/auth/refresh
 *
 * Silent keep-alive used by AuthInterceptor so a logged-in user is never
 * kicked to /auth/login on a returning visit (esp. mobile / PWA / webview).
 *
 * Behaviour:
 *  • Valid session cookie present  → extend the DB session expiry + re-issue
 *    the `wd_session` cookie (Set-Cookie on this response) → 200.
 *  • No / invalid cookie           → 401 (AuthInterceptor then redirects to
 *    login, same as any other protected endpoint).
 *
 * This endpoint OWNS a writable NextResponse, so the re-issued cookie actually
 * reaches the browser — unlike the old detached fire-and-forget renewal in
 * session.ts which silently lost the Set-Cookie.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Re-arm the SAME DB session row to +365d (await so failures surface).
  await extendSessionExpiry(session.sessionId, session.userId);

  // Re-issue the cookie with a fresh +365d JWT for the SAME session id.
  const jwt = await signSessionToken(session.sessionId, session.userId);
  await setSessionCookie(jwt);

  return NextResponse.json({ success: true });
}
