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

export interface PendingApprovalRequest {
  id: string;
  house_id: string;
  requester_user_id: string;
}

export interface ApprovalHouse {
  id: string;
  tenant_id: string;
  blok_rumah: string | null;
}

/**
 * Approve a PENDING registration request (shared by the owner and admin
 * respond routes — authorization happens in the route, flipping here).
 *
 * Race-safe: occupancy is re-read at approval time. Two simultaneous
 * first-occupant requests → the loser becomes FAMILY.
 *
 * Write order: user/tenant/house rows first, request row last, so a retry
 * after a mid-way failure can safely resume (request still PENDING).
 */
export async function approveRegistrationRequest(
  supabase: SupabaseClient,
  req: PendingApprovalRequest,
  house: ApprovalHouse,
  approverUserId: string,
): Promise<{ relationship: "OWNER" | "FAMILY" }> {
  const occupancy = await getHouseOccupancy(supabase, house.tenant_id, house.id);
  const relationship = occupancy.hasOccupants ? "FAMILY" : "OWNER";
  const requester = req.requester_user_id;
  const now = new Date().toISOString();

  // 1 — Requester user PENDING → ACTIVE
  const { error: userErr } = await supabase
    .from("users")
    .update({ status: "ACTIVE" })
    .eq("id", requester)
    .eq("status", "PENDING");
  if (userErr) throw new Error("Gagal mengaktifkan akun");

  // 2 — Requester tenant link PENDING → ACTIVE
  const { data: tenantRow, error: tenantErr } = await supabase
    .from("tenant_users")
    .update({ status: "ACTIVE" })
    .eq("tenant_id", house.tenant_id)
    .eq("user_id", requester)
    .eq("status", "PENDING")
    .select("id")
    .maybeSingle();
  if (tenantErr || !tenantRow) throw new Error("Gagal mengaktifkan keanggotaan");

  // 3 — Requester house link PENDING → ACTIVE with final relationship
  const { error: houseErr } = await supabase
    .from("user_houses")
    .update({ status: "ACTIVE", relationship })
    .eq("tenant_id", house.tenant_id)
    .eq("user_id", requester)
    .eq("house_id", house.id)
    .eq("status", "PENDING");
  if (houseErr) throw new Error("Gagal mengaitkan ke rumah");

  // 4 — Family rows registered together (created_by = requester) → ACTIVE
  const { data: familyLinks } = await supabase
    .from("user_houses")
    .select("user_id")
    .eq("tenant_id", house.tenant_id)
    .eq("house_id", house.id)
    .eq("created_by", requester)
    .eq("status", "PENDING")
    .neq("user_id", requester);

  const familyUserIds = [...new Set((familyLinks ?? []).map((r) => r.user_id))];
  if (familyUserIds.length > 0) {
    await supabase
      .from("user_houses")
      .update({ status: "ACTIVE" })
      .eq("tenant_id", house.tenant_id)
      .eq("house_id", house.id)
      .in("user_id", familyUserIds)
      .eq("status", "PENDING");

    const { data: familyTenants } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", house.tenant_id)
      .in("user_id", familyUserIds)
      .eq("status", "PENDING");

    if (familyTenants) {
      await supabase
        .from("tenant_users")
        .update({ status: "ACTIVE" })
        .in(
          "id",
          familyTenants.map((t) => t.id),
        );
    }
  }

  // 5 — Grant WARGA role (requester + family tenant rows)
  await assignDefaultWargaRole(supabase, tenantRow.id);
  if (familyUserIds.length > 0) {
    const { data: familyTenants } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", house.tenant_id)
      .in("user_id", familyUserIds);
    for (const t of familyTenants ?? []) {
      await assignDefaultWargaRole(supabase, t.id);
    }
  }

  // 6 — Request row last
  const { error: reqErr } = await supabase
    .from("house_join_requests")
    .update({ status: "APPROVED", responded_at: now, responded_by: approverUserId })
    .eq("id", req.id);
  if (reqErr) throw new Error("Gagal memperbarui permintaan");

  // 7 — Notify the requester
  await supabase.from("notifications").insert({
    tenant_id: house.tenant_id,
    recipient_user_id: requester,
    actor_user_id: approverUserId,
    type: "RUMAH",
    priority: "NORMAL",
    title: "Permintaan Disetujui",
    body: `Anda sudah ditambahkan ke rumah ${house.blok_rumah ?? "-"} sebagai ${relationship === "OWNER" ? "kepala keluarga" : "anggota keluarga"}.`,
    action_url: "/profil",
    entity_table: "house_join_requests",
    entity_id: req.id,
    dedupe_key: `house_join_request:${req.id}:approve`,
    metadata: { requestId: req.id, houseId: house.id, action: "approve", relationship },
    created_by: approverUserId,
  });

  return { relationship };
}

/**
 * Reject a PENDING registration request. Requester (and co-registered family
 * links) go REJECTED, all requester sessions are deleted (forced logout),
 * and the request row is closed. Rejected identities may re-register
 * (duplicate check ignores REJECTED rows — see register route).
 */
export async function rejectRegistrationRequest(
  supabase: SupabaseClient,
  req: PendingApprovalRequest,
  house: ApprovalHouse,
  approverUserId: string,
): Promise<void> {
  const requester = req.requester_user_id;
  const now = new Date().toISOString();

  await supabase
    .from("users")
    .update({ status: "REJECTED" })
    .eq("id", requester)
    .eq("status", "PENDING");

  await supabase
    .from("tenant_users")
    .update({ status: "REJECTED" })
    .eq("tenant_id", house.tenant_id)
    .eq("user_id", requester)
    .eq("status", "PENDING");

  // Requester + co-registered family links (created_by = requester)
  const { data: pendingLinks } = await supabase
    .from("user_houses")
    .select("user_id")
    .eq("tenant_id", house.tenant_id)
    .eq("house_id", house.id)
    .eq("status", "PENDING")
    .or(`user_id.eq.${requester},created_by.eq.${requester}`);

  const affected = [...new Set((pendingLinks ?? []).map((r) => r.user_id))];
  if (affected.length > 0) {
    await supabase
      .from("user_houses")
      .update({ status: "REJECTED" })
      .eq("tenant_id", house.tenant_id)
      .eq("house_id", house.id)
      .in("user_id", affected)
      .eq("status", "PENDING");

    await supabase
      .from("tenant_users")
      .update({ status: "REJECTED" })
      .eq("tenant_id", house.tenant_id)
      .in("user_id", affected.filter((u) => u !== requester))
      .eq("status", "PENDING");
  }

  const { error: reqErr } = await supabase
    .from("house_join_requests")
    .update({ status: "REJECTED", responded_at: now, responded_by: approverUserId })
    .eq("id", req.id);
  if (reqErr) throw new Error("Gagal menolak permintaan");

  // Forced logout: delete every session of the requester
  await supabase.from("sessions").delete().eq("user_id", requester);

  await supabase.from("notifications").insert({
    tenant_id: house.tenant_id,
    recipient_user_id: requester,
    actor_user_id: approverUserId,
    type: "RUMAH",
    priority: "NORMAL",
    title: "Permintaan Ditolak",
    body: `Permintaan bergabung ke rumah ${house.blok_rumah ?? "-"} ditolak. Hubungi pengurus untuk info lebih lanjut.`,
    action_url: "/profil",
    entity_table: "house_join_requests",
    entity_id: req.id,
    dedupe_key: `house_join_request:${req.id}:reject`,
    metadata: { requestId: req.id, houseId: house.id, action: "reject" },
    created_by: approverUserId,
  });
}
