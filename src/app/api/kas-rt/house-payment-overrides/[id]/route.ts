"use server";

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
  ROLE_IDS_CAN_SUBMIT_KAS_RT,
} from "@/lib/constants/seed-ids";

/**
 * DELETE /api/kas-rt/house-payment-overrides/[id]
 *
 * Soft-revokes an override: is_active → false, revoked_by/revoked_at stamped.
 * The row is never deleted, so the audit trail of who marked what survives.
 * The house's money totals were never touched by the override, so revoking it
 * simply returns the house to what its real payments say.
 *
 * Roles: ROLE_IDS_CAN_SUBMIT_KAS_RT (RT_ADMIN, RT_BENDAHARA).
 */

type SupabaseClient = ReturnType<typeof createServerClient>;

async function requireKasRtManager(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!tenantUser) return false;

  const { data: roleRows } = await supabase
    .from("tenant_user_roles")
    .select("id")
    .eq("tenant_user_id", tenantUser.id)
    .in("role_id", ROLE_IDS_CAN_SUBMIT_KAS_RT)
    .is("revoked_at", null)
    .limit(1);

  return !!roleRows?.length;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { message: "ID penyesuaian tidak valid." },
        { status: 400 },
      );
    }

    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ message: "Anda harus masuk." }, { status: 401 });
    }

    const supabase = createServerClient();
    const isManager = await requireKasRtManager(supabase, session.userId);
    if (!isManager) {
      return NextResponse.json(
        { message: "Anda tidak memiliki izin membatalkan penyesuaian." },
        { status: 403 },
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from("house_payment_overrides")
      .select("id, house_id, year, credited_months, reason, is_active")
      .eq("id", id)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { message: "Gagal memverifikasi penyesuaian." },
        { status: 500 },
      );
    }

    if (!existing) {
      return NextResponse.json(
        { message: "Penyesuaian tidak ditemukan." },
        { status: 404 },
      );
    }

    if (!existing.is_active) {
      return NextResponse.json(
        { message: "Penyesuaian ini sudah dibatalkan." },
        { status: 409 },
      );
    }

    const revokedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("house_payment_overrides")
      .update({
        is_active: false,
        revoked_by: session.userId,
        revoked_at: revokedAt,
      })
      .eq("id", id)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID);

    if (updateError) {
      console.error("[house-payment-overrides/id] revoke failed:", updateError);
      return NextResponse.json(
        { message: "Gagal membatalkan penyesuaian." },
        { status: 500 },
      );
    }

    await supabase
      .from("audit_logs")
      .insert({
        action: "house_payment_override_revoked",
        user_id: session.userId,
        entity_type: "house_payment_override",
        entity_id: id,
        details: {
          houseId: existing.house_id,
          year: existing.year,
          creditedMonths: existing.credited_months,
          reason: existing.reason,
          revokedAt,
        },
      })
      .then(
        () => undefined,
        () => undefined,
      );

    return NextResponse.json({
      revoked: true,
      id,
      revoked_at: revokedAt,
    });
  } catch (error) {
    console.error("[house-payment-overrides/id] DELETE failed:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat membatalkan penyesuaian." },
      { status: 500 },
    );
  }
}
