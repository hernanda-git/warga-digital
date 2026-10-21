import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";

import { requireAdmin } from "@/lib/auth/admin-guard";

/**
 * GET /api/admin/warga
 *
 * Lists all active warga in the tenant with optional search and blok filter.
 *
 * Query params:
 *   q      - search term (name or wa_number), optional
 *   blok   - filter by blok_rumah slug, optional ("" = all)
 *   page   - 1-based page number (default 1)
 *   limit  - items per page (default 30, max 100)
 */
export async function GET(request: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const adminUser = await requireAdmin(supabase, session.userId);
  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── 2. Parse query params ──────────────────────────────────────────────────
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const blokFilter = (url.searchParams.get("blok") ?? "").trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "30", 10)),
  );
  const sort = (url.searchParams.get("sort") ?? "newest").trim();

  // ── 3. Fetch active tenant_users with user, house and role data in one query
  // The active roster is tenant-scoped (68 rows at the time of writing), so the
  // remaining search/sort/pagination stays in JS without an unbounded scan.
  const { data: tuRows, error: tuError } = await supabase
    .from("tenant_users")
    .select(
      `
      id,
      user_id,
      status,
      joined_at,
      users!inner (
        id,
        full_name,
        email,
        wa_number,
        username,
        status,
        avatar_path,
        last_active_at,
        user_houses!user_houses_user_id_fkey (
          is_primary,
          status,
          houses!user_houses_house_id_fkey (
            blok_rumah,
            tenant_id
          )
        )
      ),
      tenant_user_roles!tenant_user_roles_tenant_user_id_fkey (
        revoked_at,
        roles!tenant_user_roles_role_id_fkey (
          name
        )
      )
    `,
    )
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("status", "ACTIVE")
    .order("joined_at", { ascending: false });

  if (tuError) {
    return NextResponse.json({ error: tuError.message }, { status: 500 });
  }

  type HouseLink = {
    is_primary: boolean | null;
    status: string | null;
    houses: { blok_rumah: string | null; tenant_id: string } | null;
  };
  type RoleLink = {
    revoked_at: string | null;
    roles: { name: string | null } | null;
  };
  type TuRow = {
    id: string;
    user_id: string;
    status: string;
    joined_at: string | null;
    users: {
      id: string;
      full_name: string | null;
      email: string | null;
      username: string | null;
      wa_number: string | null;
      status: string;
      avatar_path: string | null;
      last_active_at: string | null;
      user_houses: HouseLink[] | null;
    } | null;
    tenant_user_roles: RoleLink[] | null;
  };

  const rows = (tuRows ?? []) as unknown as TuRow[];

  const allWarga = rows.map((r) => {
    const avatarPath = r.users?.avatar_path ?? null;
    const houseLink = (r.users?.user_houses ?? []).find(
      (uh) =>
        uh.is_primary === true &&
        uh.status === "ACTIVE" &&
        uh.houses?.tenant_id === DEFAULT_TENANT_ID,
    );
    const roles = (r.tenant_user_roles ?? [])
      .filter((link) => !link.revoked_at && link.roles?.name)
      .map((link) => link.roles!.name as string);

    return {
      tenant_user_id: r.id,
      user_id: r.user_id,
      full_name: r.users?.full_name ?? "—",
      email: r.users?.email ?? null,
      username: r.users?.username ?? null,
      wa_number: r.users?.wa_number ?? null,
      blok_rumah: houseLink?.houses?.blok_rumah ?? null,
      joined_at: r.joined_at,
      roles,
      last_active_at: r.users?.last_active_at ?? null,
      status: r.users?.status ?? "INACTIVE",
      avatar_path: avatarPath,
      profile_picture_url: avatarPath,
    };
  });

  // ── 5. Apply search + blok filter in JS ───────────────────────────────────
  const filtered = allWarga.filter((w) => {
    const matchSearch =
      !q ||
      w.full_name.toLowerCase().includes(q) ||
      (w.username ?? "").toLowerCase().includes(q) ||
      (w.wa_number ?? "").toLowerCase().includes(q) ||
      (w.blok_rumah ?? "").toLowerCase().includes(q);

    const matchBlok =
      !blokFilter || (w.blok_rumah ?? "").toLowerCase() === blokFilter;

    return matchSearch && matchBlok;
  });

  // ── 6. Build distinct blok list for filter pills ──────────────────────────
  const blokSet = new Set<string>();
  allWarga.forEach((w) => {
    if (w.blok_rumah) blokSet.add(w.blok_rumah);
  });
  const blokList = Array.from(blokSet).sort();

  // Accurate count for the "Baru Bulan Ini" strip — independent of the
  // current search/filter/page so it never reflects just the visible slice.
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const joinedThisMonth = allWarga.filter(
    (w) => w.joined_at && new Date(w.joined_at) >= startOfMonth,
  ).length;

  // ── 7. Sort ────────────────────────────────────────────────────────────────
  filtered.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return (a.joined_at ?? "").localeCompare(b.joined_at ?? "");
      case "name-asc":
        return a.full_name.localeCompare(b.full_name, "id");
      case "name-desc":
        return b.full_name.localeCompare(a.full_name, "id");
      case "active":
        return (b.last_active_at ?? "").localeCompare(a.last_active_at ?? "");
      case "newest":
      default:
        return (b.joined_at ?? "").localeCompare(a.joined_at ?? "");
    }
  });

  // ── 8. Paginate ────────────────────────────────────────────────────────────
  const total = filtered.length;
  const offset = (page - 1) * limit;
  const warga = filtered.slice(offset, offset + limit);
  const hasMore = offset + warga.length < total;

  return NextResponse.json({
    warga,
    meta: {
      total,
      totalAll: allWarga.length,
      joinedThisMonth,
      page,
      limit,
      hasMore,
    },
    blokList,
  });
}
