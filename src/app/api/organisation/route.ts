import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import type { OrganisationTreeApi, OrganisationRoleApi, OrganisationMemberApi } from "@/lib/organisation-api";

/**
 * GET /api/organisation
 * Returns full organisation tree (roles + members) for the default tenant.
 * Requires authenticated session (organisasi page is behind login).
 */
export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data: roles, error: rolesError } = await supabase
      .from("organisation_roles")
      .select("id, title, sort_order")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .order("sort_order", { ascending: true });

    if (rolesError) {
      return NextResponse.json({ message: "Gagal memuat organisasi" }, { status: 500 });
    }

    if (!roles?.length) {
      return NextResponse.json({ roles: [] } satisfies OrganisationTreeApi);
    }

    const roleIds = roles.map((r) => r.id);
    const { data: members, error: membersError } = await supabase
      .from("organisation_members")
      .select("id, organisation_role_id, user_id, full_name, block_name, whatsapp_number, profile_picture_url, sort_order")
      .in("organisation_role_id", roleIds)
      .order("sort_order", { ascending: true });

    if (membersError) {
      return NextResponse.json({ message: "Gagal memuat organisasi" }, { status: 500 });
    }

    const memberList = members ?? [];
    const userIds = [...new Set(memberList.map((m) => m.user_id).filter(Boolean))] as string[];
    let userAvatarMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, avatar_path")
        .in("id", userIds);
      const r2BaseUrl = process.env.R2_PUBLIC_BASE_URL;
      userAvatarMap = (users ?? []).reduce<Record<string, string | null>>((acc, u) => {
        acc[u.id] =
          u.avatar_path && r2BaseUrl
            ? `${r2BaseUrl}/${u.avatar_path}`
            : null;
        return acc;
      }, {});
    }

    // Fetch custom data for all members
    const memberIds = memberList.map((m) => m.id);
    
    let customDataMap: Record<string, { fullName: string; blockName: string; whatsappNumber: string; profilePictureUrl: string | null }> = {};
    if (memberIds.length > 0) {
      const { data: customs, error: customsError } = await supabase
        .from("organisation_member_customs")
        .select("organisation_member_id, custom_full_name, custom_block_name, custom_whatsapp_number, custom_profile_picture_url")
        .in("organisation_member_id", memberIds);
      
      if (customsError) {
      }
      
      customDataMap = (customs ?? []).reduce<Record<string, { fullName: string; blockName: string; whatsappNumber: string; profilePictureUrl: string | null }>>((acc, c) => {
        acc[c.organisation_member_id] = {
          fullName: c.custom_full_name,
          blockName: c.custom_block_name ?? "",
          whatsappNumber: c.custom_whatsapp_number,
          profilePictureUrl: c.custom_profile_picture_url ?? null,
        };
        return acc;
      }, {});
    }

    const membersByRole = memberList.reduce<Record<string, OrganisationMemberApi[]>>((acc, m) => {
      const roleId = m.organisation_role_id;
      if (!acc[roleId]) acc[roleId] = [];
      const profilePictureUrl = m.user_id
        ? (userAvatarMap[m.user_id] ?? m.profile_picture_url ?? null)
        : (m.profile_picture_url ?? null);
      const custom = customDataMap[m.id] ?? null;
      
      acc[roleId].push({
        id: m.id,
        userId: m.user_id ?? null,
        fullName: custom?.fullName ?? m.full_name,
        blockName: custom?.blockName ?? (m.block_name ?? ""),
        whatsappNumber: custom?.whatsappNumber ?? m.whatsapp_number,
        profilePictureUrl: custom?.profilePictureUrl ?? profilePictureUrl,
        sortOrder: m.sort_order ?? 0,
        custom: custom || null,
      });
      return acc;
    }, {});

    const tree: OrganisationTreeApi = {
      roles: roles.map((r) => ({
        id: r.id,
        title: r.title,
        sortOrder: r.sort_order ?? 0,
        members: membersByRole[r.id] ?? [],
      })),
    };

    return NextResponse.json(tree);
  } catch (error) {
    return NextResponse.json({ message: "Gagal memuat organisasi" }, { status: 500 });
  }
}
