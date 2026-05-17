/**
 * Asset RT Server Data Layer
 *
 * Fetches Asset RT page data directly on the server using Supabase.
 * Follows the same pattern as kas-rt/data.ts.
 *
 * Simplified schema:
 *   - is_used: boolean | null (digunakan / tidak digunakan / tidak terpakai)
 *   - No condition or maintenance tracking
 */

import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import type {
  AssetItem,
  AssetCategory,
  AssetStats,
  AssetLog,
} from "@/types/asset-rt";

// ─── Auth Guard ─────────────────────────────────────────────────────────────

export async function requireAuth() {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/auth/login");
  }
  return session;
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function fetchAssetCategories(): Promise<AssetCategory[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("rt_asset_categories")
      .select("id, name, sort_order")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("is_active", true)
      .order("sort_order");
    return (data ?? []) as AssetCategory[];
  } catch {
    return [];
  }
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export async function fetchAssetStats(): Promise<AssetStats | null> {
  try {
    const supabase = createServerClient();

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const baseFilter = {
      tenant_id: DEFAULT_TENANT_ID,
      community_id: DEFAULT_COMMUNITY_ID,
      deleted_at: null,
    };

    const [
      { count: total },
      { count: newThisMonth },
      { count: inUse },
      { count: notInUse },
    ] = await Promise.all([
      supabase
        .from("rt_assets")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", baseFilter.tenant_id)
        .eq("community_id", baseFilter.community_id)
        .is("deleted_at", baseFilter.deleted_at),
      supabase
        .from("rt_assets")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", baseFilter.tenant_id)
        .eq("community_id", baseFilter.community_id)
        .is("deleted_at", baseFilter.deleted_at)
        .gte("created_at", thisMonthStart),
      supabase
        .from("rt_assets")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", baseFilter.tenant_id)
        .eq("community_id", baseFilter.community_id)
        .is("deleted_at", baseFilter.deleted_at)
        .eq("is_used", true),
      supabase
        .from("rt_assets")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", baseFilter.tenant_id)
        .eq("community_id", baseFilter.community_id)
        .is("deleted_at", baseFilter.deleted_at)
        .or("is_used.eq.false,is_used.is.null"),
    ]);

    return {
      total: total ?? 0,
      new_this_month: newThisMonth ?? 0,
      in_use: inUse ?? 0,
      not_in_use: notInUse ?? 0,
    };
  } catch {
    return null;
  }
}

// ─── Assets ─────────────────────────────────────────────────────────────────

export interface FetchAssetsParams {
  search?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface FetchAssetsResult {
  assets: AssetItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchAssets(
  params: FetchAssetsParams = {},
): Promise<FetchAssetsResult> {
  try {
    const supabase = createServerClient();

    const search = params.search?.trim() || "";
    const category = params.category?.trim() || "";
    const sort = params.sort?.trim() || "newest";
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;

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

    if (search) {
      const filter = `%${search}%`;
      const cond = `name.ilike.${filter},location.ilike.${filter}`;
      countQuery = countQuery.or(cond);
      dataQuery = dataQuery.or(cond);
    }

    if (category) {
      countQuery = countQuery.eq("category_id", category);
      dataQuery = dataQuery.eq("category_id", category);
    }

    switch (sort) {
      case "oldest":
        dataQuery = dataQuery.order("created_at", { ascending: true });
        break;
      case "name_asc":
        dataQuery = dataQuery.order("name", { ascending: true });
        break;
      case "name_desc":
        dataQuery = dataQuery.order("name", { ascending: false });
        break;
      default: // newest
        dataQuery = dataQuery.order("created_at", { ascending: false });
    }

    dataQuery = dataQuery.range(offset, offset + limit - 1);

    const [{ count: total }, { data: assets, error }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (error) {
      console.error("[asset-rt/data] fetchAssets error:", error);
      return { assets: [], total: 0, page, totalPages: 0 };
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

    return {
      assets: mapped,
      total: total ?? 0,
      page,
      totalPages: total ? Math.ceil(total / limit) : 0,
    };
  } catch (err) {
    console.error("[asset-rt/data] fetchAssets failed:", err);
    return {
      assets: [],
      total: 0,
      page: params.page ?? 1,
      totalPages: 0,
    };
  }
}

// ─── Single Asset ─────────────────────────────────────────────────────────────

export async function fetchAssetById(id: string): Promise<AssetItem | null> {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("rt_assets")
      .select(
        `
        id, tenant_id, community_id,
        name, description, location, image_url,
        category_id,
        category:rt_asset_categories ( id, name, sort_order ),
        quantity, unit_label, is_used,
        tags, purchase_date, notes,
        created_by, updated_by,
        created_by_profile:users!rt_assets_created_by_fkey ( full_name ),
        updated_by_profile:users!rt_assets_updated_by_fkey ( full_name ),
        created_at, updated_at
      `,
      )
      .eq("id", id)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("community_id", DEFAULT_COMMUNITY_ID)
      .is("deleted_at", null)
      .single();

    if (error || !data) return null;

    const row = data as Record<string, unknown>;

    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      community_id: row.community_id as string,
      name: row.name as string,
      description: (row.description as string) ?? null,
      location: (row.location as string) ?? null,
      image_url: (row.image_url as string) ?? null,
      category_id: (row.category_id as string) ?? null,
      category: row.category as AssetItem["category"],
      quantity: row.quantity as number,
      unit_label: row.unit_label as string,
      is_used: row.is_used as boolean | null,
      tags: (row.tags as string[]) ?? [],
      purchase_date: (row.purchase_date as string) ?? null,
      notes: (row.notes as string) ?? null,
      created_by: (row.created_by as string) ?? null,
      updated_by: (row.updated_by as string) ?? null,
      created_by_full_name:
        (row.created_by_profile as { full_name?: string } | null)?.full_name ??
        null,
      updated_by_full_name:
        (row.updated_by_profile as { full_name?: string } | null)?.full_name ??
        null,
      created_at: row.created_at as string,
      updated_at: (row.updated_at as string) ?? null,
    };
  } catch {
    return null;
  }
}

// ─── Asset Logs ────────────────────────────────────────────────────────────────

export async function fetchAssetLogs(assetId: string): Promise<AssetLog[]> {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("rt_asset_logs")
      .select(
        `
        id, asset_id, tenant_id, log_type,
        old_status, new_status,
        part_name, replaced_with,
        image_url,
        old_quantity, new_quantity,
        notes,
        logged_by, logged_at,
        logged_by_profile:users!logged_by ( full_name )
      `,
      )
      .eq("asset_id", assetId)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .order("logged_at", { ascending: false });

    if (error || !data) return [];

    return data.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        asset_id: r.asset_id as string,
        tenant_id: r.tenant_id as string,
        log_type: r.log_type as AssetLog["log_type"],
        old_status: (r.old_status as AssetLog["old_status"]) ?? null,
        new_status: (r.new_status as AssetLog["new_status"]) ?? null,
        part_name: (r.part_name as string) ?? null,
        replaced_with: (r.replaced_with as string) ?? null,
        image_url: (r.image_url as string) ?? null,
        old_quantity: (r.old_quantity as number) ?? null,
        new_quantity: (r.new_quantity as number) ?? null,
        notes: (r.notes as string) ?? null,
        logged_by: (r.logged_by as string) ?? null,
        logged_by_full_name:
          (r.logged_by_profile as { full_name?: string } | null)?.full_name ??
          null,
        logged_at: r.logged_at as string,
      };
    });
  } catch {
    return [];
  }
}
