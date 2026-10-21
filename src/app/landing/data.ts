/**
 * Landing Page Server Data Layer
 *
 * Fetches landing page data directly on the server using Supabase.
 * This eliminates client-side hydration delay and HTTP overhead.
 */

import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import type { HeaderProfile } from "@/types/landing";
import type { ResidentPostItem } from "@/components/landing/ResidentPostsSection";
import type { JualanGoodsWithMedia } from "@/types/jualan";
import type { JasaServiceWithMedia } from "@/types/database";

// ─── Auth Guard ─────────────────────────────────────────────────────────────

export async function requireAuth() {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/auth/login");
  }
  return session;
}

// ─── Profile ────────────────────────────────────────────────────────────────

export interface LandingProfile {
  headerProfile: HeaderProfile;
}

export async function fetchLandingProfile(userId: string): Promise<LandingProfile> {
  const supabase = createServerClient();

  const { data: user } = await supabase
    .from("users")
    .select(
      `
      full_name,
      avatar_path,
      user_houses!user_houses_user_id_fkey (
        is_primary,
        houses!user_houses_house_id_fkey (blok_rumah)
      )
    `,
    )
    .eq("id", userId)
    .single();

  const userHouses = (user?.user_houses ?? []) as unknown as Array<{
    is_primary: boolean | null;
    houses: { blok_rumah: string | null } | Array<{ blok_rumah: string | null }> | null;
  }>;
  const primaryHouse =
    userHouses.find((uh) => uh.is_primary) ?? userHouses[0] ?? null;
  const house = Array.isArray(primaryHouse?.houses)
    ? primaryHouse.houses[0]
    : primaryHouse?.houses;
  const blokRumah = house?.blok_rumah ?? null;

  return {
    headerProfile: {
      name: user?.full_name || "Warga",
      profilePictureUrl: user?.avatar_path ?? null,
      blokRumah: blokRumah ? `Blok - ${blokRumah}` : "Blok —",
    },
  };
}

// ─── Articles ───────────────────────────────────────────────────────────────

