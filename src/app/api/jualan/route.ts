import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";

import {
  successResponse,
  errorResponse,
  badRequestResponse,
  unauthorizedResponse,
} from "@/lib/api-response";

/**
 * GET /api/jualan
 * List jualan goods with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const supabase = createServerClient();

    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", session.userId)
      .eq("status", "ACTIVE")
      .single();

    if (!tenantUser) {
      return errorResponse("User tidak ditemukan dalam tenant", 404);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category_id = searchParams.get("category_id");
    const q = searchParams.get("q");
    const min_price = searchParams.get("min_price");
    const max_price = searchParams.get("max_price");
    const is_featured = searchParams.get("is_featured");
    const sort = searchParams.get("sort") || "newest";
    const include_filters = searchParams.get("include_filters") !== "false";

    const offset = (page - 1) * limit;

    let query = supabase
      .from("jualan_goods")
      .select(
        `
        *,
        category:jualan_categories!inner (
          id,
          name,
          icon
        ),
        media:jualan_item_media (
          id,
          url,
          alt_text,
          sort_order,
          is_primary
        ),
        owner:users!jualan_goods_owner_user_id_fkey!inner (
          id,
          full_name,
          avatar_path
        )
      `,
        { count: "exact" },
      )
      .eq("tenant_id", tenantUser.tenant_id)
      .eq("is_active", true);

    if (category_id) {
      query = query.eq("category_id", category_id);
    }

    if (q) {
      query = query.or(
        `name.ilike.%${q}%,summary.ilike.%${q}%,description.ilike.%${q}%`,
      );
    }

    if (min_price) {
      query = query.gte("final_price", parseFloat(min_price));
    }

    if (max_price) {
      query = query.lte("final_price", parseFloat(max_price));
    }

    if (is_featured === "true") {
      query = query.eq("is_featured", true);
    }

    switch (sort) {
      case "price-asc":
        query = query.order("final_price", { ascending: true });
        break;
      case "price-desc":
        query = query.order("final_price", { ascending: false });
        break;
      case "best-selling":
        query = query.order("sold_count", { ascending: false });
        break;
      case "newest":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return errorResponse("Gagal memuat data barang", 500);
    }

    const totalPages = count ? Math.ceil(count / limit) : 1;

    const goods = (data || []).map((item: any) => ({
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

    return successResponse({
      goods,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: totalPages,
      },
      filters: include_filters
        ? {
            categories: await getCategories(supabase, tenantUser.tenant_id),
          }
        : undefined,
    });
  } catch (error) {
    return errorResponse("Terjadi kesalahan server", 500);
  }
}

/**
 * POST /api/jualan
 * Create new jualan goods listing
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const supabase = createServerClient();

    const body = await request.json();
    const {
      category_id,
      name,
      summary,
      description,
      base_price,
      discount_percent = 0,
      unit_label = "pcs",
      stock_qty = 0,
      wa_number,
      is_featured = false,
    } = body;

    if (!category_id || !name || !base_price) {
      return badRequestResponse(
        "Kategori, nama barang, dan harga wajib diisi",
      );
    }

    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", session.userId)
      .eq("status", "ACTIVE")
      .single();

    if (!tenantUser) {
      return errorResponse("User tidak ditemukan dalam tenant", 404);
    }

    const slug = generateSlug(name);

    const { data: userData } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", session.userId)
      .single();

    const { data: houseData } = await supabase
      .from("user_houses")
      .select("houses(blok_rumah)")
      .eq("user_id", session.userId)
      .eq("is_primary", true)
      .single();

    const owner_display_name = userData?.full_name || "Warga";
    const owner_blok_rumah = (houseData?.houses as any)?.blok_rumah || null;

    const { data, error } = await supabase
      .from("jualan_goods")
      .insert({
        tenant_id: tenantUser.tenant_id,
        category_id,
        owner_user_id: session.userId,
        owner_display_name,
        owner_blok_rumah,
        name,
        slug,
        summary,
        description,
        base_price: parseFloat(base_price),
        discount_percent: parseFloat(discount_percent),
        unit_label,
        stock_qty: parseInt(stock_qty),
        sold_count: 0,
        is_active: true,
        wa_number,
        is_featured,
        published_at: new Date().toISOString(),
        created_by: session.userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return badRequestResponse("Nama barang sudah digunakan");
      }
      return errorResponse("Gagal membuat listing barang", 500);
    }

    return successResponse(
      {
        id: data.id,
        name: data.name,
        slug: data.slug,
      },
      201,
    );
  } catch (error) {
    return errorResponse("Terjadi kesalahan server", 500);
  }
}

async function getCategories(supabase: any, tenantId: string) {
  const { data } = await supabase
    .from("jualan_categories")
    .select("id, name, icon")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("sort_order");

  return data || [];
}

function generateSlug(name: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${baseSlug}-${timestamp}-${random}`;
}
