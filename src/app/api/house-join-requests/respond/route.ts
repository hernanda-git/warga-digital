import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  approveRegistrationRequest,
  rejectRegistrationRequest,
} from "@/lib/auth/registration-approval";

/**
 * POST /api/house-join-requests/respond
 * Owner approves or rejects a pending house join request.
 * Body: { requestId: string, action: 'approve' | 'reject' }
 *
 * Only the head of household (ACTIVE OWNER link) may respond here.
 * FIRST_OCCUPANT requests (empty house) have no owner and are admin-only —
 * they are handled by /api/admin/join-requests/respond.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const requestId = body?.requestId;
    const action = body?.action;

    if (!requestId || typeof requestId !== "string" || !requestId.trim()) {
      return NextResponse.json(
        { error: "requestId wajib diisi" },
        { status: 400 }
      );
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action harus 'approve' atau 'reject'" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: joinRequest, error: fetchErr } = await supabase
      .from("house_join_requests")
      .select("id, house_id, requester_user_id, status")
      .eq("id", requestId)
      .single();

    if (fetchErr || !joinRequest) {
      return NextResponse.json(
        { error: "Permintaan tidak ditemukan" },
        { status: 404 }
      );
    }

    if (joinRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Permintaan sudah ditanggapi" },
        { status: 400 }
      );
    }

    const { data: house } = await supabase
      .from("houses")
      .select("id, tenant_id, blok_rumah")
      .eq("id", joinRequest.house_id)
      .single();

    if (!house) {
      return NextResponse.json(
        { error: "Rumah tidak ditemukan" },
        { status: 404 }
      );
    }

    const { data: ownerLink } = await supabase
      .from("user_houses")
      .select("id")
      .eq("house_id", joinRequest.house_id)
      .eq("user_id", session.userId)
      .eq("relationship", "OWNER")
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!ownerLink) {
      return NextResponse.json(
        { error: "Anda bukan pemilik rumah ini" },
        { status: 403 }
      );
    }

    // Status flipping (PENDING → ACTIVE/REJECTED, role grant, notifications,
    // forced logout on reject) is shared with the admin route.
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
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      console.error("house-join-requests/respond error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