export async function fetchLandingArticles(): Promise<{
  articles: ResidentPostItem[];
  error: string | null;
}> {
  try {
    const supabase = createServerClient();

    const { data: rows, error } = await supabase
      .from("articles")
      .select(
        `
        id,
        title,
        slug,
        excerpt,
        content,
        featured_image_url,
        published_at,
        created_at,
        author_id,
        users!articles_author_id_fkey (
          id,
          full_name,
          avatar_path,
          user_houses!user_houses_user_id_fkey (
            house_id,
            is_primary,
            houses!user_houses_house_id_fkey (
              blok_rumah
            )
          )
        )
      `,
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .range(0, 4);

    if (error) {
      return { articles: [], error: "Gagal memuat artikel" };
    }

    const articles: ResidentPostItem[] = (rows ?? []).map((article: any) => {
      const userHouses = article.users?.user_houses || [];
      const primaryHouse = userHouses.find((uh: any) => uh.is_primary) || userHouses[0];
      const blokRumah = primaryHouse?.houses?.blok_rumah || null;

      return {
        id: article.slug,
        title: article.title,
        excerpt: article.excerpt ?? undefined,
        content: article.content ?? undefined,
        imageUrl: article.featured_image_url ?? null,
        author: article.users?.full_name ?? "Anonim",
        authorAvatar: article.users?.avatar_path ?? null,
        authorBlock: blokRumah,
        createdAt: article.created_at,
      };
    });

    return { articles, error: null };
  } catch (err) {
    return { articles: [], error: "Gagal memuat artikel" };
  }
}

// ─── Jualan Goods ───────────────────────────────────────────────────────────

export async function fetchLandingJualan(userId: string): Promise<JualanGoodsWithMedia[]> {
  try {
    const supabase = createServerClient();

    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .single();

    if (!tenantUser) return [];

    const { data: rows, error } = await supabase
      .from("jualan_goods")
      .select(
        `
        id,
        name,
        summary,
        base_price,
        discount_percent,
        discount_amount,
        final_price,
        currency_code,
        unit_label,
        stock_qty,
        sold_count,
        is_active,
        is_featured,
        wa_number,
        owner_display_name,
        owner_blok_rumah,
        created_at,
        category:jualan_categories!inner (id, name, icon),
        media:jualan_item_media (id, url, alt_text, sort_order, is_primary),
        owner:users!jualan_goods_owner_user_id_fkey!inner (id, full_name, avatar_path)
      `,
      )
      .eq("tenant_id", tenantUser.tenant_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .range(0, 5);

    if (error) {
      return [];
    }

    return (rows ?? []).map((item: any) => ({
      id: item.id,
      name: item.name,
      summary: item.summary,
      base_price: Number(item.base_price),
      discount_percent: Number(item.discount_percent),
      discount_amount: Number(item.discount_amount || 0),
      final_price: Number(item.final_price),
      currency_code: item.currency_code,
      unit_label: item.unit_label,
      stock_qty: item.stock_qty,
      sold_count: item.sold_count,
      is_active: item.is_active,
      is_featured: item.is_featured,
      wa_number: item.wa_number,
      owner_display_name: item.owner?.[0]?.full_name || item.owner_display_name,
      owner_blok_rumah: item.owner_blok_rumah,
      owner_avatar_url: item.owner?.[0]?.avatar_path ?? null,
      category_name: item.category?.[0]?.name || "Lainnya",
      category_icon: item.category?.[0]?.icon || "📦",
      primary_image_url:
        item.media?.find((m: any) => m.is_primary)?.url ||
        item.media?.[0]?.url ||
        null,
      media_count: item.media?.length || 0,
    }));
  } catch (err) {
    return [];
  }
}

// ─── Jasa Services ──────────────────────────────────────────────────────────

export async function fetchLandingJasa(userId: string): Promise<JasaServiceWithMedia[]> {
  try {
    const supabase = createServerClient();

    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (!tenantUser) return [];

    const { data: services, error } = await supabase
      .from("jasa_services")
      .select(
        `
        id,
        name,
        description,
        estimated_price,
        hari_operasional,
        is_available,
        wa_number,
        owner_user_id,
        category_id,
        created_at,
        owner:users!jasa_services_owner_user_id_fkey (
          id,
          full_name,
          wa_number,
          user_houses!user_houses_user_id_fkey (
            is_primary,
            houses!user_houses_house_id_fkey (blok_rumah)
          )
        ),
        category:marketplace_categories!jasa_services_category_id_fkey (
          id,
          name,
          icon
        ),
        media:jasa_service_media (service_id, url, is_primary)
      `,
      )
      .or(`is_available.eq.true,owner_user_id.eq.${userId}`)
      .eq("tenant_id", tenantUser.tenant_id)
      .order("created_at", { ascending: false })
      .range(0, 9);

    if (error || !services?.length) return [];

    return (services as any[]).map((service) => {
      const ownerHouses = (service.owner?.user_houses ?? []) as Array<{
        is_primary: boolean | null;
        houses: { blok_rumah: string | null } | null;
      }>;
      const primaryHouse =
        ownerHouses.find((uh) => uh.is_primary) ?? ownerHouses[0] ?? null;
      const media = (service.media ?? []) as Array<{
        url: string | null;
        is_primary: boolean | null;
      }>;
      const primaryMedia = media.find((m) => m.is_primary) ?? media[0] ?? null;

      return {
        ...service,
        owner_display_name: service.owner?.full_name?.trim() || "Unknown",
        owner_blok_rumah: primaryHouse?.houses?.blok_rumah ?? null,
        owner_wa_number: service.owner?.wa_number ?? null,
        category_icon: service.category?.icon ?? null,
        primary_image_url: primaryMedia?.url ?? null,
      };
    });
  } catch {
    return [];
  }
}
