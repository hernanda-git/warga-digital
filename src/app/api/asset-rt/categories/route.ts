import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/api-response";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import type { AssetCategory } from "@/types/asset-rt";

/**
 * GET /api/asset-rt/categories
 * Returns all active asset categories for filter chips.
 * Colours are applied by the frontend via dynamic theming.
 */
export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("rt_asset_categories")
      .select("id, name, sort_order")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("is_active", true)
      .order("sort_order");

    if (error) {
      console.error("[asset-rt/categories] GET error:", error);
      return errorResponse("Gagal memuat kategori aset.", 500);
    }

    return successResponse((data ?? []) as AssetCategory[]);
  } catch (err) {
    console.error("[asset-rt/categories] GET unexpected error:", err);
    return errorResponse("Terjadi kesalahan saat memuat kategori.", 500);
  }
}
