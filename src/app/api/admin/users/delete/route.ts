import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";

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
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

    if (!userId) {
      return NextResponse.json(
        { error: "User ID wajib diisi" },
        { status: 400 },
      );
    }

    if (userId === session.userId) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun Anda sendiri." },
        { status: 400 },
      );
    }

    const { data: targetUser, error: userError } = await supabase
      .from("users")
      .select("id, full_name, email, status")
      .eq("id", userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    const { data: result, error: rpcError } = await supabase.rpc(
      "delete_user_with_cleanup",
      { target_user_id: userId },
    );

    if (rpcError) {
      return NextResponse.json(
        { error: "Gagal menghapus user: " + rpcError.message },
        { status: 500 },
      );
    }

    const summary = Array.isArray(result) ? result[0] : result;

    await supabase.from("audit_logs").insert({
      action: "ADMIN_DELETE_USER",
      user_id: session.userId,
      entity_type: "users",
      entity_id: userId,
      details: {
        targetUser: userId,
        targetName: targetUser.full_name,
        targetEmail: targetUser.email,
        cleanupResult: summary,
      },
      created_by: session.userId,
    });

    return NextResponse.json({ success: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Terjadi kesalahan. Coba lagi nanti." },
      { status: 500 },
    );
  }
}
