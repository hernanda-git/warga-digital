import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { parseBlokRumah } from "@/lib/blok-rumah";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import { uuidv7 } from "uuidv7";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const userId =
      typeof body?.userId === "string" ? body.userId.trim() : "";
    const newBlokRumahRaw =
      typeof body?.newBlokRumah === "string" ? body.newBlokRumah.trim() : "";

    if (!userId) {
      return NextResponse.json(
        { error: "User ID wajib diisi" },
        { status: 400 },
      );
    }
    if (!newBlokRumahRaw) {
      return NextResponse.json(
        { error: "Blok rumah baru wajib diisi" },
        { status: 400 },
      );
    }

    const { normalized: newBlokRumah, error: blokError } =
      parseBlokRumah(newBlokRumahRaw);
    if (blokError) {
      return NextResponse.json({ error: blokError }, { status: 400 });
    }

    const { data: targetUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    // ── Find or create the correct house ─────────────────────────────────
    const { data: existingHouse } = await supabase
      .from("houses")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .eq("blok_rumah", newBlokRumah)
      .maybeSingle();

    let correctHouseId: string;
    let isNewHouse = false;
    if (existingHouse?.id) {
      correctHouseId = existingHouse.id;
    } else {
      isNewHouse = true;
      const newHouseId = uuidv7();
      const { error: createError } = await supabase.from("houses").insert({
        id: newHouseId,
        tenant_id: tenantId,
        community_id: communityId,
        name: newBlokRumah,
        blok_rumah: newBlokRumah,
        status: "PRIBADI",
        total_residents: 0,
        is_active: true,
        created_by: session.userId,
      });

      if (createError) {
        return NextResponse.json(
          { error: "Gagal membuat data rumah baru" },
          { status: 500 },
        );
      }
      correctHouseId = newHouseId;
    }

    // ── Determine ownership for the target house ─────────────────────────
    const { data: targetOwner } = await supabase
      .from("user_houses")
      .select("user_id, id")
      .eq("tenant_id", tenantId)
      .eq("house_id", correctHouseId)
      .eq("relationship", "OWNER")
      .eq("status", "ACTIVE")
      .limit(1)
      .maybeSingle();

    const hasOwner = !!targetOwner;
    const isSelfOwned = targetOwner?.user_id === userId;

    let newRelationship: string;
    if (isNewHouse || !hasOwner) {
      newRelationship = "OWNER";
    } else if (isSelfOwned) {
      newRelationship = "OWNER";
    } else {
      newRelationship = "FAMILY";
    }

    // ── Update or create user_houses record ──────────────────────────────
    const { data: currentUserHouse } = await supabase
      .from("user_houses")
      .select("id, house_id, relationship")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("is_primary", true)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (currentUserHouse) {
      const { error: updateError } = await supabase
        .from("user_houses")
        .update({ house_id: correctHouseId, relationship: newRelationship })
        .eq("id", currentUserHouse.id);

      if (updateError) {
        return NextResponse.json(
          { error: "Gagal memperbarui data rumah user" },
          { status: 500 },
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from("user_houses")
        .insert({
          id: uuidv7(),
          tenant_id: tenantId,
          user_id: userId,
          house_id: correctHouseId,
          relationship: newRelationship,
          is_primary: true,
          status: "ACTIVE",
          created_by: session.userId,
        });

      if (insertError) {
        return NextResponse.json(
          { error: "Gagal menghubungkan user ke rumah" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      houseId: correctHouseId,
      blokRumah: newBlokRumah,
      relationship: newRelationship,
      isNewHouse,
      hadOwner: hasOwner && !isSelfOwned,
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 },
    );
  }
}
