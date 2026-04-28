import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { notifyAdmins } from "@/lib/notifications";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/badges/[id]/users
 *
 * Returns a paginated list of users who have earned this badge.
 * Query params: page (default 1), limit (default 20)
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)),
  );
  const offset = (page - 1) * limit;

  // Get total count
  const { count: total } = await supabase
    .from("user_badges")
    .select("*", { count: "exact", head: true })
    .eq("badge_id", badgeId);

  // Fetch user_badges for this badge, joined to users
  const { data: rows, error: rowsError } = await supabase
    .from("user_badges")
    .select(
      `
      id,
      earned_at,
      users!inner (
        id,
        full_name,
        wa_number
      )
    `,
    )
    .eq("badge_id", badgeId)
    .order("earned_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (rowsError) {
    return NextResponse.json({ error: rowsError.message }, { status: 500 });
  }

  type RowType = {
    id: string;
    earned_at: string;
    users: { id: string; full_name: string; wa_number: string | null };
  };

  const typedRows = (rows ?? []) as unknown as RowType[];
  const userIds = typedRows.map((r) => r.users.id);

  // Batch-fetch primary house blok_rumah for each user
  const blokMap: Record<string, string | null> = {};
  if (userIds.length > 0) {
    const { data: houseRows } = await supabase
      .from("user_houses")
      .select("user_id, houses!inner(blok_rumah, tenant_id)")
      .in("user_id", userIds)
      .eq("is_primary", true)
      .eq("status", "ACTIVE")
      .eq("houses.tenant_id", DEFAULT_TENANT_ID);

    (houseRows ?? []).forEach((h) => {
      type HouseRow = {
        user_id: string;
        houses: { blok_rumah: string | null; tenant_id: string };
      };
      const row = h as unknown as HouseRow;
      blokMap[row.user_id] = row.houses?.blok_rumah ?? null;
    });
  }

  const members = typedRows.map((r) => ({
    user_badge_id: r.id,
    user_id: r.users.id,
    full_name: r.users.full_name ?? "—",
    wa_number: r.users.wa_number ?? null,
    blok_rumah: blokMap[r.users.id] ?? null,
    earned_at: r.earned_at,
  }));

  return NextResponse.json({ members, total: total ?? 0, page, limit });
}

/**
 * POST /api/admin/badges/[id]/users
 *
 * Assigns this badge to a user (by userId).
 * Returns 409 if the user already has this badge.
 * Body: { userId: string }
 */
export async function POST(request: NextRequest, context: RouteContext) {
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

  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  const { userId } = body;
  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId wajib diisi" }, { status: 400 });
  }

  // Verify badge exists
  const { data: badgeRow } = await supabase
    .from("badges")
    .select("id, name")
    .eq("id", badgeId)
    .maybeSingle();

  if (!badgeRow) {
    return NextResponse.json(
      { error: "Badge tidak ditemukan" },
      { status: 404 },
    );
  }

  // Verify user is an active tenant member
  const { data: targetTenantUser } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!targetTenantUser) {
    return NextResponse.json(
      { error: "Warga tidak ditemukan atau tidak aktif di komunitas ini" },
      { status: 404 },
    );
  }

  // Check for existing assignment
  const { data: existing } = await supabase
    .from("user_badges")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_id", badgeId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Badge sudah diberikan ke warga ini" },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();

  const { data: assigned, error: insertError } = await supabase
    .from("user_badges")
    .insert({
      user_id: userId,
      badge_id: badgeId,
      earned_at: now,
    })
    .select("id, earned_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Best-effort: send in-app notification to the user who earned the badge
  const badgeName = (badgeRow as unknown as { name: string }).name;
  try {
    await supabase.from("notifications").insert({
      tenant_id: DEFAULT_TENANT_ID,
      recipient_user_id: userId,
      actor_user_id: session.userId,
      type: "SYSTEM",
      priority: "NORMAL",
      title: "Lencana Baru",
      body: `Anda mendapatkan lencana "${badgeName}" dari admin komunitas. Selamat!`,
      action_url: "/profil",
      entity_table: "user_badges",
      entity_id: assigned.id,
    });
  } catch {
  }

  // Best-effort: notify admin personnel about the assignment
  try {
    const [targetUserRes, actorUserRes] = await Promise.all([
      supabase.from("users").select("full_name").eq("id", userId).maybeSingle(),
      supabase
        .from("users")
        .select("full_name")
        .eq("id", session.userId)
        .maybeSingle(),
    ]);

    const targetName =
      (
        targetUserRes.data as { full_name?: string } | null
      )?.full_name?.trim() || "Warga";
    const actorName =
      (actorUserRes.data as { full_name?: string } | null)?.full_name?.trim() ||
      "Admin";

    await notifyAdmins(
      supabase,
      {
        tenant_id: DEFAULT_TENANT_ID,
        actor_user_id: session.userId,
        type: "SYSTEM",
        priority: "NORMAL",
        title: "Lencana Diberikan ke Warga",
        body: `${actorName} memberikan lencana "${badgeName}" kepada ${targetName}.`,
        action_url: "/admin/badges",
        entity_table: "user_badges",
        entity_id: assigned.id,
        dedupe_key: `badge_assigned:${assigned.id}:admin_notif`,
        metadata: { badgeId, userId, badgeName, targetName },
        created_by: session.userId,
      },
      session.userId,
    );
  } catch {
  }

  return NextResponse.json(
    { userBadgeId: assigned.id, earnedAt: assigned.earned_at },
    { status: 201 },
  );
}

/**
 * DELETE /api/admin/badges/[id]/users
 *
 * Revokes a badge from a user by removing the user_badges row.
 * Body: { userBadgeId: string }
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

  const body = (await request.json().catch(() => ({}))) as {
    userBadgeId?: string;
  };
  const { userBadgeId } = body;
  if (!userBadgeId?.trim()) {
    return NextResponse.json(
      { error: "userBadgeId wajib diisi" },
      { status: 400 },
    );
  }

  // Pre-fetch badge name and affected user ID for notification
  const [badgeForNotif, ubForNotif] = await Promise.all([
    supabase
      .from("badges")
      .select("name")
      .eq("id", badgeId)
      .maybeSingle()
      .then((r) => r.data),
    supabase
      .from("user_badges")
      .select("user_id")
      .eq("id", userBadgeId)
      .eq("badge_id", badgeId)
      .maybeSingle()
      .then((r) => r.data),
  ]);

  const { error: deleteError } = await supabase
    .from("user_badges")
    .delete()
    .eq("id", userBadgeId)
    .eq("badge_id", badgeId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Best-effort: send in-app notification to the user whose badge was revoked
  try {
    const recipientUserId = (ubForNotif as unknown as { user_id: string } | null)
      ?.user_id;
    const badgeName = (
      badgeForNotif as unknown as { name: string } | null
    )?.name;
    if (recipientUserId && badgeName) {
      await supabase.from("notifications").insert({
        tenant_id: DEFAULT_TENANT_ID,
        recipient_user_id: recipientUserId,
        actor_user_id: session.userId,
        type: "SYSTEM",
        priority: "NORMAL",
        title: "Lencana Dicabut",
        body: `Lencana "${badgeName}" Anda telah dicabut oleh admin komunitas.`,
        action_url: "/profil",
        entity_table: "user_badges",
        entity_id: userBadgeId,
      });
    }
  } catch {
  }

  return NextResponse.json({ success: true });
}
