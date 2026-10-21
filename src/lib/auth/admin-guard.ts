import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID, ROLE_IDS_ADMIN } from "@/lib/constants/seed-ids";

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Verifies that the given user is an active tenant member who holds at
 * least one role listed in ROLE_IDS_ADMIN (RT_ADMIN, RT_BENDAHARA, …).
 *
 * Returns the `tenant_users` row on success, or `null` when the check
 * fails (user not found, inactive, or missing the required role).
 *
 * Usage in any /api/admin/** route:
 *
 *   const supabase = createServerClient();
 *   const tenantUser = await requireAdmin(supabase, session.userId);
 *   if (!tenantUser) {
 *     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 *   }
 */
export async function requireAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string } | null> {
  // ── 1. Confirm the user is an active member of the default tenant ──────────
  // One round trip: active tenant membership + at least one non-revoked
  // admin role. The inner join drops members without an admin role.
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("id, tenant_user_roles!inner(role_id)")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .in("tenant_user_roles.role_id", ROLE_IDS_ADMIN)
    .is("tenant_user_roles.revoked_at", null)
    .limit(1)
    .maybeSingle();

  return tenantUser ? { id: tenantUser.id } : null;
}
