/**
 * Landing Page Server Data Layer
 *
 * Fetches landing page data directly on the server using Supabase.
 * This eliminates client-side hydration delay and HTTP overhead.
 */

import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { getPublicUrlSafe } from "@/lib/r2";
import type { HeaderProfile } from "@/types/landing";
import type { ResidentPostItem } from "@/components/landing/ResidentPostsSection";
import type { JualanGoodsWithMedia } from "@/types/jualan";
import type { JasaServiceWithMedia } from "@/types/database";

function formatRupiah(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1).replace(".", ",")} Jt`;
  }
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

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
  walletBalance: string;
}

export async function fetchLandingProfile(userId: string): Promise<LandingProfile> {
  const supabase = createServerClient();

  const { data: user } = await supabase
    .from("users")
    .select("full_name, avatar_path")
    .eq("id", userId)
    .single();

  const { data: houseLink } = await supabase
    .from("user_houses")
    .select("houses(blok_rumah)")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  const { data: walletRows } = await supabase
    .from("wallet_transactions")
    .select("amount, type")
    .eq("user_id", userId)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .in("type", ["income", "expense"]);

  let income = 0;
  let expense = 0;
  for (const row of walletRows ?? []) {
    const val = Number(row.amount ?? 0);
    if (row.type === "income") income += val;
    else if (row.type === "expense") expense += val;
  }
  const balance = income - expense;

  const blokRumah = (houseLink?.houses as any)?.blok_rumah ?? null;

  return {
    headerProfile: {
      name: user?.full_name || "Warga",
      profilePictureUrl: getPublicUrlSafe(user?.avatar_path ?? null),
      blokRumah: blokRumah ? `Blok - ${blokRumah}` : "Blok —",
    },
    walletBalance: formatRupiah(Math.max(balance, 0)),
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
        authorAvatar: getPublicUrlSafe(article.users?.avatar_path) ?? null,
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
        *,
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
      owner_avatar_url: getPublicUrlSafe(item.owner?.[0]?.avatar_path) || null,
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
  console.log("[DEBUG jasa SSR] fetchLandingJasa — userId:", userId);
  try {
    const supabase = createServerClient();

    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (!tenantUser) {
      console.log("[DEBUG jasa SSR] No tenant user found");
      return [];
    }

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
        created_at
      `,
      )
      .or(`is_available.eq.true,owner_user_id.eq.${userId}`)
      .eq("tenant_id", tenantUser.tenant_id)
      .order("created_at", { ascending: false })
      .range(0, 9);

    console.log("[DEBUG jasa SSR] Services query — count:", services?.length ?? 0, "error:", error);
    if (error || !services?.length) {
      if (error)
      console.log("[DEBUG jasa SSR] Services query error:", error);
      return [];
    }

    const ownerIds = [...new Set(services.map((s) => s.owner_user_id))];
    const { data: owners } = await supabase
      .from("users")
      .select(
        `
        id,
        full_name,
        wa_number,
        user_houses!user_houses_user_id_fkey(
          houses!inner(blok_rumah)
        )
      `,
      )
      .in("id", ownerIds)
      .eq("user_houses.is_primary", true);

    const ownerMap = new Map(
      (owners || []).map((u: any) => {
        const arr = u.user_houses as any[] || [];
        const house = arr[0]?.houses;
        return [u.id, { name: u.full_name?.trim() || "Unknown", blok: house?.blok_rumah ?? null, wa_number: u.wa_number || null }];
      }),
    );

    const categoryIds = [...new Set(services.map((s) => s.category_id))];
    const { data: categories } = await supabase
      .from("marketplace_categories")
      .select("id, name, icon")
      .in("id", categoryIds);

    const categoryMap = new Map(
      (categories || []).map((c) => [c.id, { name: c.name, icon: c.icon }]),
    );

    const serviceIds = services.map((s) => s.id);
    const { data: media } = await supabase
      .from("jasa_service_media")
      .select("service_id, url")
      .in("service_id", serviceIds)
      .eq("is_primary", true);

    const mediaMap = new Map((media || []).map((m) => [m.service_id, m.url]));

    const result = services.map((service) => {
      const owner = ownerMap.get(service.owner_user_id);
      const mapped = {
        ...service,
        owner_display_name: owner?.name?.trim() || "Unknown",
        owner_blok_rumah: owner?.blok ?? null,
        owner_wa_number: owner?.wa_number ?? null,
        category_icon: categoryMap.get(service.category_id)?.icon || null,
        primary_image_url: mediaMap.get(service.id) || null,
      };
      return mapped;
    });

    console.log("[DEBUG jasa SSR] Final result count:", result.length);
    return result;
  } catch (err) {
    console.log("[DEBUG jasa SSR] Catch error:", err);
    return [];
  }
}
