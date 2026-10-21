import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { hasAdminRole } from "@/lib/roles";

interface RoleInfo {
  id: number;
  name: string;
  description: string | null;
}

/**
 * GET /api/admin/me
 *
 * Lightweight admin identity probe used by every /admin page guard.
 *
 * WHY THIS EXISTS
 * The admin pages used to call GET /api/profile to decide whether the
 * visitor may see the admin UI. That endpoint returns the full profile
 * (residences, house members, badges, pending join requests) and used to
 * need a dozen sequential database round trips, so every admin page was
 * blocked on a heavy payload it never used.
 *
 * This endpoint answers the only question the guard asks - "is this user an
 * admin?" - with ONE database round trip and a small response:
 *
 *   { fullName, roles, residences, isAdmin }
 *
 * `roles` / `residences` keep the same shape as GET /api/profile so
 * hasAdminRoleInProfile() keeps working unchanged, and `isAdmin` is the
 * precomputed answer for callers that just need a boolean.
 *
 * The role set is identical to the profile endpoint: roles are read from
 * the ACTIVE tenant memberships of the residences the user actually lives
 * in, and revoked role assignments are ignored.
 */
export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data: user } = await supabase
      .from("users")
      .select(
        `
        full_name,
        user_houses!user_houses_user_id_fkey (tenant_id),
        tenant_users!inner (
          tenant_id,
          tenant_user_roles!inner (roles (id, name, description))
        )
      `,
      )
      .eq("id", session.userId)
      .eq("user_houses.status", "ACTIVE")
      .eq("tenant_users.status", "ACTIVE")
      .is("tenant_users.tenant_user_roles.revoked_at", null)
      .limit(1)
      .maybeSingle();

    const rolesByTenant = new Map<string, RoleInfo[]>();
    for (const tenantUser of user?.tenant_users ?? []) {
      const list: RoleInfo[] = [];
      for (const assignment of tenantUser.tenant_user_roles ?? []) {
        const role = Array.isArray(assignment.roles)
          ? assignment.roles[0]
          : assignment.roles;
        if (!role) continue;
        list.push({
          id: role.id,
          name: role.name,
          description: role.description ?? null,
        });
      }
      rolesByTenant.set(tenantUser.tenant_id, list);
    }

    const residences = (user?.user_houses ?? []).map((link) => ({
      tenant: { id: link.tenant_id },
      roles: rolesByTenant.get(link.tenant_id) ?? [],
    }));

    const seen = new Set<number>();
    const roles: RoleInfo[] = [];
    for (const residence of residences) {
      for (const role of residence.roles) {
        if (seen.has(role.id)) continue;
        seen.add(role.id);
        roles.push(role);
      }
    }

    return NextResponse.json({
      fullName: user?.full_name ?? null,
      roles,
      residences,
      isAdmin: hasAdminRole(roles),
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat profil" }, { status: 500 });
  }
}
