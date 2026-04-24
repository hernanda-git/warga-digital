import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  successResponse,
  errorResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "@/lib/api-response";

/**
 * GET /api/jualan/[id]
 * Get single jualan goods detail with media
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const supabase = createServerClient();
    const resolvedParams = await params;

    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", session.userId)
      .eq("status", "ACTIVE")
      .single();

    if (!tenantUser) {
      return notFoundResponse("User tidak ditemukan dalam tenant");
    }

    const { data: goods, error } = await supabase
      .from("jualan_goods")
      .select(
        `
        *,
        category:jualan_categories (
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
        )
      `,
      )
      .eq("id", resolvedParams.id)
      .eq("tenant_id", tenantUser.tenant_id)
      .single();

    if (error || !goods) {
      return notFoundResponse("Barang tidak ditemukan");
    }

    const { data: ownerData } = await supabase
      .from("user_houses")
      .select("houses(blok_rumah)")
      .eq("user_id", goods.owner_user_id)
      .eq("is_primary", true)
      .single();

    const owner_blok_rumah = (ownerData?.houses as any)?.blok_rumah || null;

    const sortedMedia = (goods.media || []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order,
    );

    return successResponse({
      id: goods.id,
      name: goods.name,
      summary: goods.summary,
      description: goods.description,
      base_price: Number(goods.base_price),
      discount_percent: Number(goods.discount_percent),
      discount_amount: Number(goods.discount_amount || 0),
      final_price: Number(goods.final_price),
      currency_code: goods.currency_code,
      unit_label: goods.unit_label,
      stock_qty: goods.stock_qty,
      sold_count: goods.sold_count,
      is_active: goods.is_active,
      is_featured: goods.is_featured,
      wa_number: goods.wa_number,
      owner_display_name: goods.owner_display_name,
      owner_user_id: goods.owner_user_id,
      owner_blok_rumah,
      category_id: goods.category_id,
      category_name: goods.category?.name || "Lainnya",
      category_icon: goods.category?.icon || "📦",
      media: sortedMedia,
      created_at: goods.created_at,
      updated_at: goods.updated_at,
    });
  } catch (error) {
    return errorResponse("Terjadi kesalahan server", 500);
  }
}

/**
 * PUT /api/jualan/[id]
 * Update jualan goods
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const supabase = createServerClient();
    const resolvedParams = await params;

    const { data: existingGoods } = await supabase
      .from("jualan_goods")
      .select("owner_user_id")
      .eq("id", resolvedParams.id)
      .single();

    if (!existingGoods) {
      return notFoundResponse("Barang tidak ditemukan");
    }

    if (existingGoods.owner_user_id !== session.userId) {
      return forbiddenResponse("Anda bukan pemilik barang ini");
    }

    const body = await request.json();
    const {
      category_id,
      name,
      summary,
      description,
      base_price,
      discount_percent,
      unit_label,
      stock_qty,
      sold_count,
      wa_number,
      is_featured,
      is_active,
    } = body;

    const updateData: Record<string, any> = {
      updated_by: session.userId,
    };

    if (category_id !== undefined) updateData.category_id = category_id;
    if (name !== undefined) {
      updateData.name = name;
      updateData.slug = generateSlug(name);
    }
    if (summary !== undefined) updateData.summary = summary;
    if (description !== undefined) updateData.description = description;
    if (base_price !== undefined) updateData.base_price = parseFloat(base_price);
    if (discount_percent !== undefined)
      updateData.discount_percent = parseFloat(discount_percent);
    if (unit_label !== undefined) updateData.unit_label = unit_label;
    if (stock_qty !== undefined) updateData.stock_qty = parseInt(stock_qty);
    if (sold_count !== undefined) updateData.sold_count = parseInt(sold_count);
    if (wa_number !== undefined) updateData.wa_number = wa_number;
    if (is_featured !== undefined) updateData.is_featured = is_featured;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from("jualan_goods")
      .update(updateData)
      .eq("id", resolvedParams.id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return badRequestResponse("Nama barang sudah digunakan");
      }
      return errorResponse("Gagal memperbarui barang", 500);
    }

    return successResponse({
      id: data.id,
      name: data.name,
      updated_at: data.updated_at,
    });
  } catch (error) {
    return errorResponse("Terjadi kesalahan server", 500);
  }
}

/**
 * DELETE /api/jualan/[id]
 * Archive (soft delete) jualan goods by setting is_active = false
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const supabase = createServerClient();
    const resolvedParams = await params;

    const { data: existingGoods } = await supabase
      .from("jualan_goods")
      .select("owner_user_id")
      .eq("id", resolvedParams.id)
      .single();

    if (!existingGoods) {
      return notFoundResponse("Barang tidak ditemukan");
    }

    if (existingGoods.owner_user_id !== session.userId) {
      return forbiddenResponse("Anda bukan pemilik barang ini");
    }

    const { error } = await supabase
      .from("jualan_goods")
      .update({ is_active: false, updated_by: session.userId })
      .eq("id", resolvedParams.id);

    if (error) {
      return errorResponse("Gagal menghapus barang", 500);
    }

    return successResponse({ message: "Barang berhasil diarsipkan" });
  } catch (error) {
    return errorResponse("Terjadi kesalahan server", 500);
  }
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
