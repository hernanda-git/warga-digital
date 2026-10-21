import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";

import { THEMES } from "@/lib/themes";
import {
  normalizeWaNumber,
  validateNormalizedWaNumber,
} from "@/lib/phone-utils";
import { notifyAdmins } from "@/lib/notifications";

/** Mask WA number for display (e.g. +62 812-****-5678) */
function maskWaNumber(wa: string | null): string | null {
  if (!wa || wa.length < 6) return wa;
  const digits = wa.replace(/\D/g, "");
  if (digits.length < 10) return "+62 ***";
  const last = digits.slice(-4);
  return `+62 ***-****-${last}`;
}

/**
 * GET /api/profile
 * Returns current user profile (and primary house if any). Requires session.
 */
export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    type HouseLinkRow = {
      house_id: string;
      tenant_id: string;
      is_primary: boolean | null;
      houses:
        | {
            blok_rumah: string | null;
            address: string | null;
            name: string;
            community_id?: string | null;
            communities:
              | { id: string; code: string; name: string | null }
              | { id: string; code: string; name: string | null }[]
              | null;
          }
        | {
            blok_rumah: string | null;
            address: string | null;
            name: string;
            community_id?: string | null;
            communities:
              | { id: string; code: string; name: string | null }
              | { id: string; code: string; name: string | null }[]
              | null;
          }[]
        | null;
      tenants:
        | { id: string; name: string }
        | { id: string; name: string }[]
        | null;
    };

    type HouseMember = {
      userId: string;
      fullName: string;
      username: string | null;
      relationship: string;
      isPrimary: boolean;
    };
    type Residence = {
      tenant: { id: string; name: string };
      community: { id: string; code: string; name: string | null };
      house: {
        houseId: string;
        blok_rumah: string | null;
        address: string | null;
        name: string;
        members: HouseMember[];
      };
      isPrimary: boolean;
      roles: Array<{ id: number; name: string; description: string | null }>;
    };

    const [userRes, linksRes, ownedLinksRes] = await Promise.all([
      supabase
        .from("users")
        .select(
          "id, full_name, username, wa_number, email, date_of_birth, status, created_at, avatar_path, theme_id",
        )
        .eq("id", session.userId)
        .single(),

      // All active house links (multiple residences: different tenants/communities)
      supabase
        .from("user_houses")
        .select(
          `
          house_id,
          tenant_id,
          is_primary,
          houses (
            blok_rumah,
            address,
            name,
            community_id,
            communities (id, code, name)
          ),
          tenants (id, name)
        `,
        )
        .eq("user_id", session.userId)
        .eq("status", "ACTIVE")
        .order("is_primary", { ascending: false }),

      supabase
        .from("user_houses")
        .select("house_id")
        .eq("user_id", session.userId)
        .eq("relationship", "OWNER")
        .eq("status", "ACTIVE"),
    ]);

    const user = userRes.data;
    const userError = userRes.error;

    if (userError || !user) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan" },
        { status: 404 },
      );
    }

    const allLinks = (linksRes.data ?? []) as HouseLinkRow[];
    const ownedHouseLinks = ownedLinksRes.data ?? [];

    const residences: Residence[] = [];

    if (allLinks.length > 0) {
      const houseIds = [...new Set(allLinks.map((l) => l.house_id))];
      const tenantIds = [...new Set(allLinks.map((l) => l.tenant_id))];

      type MemberRow = {
        house_id: string;
        user_id: string;
        relationship: string;
        is_primary?: boolean;
        users:
          | { full_name: string; username: string | null }
          | { full_name: string; username: string | null }[]
          | null;
      };
      type RoleRow = {
        tenant_id: string;
        tenant_user_roles: Array<{
          roles:
            | { id: number; name: string; description: string | null }
            | { id: number; name: string; description: string | null }[]
            | null;
        }> | null;
      };
      type RoleInfo = {
        id: number;
        name: string;
        description: string | null;
      };

      // Members of every residence and every role the user holds, fetched
      // together instead of one round trip per residence.
      const [membersRes, rolesRes] = await Promise.all([
        supabase
          .from("user_houses")
          .select(
            "house_id, user_id, relationship, is_primary, users!user_houses_user_id_fkey(full_name, username)",
          )
          .in("house_id", houseIds)
          .eq("status", "ACTIVE")
          .order("is_primary", { ascending: false }),

        supabase
          .from("tenant_users")
          .select(
            "tenant_id, tenant_user_roles!inner(roles!inner(id, name, description))",
          )
          .eq("user_id", session.userId)
          .eq("status", "ACTIVE")
          .in("tenant_id", tenantIds)
          .is("tenant_user_roles.revoked_at", null),
      ]);

      const membersByHouse = new Map<string, HouseMember[]>();
      for (const row of (membersRes.data ?? []) as MemberRow[]) {
        const u = Array.isArray(row.users) ? row.users[0] : row.users;
        const list = membersByHouse.get(row.house_id) ?? [];
        list.push({
          userId: row.user_id,
          fullName: u?.full_name ?? "—",
          username: u?.username ?? null,
          relationship: row.relationship,
          isPrimary: row.is_primary ?? false,
        });
        membersByHouse.set(row.house_id, list);
      }

      const rolesByTenant = new Map<string, RoleInfo[]>();
      for (const tu of (rolesRes.data ?? []) as RoleRow[]) {
        const list: RoleInfo[] = [];
        for (const tur of tu.tenant_user_roles ?? []) {
          const r = Array.isArray(tur.roles) ? tur.roles[0] : tur.roles;
          if (r) {
            list.push({
              id: r.id,
              name: r.name,
              description: r.description ?? null,
            });
          }
        }
        rolesByTenant.set(tu.tenant_id, list);
      }

      for (const link of allLinks) {
        const houseRow = Array.isArray(link.houses)
          ? (link.houses[0] ?? null)
          : link.houses;
        const tenantRow = Array.isArray(link.tenants)
          ? (link.tenants[0] ?? null)
          : link.tenants;

        if (!houseRow || !tenantRow) continue;

        const communityRow = Array.isArray(houseRow.communities)
          ? (houseRow.communities[0] ?? null)
          : houseRow.communities;
        const community = communityRow
          ? {
              id: communityRow.id,
              code: communityRow.code,
              name: communityRow.name ?? null,
            }
          : { id: "", code: "", name: null };

        residences.push({
          tenant: { id: tenantRow.id, name: tenantRow.name },
          community,
          house: {
            houseId: link.house_id,
            blok_rumah: houseRow.blok_rumah ?? null,
            address: houseRow.address ?? null,
            name: houseRow.name ?? "",
            members: membersByHouse.get(link.house_id) ?? [],
          },
          isPrimary: link.is_primary ?? false,
          roles: rolesByTenant.get(link.tenant_id) ?? [],
        });
      }
    }

    const firstResidence = residences[0] ?? null;
    const house = firstResidence?.house ?? null;

    // Pending join requests for houses where current user is OWNER.
    // One round trip: request + house + requester name are joined server-side.
    let pendingJoinRequests: Array<{
      id: string;
      houseId: string;
      requesterFullName: string;
      blokRumah: string;
      createdAt: string;
    }> = [];
    if (ownedHouseLinks.length > 0) {
      const ownedHouseIds = ownedHouseLinks.map((r) => r.house_id);
      const { data: requests } = await supabase
        .from("house_join_requests")
        .select(
          `
          id,
          requester_user_id,
          house_id,
          created_at,
          houses (blok_rumah),
          users!house_join_requests_requester_user_id_fkey (full_name)
        `,
        )
        .in("house_id", ownedHouseIds)
        .eq("status", "PENDING");

      pendingJoinRequests = (requests ?? []).map((r) => {
        const houseRow = Array.isArray(r.houses) ? r.houses[0] : r.houses;
        const userRow = Array.isArray(r.users) ? r.users[0] : r.users;
        return {
          id: r.id,
          houseId: r.house_id,
          requesterFullName: userRow?.full_name ?? "—",
          blokRumah: houseRow?.blok_rumah ?? "—",
          createdAt: r.created_at,
        };
      });
    }

    // If user has no house, check for pending join request (requester side)
    let pendingJoinRequest: {
      blokRumah: string;
      ownerFullName: string;
      status: string;
    } | null = null;
    if (!firstResidence) {
      const { data: myRequest } = await supabase
        .from("house_join_requests")
        .select(
          `
          id,
          house_id,
          houses!inner (
            blok_rumah,
            user_houses!inner (
              user_id,
              relationship,
              status,
              users!user_houses_user_id_fkey (full_name)
            )
          )
        `,
        )
        .eq("requester_user_id", session.userId)
        .eq("status", "PENDING")
        .eq("houses.user_houses.relationship", "OWNER")
        .eq("houses.user_houses.status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      if (myRequest?.house_id) {
        const houseRow = Array.isArray(myRequest.houses)
          ? myRequest.houses[0]
          : myRequest.houses;
        const blokRumah = houseRow?.blok_rumah ?? "—";
        const ownerLinks = houseRow?.user_houses ?? [];
        const ownerLink = Array.isArray(ownerLinks)
          ? ownerLinks[0]
          : ownerLinks;
        const ownerUser = ownerLink?.users
          ? Array.isArray(ownerLink.users)
            ? ownerLink.users[0]
            : ownerLink.users
          : null;
        const ownerFullName = ownerUser?.full_name ?? "—";
        pendingJoinRequest = { blokRumah, ownerFullName, status: "PENDING" };
      }
    }

    const tenant = firstResidence?.tenant ?? null;
    const community = firstResidence?.community ?? null;

    // Deduplicated union of roles across ALL residences (not just the first one).
    // A user who lives in multiple houses may hold an admin role in a non-primary
    // residence; flattening here ensures profile.roles is always complete.
    const seenRoleIds = new Set<number>();
    const roles = residences
      .flatMap((r) => r.roles)
      .filter((role) => {
        if (seenRoleIds.has(role.id)) return false;
        seenRoleIds.add(role.id);
        return true;
      });

    // Badges (user's earned badges) — one round trip with the badge joined.
    const { data: userBadgeRows } = await supabase
      .from("user_badges")
      .select(
        "badge_id, earned_at, badges (id, code, name, description, icon, sort_order)",
      )
      .eq("user_id", session.userId)
      .order("earned_at", { ascending: false });
    const badges: Array<{
      id: number;
      code: string;
      name: string;
      description: string | null;
      icon: string;
      earnedAt: string;
    }> = [];
    if (userBadgeRows && userBadgeRows.length > 0) {
      type BadgeInfo = {
        id: number;
        code: string;
        name: string;
        description: string | null;
        icon: string;
        sort_order: number;
      };
      type BadgeRow = {
        badge_id: number;
        earned_at: string;
        badges: BadgeInfo | BadgeInfo[] | null;
      };

      const joined = (userBadgeRows as BadgeRow[])
        .map((r) => {
          const b = Array.isArray(r.badges) ? r.badges[0] : r.badges;
          return b ? { badge: b, earnedAt: r.earned_at } : null;
        })
        .filter(
          (entry): entry is { badge: BadgeInfo; earnedAt: string } =>
            entry !== null,
        )
        .sort((a, b) => a.badge.sort_order - b.badge.sort_order);

      for (const { badge: b, earnedAt } of joined) {
        badges.push({
          id: b.id,
          code: b.code,
          name: b.name,
          description: b.description ?? null,
          icon: b.icon,
          earnedAt: earnedAt ?? b.id.toString(),
        });
      }
    }

    const profilePictureUrl = user.avatar_path;

    const themeId = (user as { theme_id?: string }).theme_id ?? "green";

    return NextResponse.json({
      id: user.id,
      fullName: user.full_name,
      username: user.username ?? null,
      waNumber: user.wa_number ?? null,
      waNumberMasked: maskWaNumber(user.wa_number),
      email: user.email ?? null,
      dateOfBirth: user.date_of_birth ?? null,
      status: user.status,
      createdAt: user.created_at,
      profilePictureUrl,
      themeId,
      tenant,
      community,
      roles,
      badges,
      house,
      residences,
      pendingJoinRequests,
      pendingJoinRequest,
    });
  } catch (err) {
    return NextResponse.json({ error: "Gagal memuat profil" }, { status: 500 });
  }
}

