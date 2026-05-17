import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  badRequestResponse,
  forbiddenResponse,
} from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/admin-guard";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import type { AssetItem } from "@/types/asset-rt";

/**
 * GET /api/asset-rt/[id]
 * Get a single asset by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    if (!id) {
      return badRequestResponse("ID aset tidak valid.");
    }

    const supabase = createServerClient();

    const { data: asset, error } = await supabase
      .from("rt_assets")
      .select(
        `
        *,
        category:rt_asset_categories(*),
        created_by_user:users!rt_assets_created_by_fkey(full_name),
        updated_by_user:users!rt_assets_updated_by_fkey(full_name)
      `,
      )
      .eq("id", id)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .is("deleted_at", null)
      .single();

    if (error || !asset) {
      if (error?.code === "PGRST116") {
        return notFoundResponse("Aset tidak ditemukan.");
      }
      console.error("[asset-rt/:id] GET error:", error);
      return errorResponse("Gagal memuat detail aset.", 500);
    }

    const mapped: AssetItem = {
      id: asset.id,
      tenant_id: asset.tenant_id,
      community_id: asset.community_id,
      name: asset.name,
      description: asset.description,
      location: asset.location,
      category_id: asset.category_id,
      image_url: asset.image_url,
      category: asset.category
        ? {
            id: asset.category.id,
            name: asset.category.name,
            sort_order: asset.category.sort_order,
          }
        : null,
      quantity: asset.quantity,
      unit_label: asset.unit_label,
      is_used: asset.is_used,
      tags: asset.tags ?? [],
      purchase_date: asset.purchase_date,
      notes: asset.notes,
      created_by: asset.created_by,
      updated_by: asset.updated_by,
      created_by_full_name: asset.created_by_user?.full_name ?? null,
      updated_by_full_name: asset.updated_by_user?.full_name ?? null,
      created_at: asset.created_at,
      updated_at: asset.updated_at,
    };

    return successResponse(mapped);
  } catch (err) {
    console.error("[asset-rt/:id] GET unexpected error:", err);
    return errorResponse("Terjadi kesalahan saat memuat detail aset.", 500);
  }
}

/**
 * PUT /api/asset-rt/[id]
 * Update an existing asset.
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

    const { id } = await params;
    if (!id) {
      return badRequestResponse("ID aset tidak valid.");
    }

    const supabase = createServerClient();

    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return forbiddenResponse("Hanya admin RT yang dapat mengubah aset.");
    }

    const body = await request.json();

    // Verify asset exists
    const { data: existing } = await supabase
      .from("rt_assets")
      .select("id")
      .eq("id", id)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return notFoundResponse("Aset tidak ditemukan.");
    }

    const tags: string[] | undefined =
      body.tags !== undefined
        ? body.tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean)
        : undefined;

    // Parse is_used: "true" → true, "false" → false, "null" → null
    let isUsed: boolean | null | undefined = undefined;
    if (body.is_used === "true" || body.is_used === true) isUsed = true;
    else if (body.is_used === "false" || body.is_used === false) isUsed = false;
    else if (body.is_used === "null" || body.is_used === null) isUsed = null;

    const updateData: Record<string, any> = {
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined)
      updateData.description = body.description?.trim() || null;
    if (body.location !== undefined)
      updateData.location = body.location?.trim() || null;
    if (body.image_url !== undefined)
      updateData.image_url = body.image_url?.trim() || null;
    if (body.category_id !== undefined)
      updateData.category_id = body.category_id || null;
    if (body.quantity !== undefined)
      updateData.quantity = Math.max(1, parseInt(body.quantity, 10));
    if (body.unit_label !== undefined)
      updateData.unit_label = body.unit_label?.trim() || "Unit";
    if (body.is_used !== undefined) updateData.is_used = isUsed;
    if (body.tags !== undefined) updateData.tags = tags;
    if (body.purchase_date !== undefined)
      updateData.purchase_date = body.purchase_date || null;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;

    const { data: updated, error } = await supabase
      .from("rt_assets")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[asset-rt/:id] PUT error:", error);
      return errorResponse("Gagal memperbarui aset.", 500);
    }

    return successResponse(updated);
  } catch (err) {
    console.error("[asset-rt/:id] PUT unexpected error:", err);
    return errorResponse("Terjadi kesalahan saat memperbarui aset.", 500);
  }
}

/**
 * DELETE /api/asset-rt/[id]
 * Soft-delete an asset.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    if (!id) {
      return badRequestResponse("ID aset tidak valid.");
    }

    const supabase = createServerClient();

    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return forbiddenResponse("Hanya admin RT yang dapat menghapus aset.");
    }

    const { data: existing } = await supabase
      .from("rt_assets")
      .select("id")
      .eq("id", id)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .is("deleted_at", null)
      .single();

    if (!existing) {
      return notFoundResponse("Aset tidak ditemukan.");
    }

    const { error } = await supabase
      .from("rt_assets")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: session.userId,
      })
      .eq("id", id);

    if (error) {
      console.error("[asset-rt/:id] DELETE error:", error);
      return errorResponse("Gagal menghapus aset.", 500);
    }

    return successResponse({ deleted: true });
  } catch (err) {
    console.error("[asset-rt/:id] DELETE unexpected error:", err);
    return errorResponse("Terjadi kesalahan saat menghapus aset.", 500);
  }
}
