import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  getSessionFromCookie,
  createSession,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
} from "@/lib/auth/session";
import { getHouseOccupancy, toApprovalCase } from "@/lib/auth/registration-approval";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";

/**
 * GET /api/auth/status
 *
 * Polled by the /pending waiting room. Reports the registration approval
 * state of the current session user and heals stale JWT claims:
 *
 * - approved → rotates the cookie to a fresh approved JWT (fixes claims
 *   issued while the account was still pending) and deletes the old row.
 * - pending  → returns the case (FIRST_OCCUPANT/JOIN), house block, and
 *   request time for display. No cookie change.
 * - rejected → deletes the session, clears the cookie. The client must
 *   send the user back to login.
 */
export async function GET() {
  // Opt in: this endpoint exists precisely to serve pending sessions.
  const session = await getSessionFromCookie({ allowPending: true });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: user } = await supabase
    .from("users")
    .select("status")
    .eq("id", session.userId)
    .maybeSingle();

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("status")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("user_id", session.userId)
    .maybeSingle();

  // ── Rejected ─────────────────────────────────────────────────────────────
  if (user?.status === "REJECTED" || tenantUser?.status === "REJECTED") {
    await destroySession(session.sessionId);
    await clearSessionCookie();
    return NextResponse.json({ status: "rejected" });
  }

  // ── Approved ─────────────────────────────────────────────────────────────
  // Pre-existing edge accounts without a tenant row keep today's behaviour.
  if (tenantUser?.status === "ACTIVE" || (!tenantUser && user?.status === "ACTIVE")) {
    const jwt = await createSession(session.userId, true);
    await destroySession(session.sessionId);
    await setSessionCookie(jwt);
    return NextResponse.json({ status: "approved" });
  }

  // ── Pending ──────────────────────────────────────────────────────────────
  const { data: request } = await supabase
    .from("house_join_requests")
    .select("id, house_id, created_at")
    .eq("requester_user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let approvalCase: "FIRST_OCCUPANT" | "JOIN" = "JOIN";
  let blokRumah: string | null = null;
  let requestedAt: string | null = null;

  if (request) {
    requestedAt = request.created_at ?? null;
    const { data: house } = await supabase
      .from("houses")
      .select("id, blok_rumah")
      .eq("id", request.house_id)
      .maybeSingle();
    blokRumah = house?.blok_rumah ?? null;
    if (house) {
      const occupancy = await getHouseOccupancy(supabase, DEFAULT_TENANT_ID, house.id);
      approvalCase = toApprovalCase(occupancy);
    }
  }

  return NextResponse.json({
    status: "pending",
    approvalCase,
    blokRumah,
    requestedAt,
  });
}
