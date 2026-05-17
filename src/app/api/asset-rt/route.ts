import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
} from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/admin-guard";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import type { AssetItem } from "@/types/asset-rt";

const VALID_SORT_OPTIONS = [
  "newest",
  "oldest",
  "name_asc",
  "name_desc",
] as const;

/**
 * GET /api/asset-rt
 * List assets with pagination, search, category filter, and sorting.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const supabase = createServerClient();
    const searchParams = request.nextUrl.searchParams;

    const search = searchParams.get("search")?.trim() || "";
    const categoryFilter = searchParams.get("category")?.trim() || "";
    const sortBy = searchParams.get("sort")?.trim() || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );

    if (!VALID_SORT_OPTIONS.includes(sortBy as any)) {
      return badRequestResponse("Opsi urutan tidak valid.", "INVALID_SORT");
    }

    const offset = (page - 1) * limit;

    // Build query
    let countQuery = supabase
      .from("rt_assets")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .is("deleted_at", null);

    let dataQuery = supabase
      .from("rt_assets")
      .select(
        `
        *,
        category:rt_asset_categories(*),
        created_by_user:users!rt_assets_created_by_fkey(full_name),
        updated_by_user:users!rt_assets_updated_by_fkey(full_name)
      `,
      )
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .is("deleted_at", null);

    // Apply search
    if (search) {
      const searchFilter = `%${search}%`;
      const searchCondition = `name.ilike.${searchFilter},location.ilike.${searchFilter}`;
      countQuery = countQuery.or(searchCondition);
      dataQuery = dataQuery.or(searchCondition);
    }

    // Apply category filter
    if (categoryFilter) {
      countQuery = countQuery.eq("category_id", categoryFilter);
      dataQuery = dataQuery.eq("category_id", categoryFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        dataQuery = dataQuery.order("created_at", { ascending: false });
        break;
      case "oldest":
        dataQuery = dataQuery.order("created_at", { ascending: true });
        break;
      case "name_asc":
        dataQuery = dataQuery.order("name", { ascending: true });
        break;
      case "name_desc":
        dataQuery = dataQuery.order("name", { ascending: false });
        break;
    }

    // Pagination
    dataQuery = dataQuery.range(offset, offset + limit - 1);

    // Execute
    const [{ count: total }, { data: assets, error }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (error) {
      console.error("[asset-rt] GET list error:", error);
      return errorResponse("Gagal memuat daftar aset.", 500);
    }

    const mapped: AssetItem[] = (assets ?? []).map((asset: any) => ({
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
    }));

    return successResponse({
      assets: mapped,
      total: total ?? 0,
      page,
      limit,
      totalPages: total ? Math.ceil(total / limit) : 0,
    });
  } catch (err) {
    console.error("[asset-rt] GET list unexpected error:", err);
    return errorResponse("Terjadi kesalahan saat memuat daftar aset.", 500);
  }
}

/**
 * POST /api/asset-rt
 * Create a new asset.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const supabase = createServerClient();

    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return forbiddenResponse("Hanya admin RT yang dapat menambah aset.");
    }

    const body = await request.json();

    // Validation
    if (!body.name?.trim()) {
      return badRequestResponse("Nama aset harus diisi.", "VALIDATION_ERROR");
    }

    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("id, tenant_id")
      .eq("user_id", session.userId)
      .eq("status", "ACTIVE")
      .single();

    if (!tenantUser) {
      return errorResponse("User tidak ditemukan dalam tenant.", 404);
    }

    const tags: string[] = body.tags
      ? body.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean)
      : [];

    // Parse is_used: "true" → true, "false" → false, "null"/undefined → null
    let isUsed: boolean | null = null;
    if (body.is_used === "true" || body.is_used === true) isUsed = true;
    else if (body.is_used === "false" || body.is_used === false) isUsed = false;

    const { data: asset, error } = await supabase
      .from("rt_assets")
      .insert({
        tenant_id: DEFAULT_TENANT_ID,
        community_id: DEFAULT_COMMUNITY_ID,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        location: body.location?.trim() || null,
        image_url: body.image_url?.trim() || null,
        category_id: body.category_id || null,
        quantity: Math.max(1, parseInt(body.quantity || "1", 10)),
        unit_label: body.unit_label?.trim() || "Unit",
        is_used: isUsed,
        tags,
        purchase_date: body.purchase_date || null,
        notes: body.notes?.trim() || null,
        created_by: session.userId,
        updated_by: session.userId,
      })
      .select()
      .single();

    if (error) {
      console.error("[asset-rt] POST error:", error);
      return errorResponse("Gagal menambahkan aset.", 500);
    }

    return successResponse(asset, 201);
  } catch (err) {
    console.error("[asset-rt] POST unexpected error:", err);
    return errorResponse("Terjadi kesalahan saat menambahkan aset.", 500);
  }
}
