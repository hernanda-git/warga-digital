import { NextResponse } from "next/server";
import { getSessionFromCookie, clearSessionCookie, destroySession } from "@/lib/auth/session";

/**
 * POST /api/auth/logout
 * Destroys server session and clears session cookie.
 */
export async function POST() {
  try {
    // Opt in so pending users can cleanly destroy their DB session row too.
    const session = await getSessionFromCookie({ allowPending: true });
    if (session) {
      await destroySession(session.sessionId);
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (err) {
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}
