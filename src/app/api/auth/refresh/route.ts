import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie, setSessionCookie, extendSessionExpiry } from "@/lib/auth/session";
import { signSessionToken } from "@/lib/auth/jwt";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";

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

  // Resolve approval authoritatively so a refreshed JWT never upgrades a
  // still-pending user (or keeps a rejected user alive — reject deletes the
  // DB session row, so getSessionFromCookie already returned null there).
  // No tenant row (pre-existing edge account): preserve the incoming claim
  // instead of changing the account's fate here; API gates decide access.
  const supabase = createServerClient();
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("status")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("user_id", session.userId)
    .maybeSingle();
  const approved = tenantUser ? tenantUser.status === "ACTIVE" : session.approved;

  // Re-issue the cookie with a fresh +365d JWT for the SAME session id.
  const jwt = await signSessionToken(session.sessionId, session.userId, approved);
  await setSessionCookie(jwt);

  return NextResponse.json({ success: true, approved });
}