/** Valid theme ids for appearance (must match src/lib/themes.ts) */
const VALID_THEME_IDS = THEMES.map((t) => t.id);

/** Allowed fields for profile update (no wa_number, pin_hash, status) */
const ALLOWED_KEYS = [
  "full_name",
  "email",
  "date_of_birth",
  "username",
  "theme_id",
  "wa_number",
] as const;

/**
 * PATCH /api/profile
 * Update current user profile. Requires session.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_KEYS) {
      if (key in body) {
        const v = body[key];
        if (key === "username") {
          if (v === null || v === "") {
            updates[key] = null;
          } else if (typeof v === "string") {
            const trimmed = v.trim();
            if (trimmed.length < 3 || trimmed.length > 30) {
              return NextResponse.json(
                { error: "Username harus 3–30 karakter" },
                { status: 400 },
              );
            }
            if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
              return NextResponse.json(
                { error: "Username hanya huruf, angka, dan underscore" },
                { status: 400 },
              );
            }
            updates[key] = trimmed;
          }
        } else if (key === "wa_number") {
          if (v === null || v === "") {
            updates[key] = null;
          } else if (typeof v === "string") {
            const normalized = normalizeWaNumber(v.trim());
            const waError = validateNormalizedWaNumber(normalized);
            if (waError) {
              return NextResponse.json({ error: waError }, { status: 400 });
            }
            updates[key] = normalized;
          }
        } else if (key === "theme_id") {
          if (typeof v !== "string" || !v.trim()) {
            updates[key] = "green";
          } else if (VALID_THEME_IDS.includes(v.trim())) {
            updates[key] = v.trim();
          } else {
            return NextResponse.json(
              { error: "Tema tidak valid" },
              { status: 400 },
            );
          }
        } else if (key === "full_name") {
          if (typeof v !== "string" || !v.trim()) {
            return NextResponse.json(
              { error: "Nama lengkap wajib diisi" },
              { status: 400 },
            );
          }
          if (v.trim().length < 2) {
            return NextResponse.json(
              { error: "Nama minimal 2 karakter" },
              { status: 400 },
            );
          }
          updates.full_name = v.trim();
        } else if (key === "email") {
          updates[key] =
            v === null || v === "" ? null : String(v).trim() || null;
        } else if (key === "date_of_birth") {
          updates[key] =
            v === null || v === "" ? null : String(v).trim() || null;
        }
      }
    }

    // Validation: username or wa_number must not both be empty
    const hasUsername =
      updates.username !== null &&
      updates.username !== undefined &&
      updates.username !== "";
    const hasWaNumber =
      updates.wa_number !== null &&
      updates.wa_number !== undefined &&
      updates.wa_number !== "";
    const updatingUsername = "username" in body;
    const updatingWaNumber = "wa_number" in body;

    if (updatingUsername || updatingWaNumber) {
      // Get current user's data to check existing values
      const supabaseForCheck = createServerClient();
      const { data: currentUser } = await supabaseForCheck
        .from("users")
        .select("username, wa_number")
        .eq("id", session.userId)
        .single();

      const finalUsername = updatingUsername
        ? (updates.username ?? null)
        : (currentUser?.username ?? null);
      const finalWaNumber = updatingWaNumber
        ? (updates.wa_number ?? null)
        : (currentUser?.wa_number ?? null);

      if (!finalUsername && !finalWaNumber) {
        return NextResponse.json(
          {
            error:
              "Username atau nomor WhatsApp wajib diisi (minimal satu harus aktif)",
          },
          { status: 400 },
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data yang diubah" },
        { status: 400 },
      );
    }

    updates.updated_at = new Date().toISOString();
    updates.updated_by = session.userId;

    // ── Pre-fetch old values for change-detection (wa_number, username, email) ─
    const sensitiveKeys = ["wa_number", "username", "email"] as const;
    const trackingFields = sensitiveKeys.filter((k) => k in body);
    let oldSensitiveValues: {
      wa_number?: string | null;
      username?: string | null;
      email?: string | null;
      full_name?: string | null;
    } = {};
    if (trackingFields.length > 0) {
      const supabasePre = createServerClient();
      const { data: preUser } = await supabasePre
        .from("users")
        .select("wa_number, username, email, full_name")
        .eq("id", session.userId)
        .single();
      oldSensitiveValues = (preUser as typeof oldSensitiveValues) ?? {};
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", session.userId)
      .select(
        "id, full_name, username, wa_number, email, date_of_birth, theme_id, updated_at",
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Username, email, atau nomor WhatsApp sudah dipakai" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Gagal menyimpan profil" },
        { status: 500 },
      );
    }

    // ── Notify all admins if a sensitive field actually changed ───────────────
    if (trackingFields.length > 0) {
      const changedLabels: string[] = [];
      if (
        "wa_number" in body &&
        String(updates.wa_number ?? "") !==
          String(oldSensitiveValues.wa_number ?? "")
      ) {
        changedLabels.push("nomor WhatsApp");
      }
      if (
        "username" in body &&
        String(updates.username ?? "") !==
          String(oldSensitiveValues.username ?? "")
      ) {
        changedLabels.push("username");
      }
      if (
        "email" in body &&
        String(updates.email ?? "") !== String(oldSensitiveValues.email ?? "")
      ) {
        changedLabels.push("email");
      }

      if (changedLabels.length > 0) {
        const displayName =
          (data as { full_name?: string | null }).full_name?.trim() ||
          oldSensitiveValues.full_name?.trim() ||
          "Warga";
        await notifyAdmins(
          supabase,
          {
            tenant_id: DEFAULT_TENANT_ID,
            actor_user_id: session.userId,
            type: "SYSTEM",
            priority: "NORMAL",
            title: "Profil Warga Diperbarui",
            body: `${displayName} mengubah ${changedLabels.join(" dan ")}.`,
            action_url: "/admin/warga",
            entity_table: "users",
            entity_id: session.userId,
            metadata: { changedFields: changedLabels },
            created_by: session.userId,
          },
          session.userId, // exclude the actor (they changed their own profile)
        );
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: data.id,
        fullName: data.full_name,
        username: data.username ?? null,
        waNumber: maskWaNumber(data.wa_number),
        email: data.email ?? null,
        dateOfBirth: data.date_of_birth ?? null,
        themeId: (data as { theme_id?: string }).theme_id ?? "green",
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal menyimpan profil" },
      { status: 500 },
    );
  }
}
