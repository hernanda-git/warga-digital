"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
  ROLE_IDS_CAN_SUBMIT_KAS_RT,
} from "@/lib/constants/seed-ids";
import { IPL_MONTHS_PER_YEAR, normalizeMonthNumbers } from "@/lib/kas-rt-ipl";

/**
 * /api/kas-rt/house-payment-overrides
 *
 * Lets an authorized kas-RT manager mark a house as paid for a year WITHOUT
 * creating a transaction — the override credits *months*, never rupiah, so
 * every money total (house total, kas balance, income/expense, summary) stays
 * truthful while the house reads as "Lunas".
 *
 * Roles: ROLE_IDS_CAN_SUBMIT_KAS_RT (RT_ADMIN, RT_BENDAHARA).
 * Revoke is soft: is_active flips to false, the row and its author survive.
 */

type SupabaseClient = ReturnType<typeof createServerClient>;

const ALLOWED_REASONS = [
  "PEMBEBASAN",
  "KOREKSI",
  "TITIP_BAYAR",
  "KEBIJAKAN_RT",
  "LAINNYA",
] as const;

// ── Guard ────────────────────────────────────────────────────────────────────

async function requireKasRtManager(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ tenantUserId: string } | null> {
  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("id")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!tenantUser) return null;

  const { data: roleRows } = await supabase
    .from("tenant_user_roles")
    .select("id")
    .eq("tenant_user_id", tenantUser.id)
    .in("role_id", ROLE_IDS_CAN_SUBMIT_KAS_RT)
    .is("revoked_at", null)
    .limit(1);

  if (!roleRows?.length) return null;

  return { tenantUserId: tenantUser.id };
}

function resolveName(
  joined:
    | { full_name: string | null }
    | Array<{ full_name: string | null }>
    | null
    | undefined,
): string | null {
  if (!joined) return null;
  const row = Array.isArray(joined) ? joined[0] : joined;
  return row?.full_name?.trim() || null;
}

// ── GET: list overrides for a year ───────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ message: "Anda harus masuk." }, { status: 401 });
    }

    const supabase = createServerClient();
    const manager = await requireKasRtManager(supabase, session.userId);
    if (!manager) {
      return NextResponse.json(
        { message: "Anda tidak memiliki izin melihat penyesuaian pembayaran." },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const rawYear = parseInt(searchParams.get("year") ?? "", 10);
    const year =
      Number.isFinite(rawYear) && rawYear >= 2020 && rawYear <= 2100
        ? rawYear
        : new Date().getFullYear();

    const includeRevoked = searchParams.get("include_revoked") === "true";

    let query = supabase
      .from("house_payment_overrides")
      .select(
        "id, house_id, year, credited_months, credited_month_numbers, reason, notes, is_active, marked_at, revoked_at, houses!house_payment_overrides_house_id_fkey(name, blok_rumah), marked_by_user:users!house_payment_overrides_marked_by_fkey(full_name), revoked_by_user:users!house_payment_overrides_revoked_by_fkey(full_name)",
      )
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .eq("year", year)
      .order("marked_at", { ascending: false });

    if (!includeRevoked) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[house-payment-overrides] GET failed:", error);
      return NextResponse.json(
        { message: "Gagal memuat data penyesuaian pembayaran." },
        { status: 500 },
      );
    }

    const overrides = (data ?? []).map((row) => {
      const house = Array.isArray(row.houses) ? row.houses[0] : row.houses;
      return {
        id: row.id,
        house_id: row.house_id,
        blokRumah: house?.blok_rumah ?? "",
        houseName: house?.name ?? "",
        year: row.year,
        credited_months: row.credited_months,
        credited_month_numbers: row.credited_month_numbers ?? [],
        reason: row.reason,
        notes: row.notes,
        is_active: row.is_active,
        marked_at: row.marked_at,
        marked_by_full_name: resolveName(row.marked_by_user),
        revoked_at: row.revoked_at,
        revoked_by_full_name: resolveName(row.revoked_by_user),
      };
    });

    return NextResponse.json({ year, overrides });
  } catch (error) {
    console.error("[house-payment-overrides] GET failed:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan." },
      { status: 500 },
    );
  }
}

