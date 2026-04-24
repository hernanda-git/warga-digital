import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireCanManageOrganisation } from "../../../require-manage";
import { getSessionFromCookie } from "@/lib/auth/session";
import { notifyAllActiveUsers } from "@/lib/notifications";

const VACANT_LABEL = "Vacant";

type RouteContext = { params: Promise<{ id: string }> };

interface CustomDataInput {
  fullName: string;
  blockName: string;
  whatsappNumber: string;
  profilePictureUrl?: string | null;
}

async function getUserDisplay(supabase: ReturnType<typeof createServerClient>, userId: string) {
  const { data: user, error: uErr } = await supabase
    .from("users")
    .select("id, full_name, wa_number, avatar_path")
    .eq("id", userId)
    .single();
  if (uErr || !user) return null;
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const profilePictureUrl =
    user.avatar_path && baseUrl
      ? `${baseUrl}/storage/v1/object/public/avatars/${user.avatar_path}`
      : null;

  const { data: primaryLink } = await supabase
    .from("user_houses")
    .select("house_id")
    .eq("user_id", userId)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("status", "ACTIVE")
    .eq("is_primary", true)
    .limit(1)
    .maybeSingle();
  let blockName = "";
  if (primaryLink?.house_id) {
    const { data: house } = await supabase
      .from("houses")
      .select("blok_rumah")
      .eq("id", primaryLink.house_id)
      .single();
    if (house?.blok_rumah) blockName = house.blok_rumah;
  }

  return {
    user_id: user.id,
    full_name: user.full_name,
    block_name: blockName,
    whatsapp_number: user.wa_number ?? "",
    profile_picture_url: profilePictureUrl,
  };
}

/**
 * POST /api/organisation/roles/[id]/members
 * Body: { userId: string | null, custom?: { fullName, blockName, whatsappNumber, profilePictureUrl } }
 * - userId null or "vacant" → create Vacant slot.
 * - userId = registered user id in this community → create member linked to that user.
 * - custom data overrides the displayed information if provided
 */
export async function POST(request: Request, context: RouteContext) {
  const forbidden = await requireCanManageOrganisation();
  if (forbidden) return forbidden;

  const { id: roleId } = await context.params;
  if (!roleId) return NextResponse.json({ message: "ID peran tidak valid." }, { status: 400 });

    try {
      const body = (await request.json()) as { userId?: string | null; custom?: CustomDataInput };
      const rawUserId = body.userId;
      const customData = body.custom;
      
      const isVacant =
        rawUserId === null ||
        rawUserId === undefined ||
        rawUserId === "" ||
        String(rawUserId).toLowerCase() === "vacant";

    const supabase = createServerClient();

    const { data: role } = await supabase
      .from("organisation_roles")
      .select("id")
      .eq("id", roleId)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .single();
    if (!role) return NextResponse.json({ message: "Peran tidak ditemukan." }, { status: 404 });

    const { data: maxOrder } = await supabase
      .from("organisation_members")
      .select("sort_order")
      .eq("organisation_role_id", roleId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = (maxOrder?.sort_order ?? -1) + 1;

    if (isVacant) {
      const { data, error } = await supabase
        .from("organisation_members")
        .insert({
          organisation_role_id: roleId,
          user_id: null,
          full_name: customData?.fullName ?? VACANT_LABEL,
          block_name: customData?.blockName ?? "",
          whatsapp_number: customData?.whatsappNumber ?? "",
          profile_picture_url: customData?.profilePictureUrl ?? null,
          sort_order: sortOrder,
          updated_at: new Date().toISOString(),
        })
        .select("id, user_id, full_name, block_name, whatsapp_number, profile_picture_url, sort_order")
        .single();

      if (error) {
        return NextResponse.json({ message: "Gagal menambah slot Vacant." }, { status: 500 });
      }

      // Insert custom data if provided
      if (customData) {
        const { data: customInsertData, error: customError } = await supabase.from("organisation_member_customs").insert({
          organisation_member_id: data.id,
          custom_full_name: customData.fullName,
          custom_block_name: customData.blockName,
          custom_whatsapp_number: customData.whatsappNumber,
          custom_profile_picture_url: customData.profilePictureUrl ?? null,
        }).select();
        
        if (customError) {
        } else {
        }
      }

      return NextResponse.json({
        id: data.id,
        userId: data.user_id ?? null,
        fullName: data.full_name,
        blockName: data.block_name ?? "",
        whatsappNumber: data.whatsapp_number,
        profilePictureUrl: data.profile_picture_url ?? null,
        sortOrder: data.sort_order ?? 0,
      });
    }

    const userId = String(rawUserId).trim();
    const display = await getUserDisplay(supabase, userId);
    if (!display) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan atau bukan warga terdaftar di komunitas ini." },
        { status: 400 }
      );
    }

    const { data: inTenant } = await supabase
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (!inTenant) {
      return NextResponse.json(
        { message: "Pengguna bukan warga terdaftar di komunitas ini." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("organisation_members")
      .insert({
        organisation_role_id: roleId,
        user_id: display.user_id,
        full_name: customData?.fullName ?? display.full_name,
        block_name: customData?.blockName ?? display.block_name,
        whatsapp_number: customData?.whatsappNumber ?? display.whatsapp_number,
        profile_picture_url: customData?.profilePictureUrl ?? display.profile_picture_url,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      })
      .select("id, user_id, full_name, block_name, whatsapp_number, profile_picture_url, sort_order")
      .single();

    if (error) {
      return NextResponse.json({ message: "Gagal menambah anggota." }, { status: 500 });
    }

    // Insert custom data if provided
    if (customData) {
      const { data: customInsertData, error: customError } = await supabase.from("organisation_member_customs").insert({
        organisation_member_id: data.id,
        custom_full_name: customData.fullName,
        custom_block_name: customData.blockName,
        custom_whatsapp_number: customData.whatsappNumber,
        custom_profile_picture_url: customData.profilePictureUrl ?? null,
      }).select();
      
      if (customError) {
      } else {
      }
    }

    // Send notification
    const session = await getSessionFromCookie();
    const displayName = customData?.fullName ?? display.full_name;
    await notifyAllActiveUsers(
      supabase,
      {
        tenant_id: DEFAULT_TENANT_ID,
        actor_user_id: session?.userId ?? null,
        type: "ORGANISASI",
        priority: "NORMAL",
        title: "Pengurus RT Diperbarui",
        body: `${displayName} telah ditambahkan ke susunan pengurus RT.`,
        action_url: "/organisasi",
        entity_table: "organisation_members",
        entity_id: data.id,
        metadata: { assignedUserId: userId, fullName: displayName },
        created_by: session?.userId ?? null,
      },
      session?.userId,
    );

    return NextResponse.json({
      id: data.id,
      userId: data.user_id ?? null,
      fullName: data.full_name,
      blockName: data.block_name ?? "",
      whatsappNumber: data.whatsapp_number,
      profilePictureUrl: data.profile_picture_url ?? null,
      sortOrder: data.sort_order ?? 0,
    });
  } catch (error) {
    return NextResponse.json({ message: "Gagal menambah anggota." }, { status: 500 });
  }
}
