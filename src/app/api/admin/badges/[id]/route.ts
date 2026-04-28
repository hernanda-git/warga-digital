import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/badges/[id]
 *
 * Updates a badge.
 * Body: { code?: string; name?: string; description?: string; icon?: string; sort_order?: number }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idStr } = await context.params;
  const badgeId = parseInt(idStr, 10);
  if (isNaN(badgeId)) {
    return NextResponse.json({ error: "ID badge tidak valid" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    name?: string;
    description?: string;
    icon?: string;
    sort_order?: number;
  };

  // Build update payload with only provided fields
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Nama badge tidak boleh kosong" },
        { status: 400 },
      );
    }
    update.name = trimmed;
  }
  if (body.code !== undefined) {
    const trimmed = body.code.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Kode badge tidak boleh kosong" },
        { status: 400 },
      );
    }
    update.code = trimmed;
  }
  if (body.description !== undefined) {
    update.description = body.description?.trim() || null;
  }
  if (body.icon !== undefined) {
    update.icon = body.icon.trim() || "🏅";
  }
  if (body.sort_order !== undefined) {
    update.sort_order = body.sort_order;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "Tidak ada data yang diubah" },
      { status: 400 },
    );
  }

  const { data: badge, error } = await supabase
    .from("badges")
    .update(update)
    .eq("id", badgeId)
    .select("id, code, name, description, icon, sort_order, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `Kode badge sudah digunakan oleh badge lain.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ badge });
}

/**
 * DELETE /api/admin/badges/[id]
 *
 * Deletes a badge. Fails with 409 if the badge is assigned to any user.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: idStr } = await context.params;
  const badgeId = parseInt(idStr, 10);
  if (isNaN(badgeId)) {
    return NextResponse.json({ error: "ID badge tidak valid" }, { status: 400 });
  }

  // Check if badge is assigned to any user
  const { count } = await supabase
    .from("user_badges")
    .select("*", { count: "exact", head: true })
    .eq("badge_id", badgeId);

  if (count && count > 0) {
    return NextResponse.json(
      {
        error: `Badge ini masih dimiliki oleh ${count} warga. Hapus penugasan terlebih dahulu.`,
      },
      { status: 409 },
    );
  }

  const { error } = await supabase.from("badges").delete().eq("id", badgeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