// ── POST: mark a house paid (credit months) ──────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      house_id?: string;
      blok_rumah?: string;
      year?: number;
      credited_months?: number;
      credited_month_numbers?: number[];
      reason?: string;
      notes?: string;
    };

    const year = body.year ?? new Date().getFullYear();
    if (!Number.isInteger(year) || year < 2020 || year > 2100) {
      return NextResponse.json({ message: "Tahun tidak valid." }, { status: 400 });
    }

    // ── Months: prefer an explicit calendar-month list ─────────────────────
    // A count is January-anchored and cannot express "NOV + DES" or "up to
    // October", so the UI sends the exact months. The count is derived from it
    // and kept as a convenience/summary field.
    const explicitMonths = normalizeMonthNumbers(body.credited_month_numbers);
    const legacyCount = body.credited_months ?? IPL_MONTHS_PER_YEAR;

    let creditedMonthNumbers: number[];
    if (explicitMonths.length > 0) {
      creditedMonthNumbers = explicitMonths;
    } else {
      if (
        !Number.isInteger(legacyCount) ||
        legacyCount < 1 ||
        legacyCount > IPL_MONTHS_PER_YEAR
      ) {
        return NextResponse.json(
          { message: `Jumlah bulan harus 1-${IPL_MONTHS_PER_YEAR}.` },
          { status: 400 },
        );
      }
      creditedMonthNumbers = Array.from(
        { length: legacyCount },
        (_, i) => i + 1,
      );
    }

    const creditedMonths = creditedMonthNumbers.length;

    const reason = body.reason?.trim().toUpperCase() || "LAINNYA";
    if (!(ALLOWED_REASONS as readonly string[]).includes(reason)) {
      return NextResponse.json(
        { message: `Alasan harus salah satu dari: ${ALLOWED_REASONS.join(", ")}.` },
        { status: 400 },
      );
    }

    const notes = body.notes?.trim() || null;
    if (!notes) {
      return NextResponse.json(
        { message: "Catatan wajib diisi agar penyesuaian dapat diaudit." },
        { status: 400 },
      );
    }

    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ message: "Anda harus masuk." }, { status: 401 });
    }

    const supabase = createServerClient();
    const manager = await requireKasRtManager(supabase, session.userId);
    if (!manager) {
      return NextResponse.json(
        { message: "Anda tidak memiliki izin membuat penyesuaian pembayaran." },
        { status: 403 },
      );
    }

    // ── Resolve the house by id, or by blok as a convenience ────────────────
    let houseId = body.house_id?.trim() || null;
    let blokRumah = body.blok_rumah?.trim() || null;

    if (!houseId && !blokRumah) {
      return NextResponse.json(
        { message: "Rumah wajib dipilih." },
        { status: 400 },
      );
    }

    if (!houseId && blokRumah) {
      const { data: house } = await supabase
        .from("houses")
        .select("id, blok_rumah")
        .eq("tenant_id", DEFAULT_TENANT_ID)
        .eq("community_id", DEFAULT_COMMUNITY_ID)
        .eq("blok_rumah", blokRumah)
        .eq("is_active", true)
        .maybeSingle();

      if (!house) {
        return NextResponse.json(
          { message: `Blok ${blokRumah} tidak ditemukan.` },
          { status: 404 },
        );
      }
      houseId = house.id;
      blokRumah = house.blok_rumah;
    } else if (houseId) {
      const { data: house } = await supabase
        .from("houses")
        .select("id, blok_rumah")
        .eq("id", houseId)
        .eq("tenant_id", DEFAULT_TENANT_ID)
        .eq("community_id", DEFAULT_COMMUNITY_ID)
        .maybeSingle();

      if (!house) {
        return NextResponse.json(
          { message: "Rumah tidak ditemukan." },
          { status: 404 },
        );
      }
      blokRumah = house.blok_rumah;
    }

    // ── Reject a duplicate active override up front for a clear message ─────
    const { data: existing } = await supabase
      .from("house_payment_overrides")
      .select("id")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .eq("house_id", houseId)
      .eq("year", year)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          message: `Blok ${blokRumah} sudah ditandai lunas untuk tahun ${year}. Batalkan dulu bila ingin mengubah.`,
        },
        { status: 409 },
      );
    }

    const { data: created, error: insertError } = await supabase
      .from("house_payment_overrides")
      .insert({
        tenant_id: DEFAULT_TENANT_ID,
        community_id: DEFAULT_COMMUNITY_ID,
        house_id: houseId,
        year,
        credited_months: creditedMonths,
        credited_month_numbers: creditedMonthNumbers,
        reason,
        notes,
        is_active: true,
        marked_by: session.userId,
      })
      .select("id, house_id, year, credited_months, credited_month_numbers, reason, notes, is_active, marked_at")
      .single();

    if (insertError || !created) {
      console.error("[house-payment-overrides] insert failed:", insertError);
      return NextResponse.json(
        { message: "Gagal menyimpan penyesuaian pembayaran." },
        { status: 500 },
      );
    }

    // ── Audit trail (best-effort; never blocks the mark) ────────────────────
    await supabase
      .from("audit_logs")
      .insert({
        action: "house_payment_override_created",
        user_id: session.userId,
        entity_type: "house_payment_override",
        entity_id: created.id,
        details: {
          houseId,
          blokRumah,
          year,
          creditedMonths,
          creditedMonthNumbers,
          reason,
          notes,
        },
      })
      .then(
        () => undefined,
        () => undefined,
      );

    return NextResponse.json({
      id: created.id,
      house_id: created.house_id,
      blokRumah,
      year: created.year,
      credited_months: created.credited_months,
      credited_month_numbers: created.credited_month_numbers ?? creditedMonthNumbers,
      reason: created.reason,
      notes: created.notes,
      is_active: created.is_active,
      marked_at: created.marked_at,
    });
  } catch (error) {
    console.error("[house-payment-overrides] POST failed:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menyimpan penyesuaian." },
      { status: 500 },
    );
  }
}
