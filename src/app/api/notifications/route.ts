import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";

interface NotificationPatchBody {
  markAllRead?: true;
  notificationId?: string;
}

/** Default page size for the notification list. */
const DEFAULT_LIMIT = 50;
/** Hard cap so a single request can never pull the whole history. */
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get("count") === "true";

  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    // If countOnly, return only unread count
    if (countOnly) {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_user_id", session.userId)
        .is("read_at", null);

      if (error) {
        return NextResponse.json(
          { error: "Gagal menghitung notifikasi" },
          { status: 500 },
        );
      }

      return NextResponse.json({ unreadCount: count ?? 0 });
    }

    // Paginated list. Without a limit this endpoint shipped the entire
    // notification history (1000+ rows, ~200 KB) on every visit.
    const rawLimit = Number(searchParams.get("limit"));
    const rawOffset = Number(searchParams.get("offset"));
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT),
    );
    const offset =
      Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;

    const [listRes, unreadRes] = await Promise.all([
      supabase
        .from("notifications")
        .select(
          "id, type, priority, title, body, action_url, metadata, read_at, created_at",
          { count: "exact" },
        )
        .eq("recipient_user_id", session.userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),

      // Total unread across the whole history, not just the loaded page.
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", session.userId)
        .is("read_at", null),
    ]);

    if (listRes.error) {
      return NextResponse.json(
        { error: "Gagal memuat notifikasi" },
        { status: 500 },
      );
    }

    const rows = listRes.data ?? [];
    const total = listRes.count ?? 0;

    return NextResponse.json({
      notifications: rows.map((row) => ({
        id: row.id,
        type: row.type,
        priority: row.priority,
        title: row.title,
        body: row.body,
        actionUrl: row.action_url ?? null,
        metadata: row.metadata ?? {},
        readAt: row.read_at ?? null,
        createdAt: row.created_at,
      })),
      unreadCount: unreadRes.count ?? 0,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + rows.length < total,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memuat notifikasi" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<NotificationPatchBody>;
    const supabase = createServerClient();
    const nowIso = new Date().toISOString();

    if (body.markAllRead === true) {
      const { error } = await supabase
        .from("notifications")
        .update({
          read_at: nowIso,
          updated_at: nowIso,
          updated_by: session.userId,
        })
        .eq("recipient_user_id", session.userId)
        .is("read_at", null);

      if (error) {
        return NextResponse.json(
          { error: "Gagal menandai notifikasi" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, mode: "all" });
    }

    if (!body.notificationId || typeof body.notificationId !== "string") {
      return NextResponse.json(
        { error: "notificationId tidak valid" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("notifications")
      .update({
        read_at: nowIso,
        updated_at: nowIso,
        updated_by: session.userId,
      })
      .eq("id", body.notificationId)
      .eq("recipient_user_id", session.userId)
      .is("read_at", null);

    if (error) {
      return NextResponse.json(
        { error: "Gagal menandai notifikasi" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, mode: "single" });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memproses notifikasi" },
      { status: 500 },
    );
  }
}
