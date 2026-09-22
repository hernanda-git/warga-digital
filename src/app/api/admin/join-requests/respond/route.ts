import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";
import {
  approveRegistrationRequest,
  rejectRegistrationRequest,
} from "@/lib/auth/registration-approval";

/**
 * POST /api/admin/join-requests/respond
 * Body: { requestId: string, action: 'approve' | 'reject' }
 *
 * Admin can approve ANY pending request: JOIN (head of household did not act)
 * and FIRST_OCCUPANT (empty house — admin-only by design).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const requestId = body?.requestId;
    const action = body?.action;

    if (!requestId || typeof requestId !== "string" || !requestId.trim()) {
      return NextResponse.json(
        { error: "requestId wajib diisi" },
        { status: 400 },
      );
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action harus 'approve' atau 'reject'" },
        { status: 400 },
      );
    }

    const { data: joinRequest, error: joinReqErr } = await supabase
      .from("house_join_requests")
      .select("id, house_id, requester_user_id, status")
      .eq("id", requestId)
      .single();

    if (joinReqErr || !joinRequest) {
      return NextResponse.json(
        { error: "Permintaan tidak ditemukan" },
        { status: 404 },
      );
    }

    if (joinRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Permintaan sudah ditanggapi" },
        { status: 400 },
      );
    }

    const { data: house, error: houseErr } = await supabase
      .from("houses")
      .select("id, tenant_id, blok_rumah")
      .eq("id", joinRequest.house_id)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .single();

    if (houseErr || !house) {
      return NextResponse.json(
        { error: "Rumah tidak ditemukan" },
        { status: 404 },
      );
    }

    // Status flipping (PENDING → ACTIVE/REJECTED, role grant, notifications,
    // forced logout on reject) is shared with the owner route.
    try {
      if (action === "reject") {
        await rejectRegistrationRequest(supabase, joinRequest, house, session.userId);
        return NextResponse.json({ success: true, action: "reject" });
      }

      const { relationship } = await approveRegistrationRequest(
        supabase,
        joinRequest,
        house,
        session.userId,
      );
      return NextResponse.json({ success: true, action: "approve", relationship });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses permintaan";
      console.error("admin/join-requests/respond error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses permintaan" },
      { status: 500 },
    );
  }
}
