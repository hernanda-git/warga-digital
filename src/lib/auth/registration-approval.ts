import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_ROLE_WARGA_ID } from "@/lib/constants/seed-ids";

type SupabaseClient = ReturnType<typeof createServerClient>;

/**
 * Shared helpers for the registration approval lock.
 *
 * Case model (computed live, never stored — occupancy can change between
 * registration and approval):
 * - FIRST_OCCUPANT: the house has no ACTIVE user_houses link at all.
 *   Only an admin may approve; the requester becomes OWNER.
 * - JOIN: the house already has occupants. The head of household
 *   (ACTIVE OWNER link) or an admin may approve; the requester becomes FAMILY.
 */

export type ApprovalCase = "FIRST_OCCUPANT" | "JOIN";

/** Assign the default WARGA role to a tenant_users row (idempotent). */
export async function assignDefaultWargaRole(
  supabase: SupabaseClient,
  tenantUserId: string,
) {
  const { error: roleErr } = await supabase.from("tenant_user_roles").insert({
    tenant_user_id: tenantUserId,
    role_id: DEFAULT_ROLE_WARGA_ID,
  });
  if (roleErr && roleErr.code !== "23505") {
    // Non-unique errors are unexpected; swallow to avoid breaking the flow.
    console.error("assignDefaultWargaRole error:", roleErr);
  }
}

export interface HouseOccupancy {
  /** True when at least one ACTIVE link exists (OWNER, FAMILY, or other). */
  hasOccupants: boolean;
  /** user_id of the ACTIVE OWNER (kepala keluarga), if any. */
  ownerUserId: string | null;
}

/**
 * Read live occupancy of a house. Callers decide the approval case:
 * hasOccupants === false → FIRST_OCCUPANT, else JOIN.
 */
export async function getHouseOccupancy(
  supabase: SupabaseClient,
  tenantId: string,
  houseId: string,
): Promise<HouseOccupancy> {
  const { data: links } = await supabase
    .from("user_houses")
    .select("user_id, relationship")
    .eq("tenant_id", tenantId)
    .eq("house_id", houseId)
    .eq("status", "ACTIVE");

  const rows = links ?? [];
  const owner = rows.find((r) => r.relationship === "OWNER");

  return {
    hasOccupants: rows.length > 0,
    ownerUserId: owner?.user_id ?? null,
  };
}

/** Map occupancy to the approval case label used in responses/notifications. */
export function toApprovalCase(occupancy: HouseOccupancy): ApprovalCase {
  return occupancy.hasOccupants ? "JOIN" : "FIRST_OCCUPANT";
}
