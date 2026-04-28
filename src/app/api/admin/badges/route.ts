import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";

/**
 * GET /api/admin/badges
 *
 * Returns all badges with the count of users who have earned each one.
 * Requires admin role.
 */
export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: badges, error } = await supabase
    .from("badges")
    .select("id, code, name, description, icon, sort_order, created_at")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count user_badges per badge
  const { data: countRows } = await supabase
    .from("user_badges")
    .select("badge_id");

  const countMap: Record<number, number> = {};
  (countRows ?? []).forEach((r) => {
    const bid = (r as { badge_id: number }).badge_id;
    countMap[bid] = (countMap[bid] ?? 0) + 1;
  });

  const enriched = (badges ?? []).map((b) => ({
    ...b,
    user_count: countMap[b.id as number] ?? 0,
  }));

  return NextResponse.json({ badges: enriched });
}

/**
 * POST /api/admin/badges
 *
 * Creates a new badge.
 * Body: { code: string; name: string; description?: string; icon?: string; sort_order?: number }
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    name?: string;
    description?: string;
    icon?: string;
    sort_order?: number;
  };

  const rawName = body.name?.trim() ?? "";
  const rawCode = body.code?.trim() ?? "";
  if (!rawName) {
    return NextResponse.json(
      { error: "Nama badge wajib diisi" },
      { status: 400 },
    );
  }
  if (!rawCode) {
    return NextResponse.json(
      { error: "Kode badge wajib diisi" },
      { status: 400 },
    );
  }

  const { data: badge, error } = await supabase
    .from("badges")
    .insert({
      code: rawCode,
      name: rawName,
      description: body.description?.trim() || null,
      icon: body.icon?.trim() || "🏅",
      sort_order: body.sort_order ?? 0,
    })
    .select("id, code, name, description, icon, sort_order, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `Kode badge "${rawCode}" sudah ada. Gunakan kode lain.` },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { badge: { ...badge, user_count: 0 } },
    { status: 201 },
  );
}
