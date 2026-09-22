import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Approval gate for the registration approval lock.
 *
 * Returns the `tenant_users` row id when the user is an ACTIVE member of the
 * default tenant, or `null` when pending / rejected / unknown.
 *
 * Usage in any data or write API route (NOT /api/auth/*, NOT /api/artikel/*):
 *
 *   const approved = await requireApprovedUser(supabase, session.userId);
 *   if (!approved) {
 *     return NextResponse.json({ error: "PendingApproval" }, { status: 403 });
 *   }
 *
 * NOTE: this is the authoritative (DB) check. The `approved` claim on the
 * session JWT is only a hint for the Edge middleware, which cannot do DB
 * calls — it may be stale, so never gate API access on it.
 */
export async function requireApprovedUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  return data ?? null;
}
