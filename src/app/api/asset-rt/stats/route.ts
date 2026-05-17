import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/api-response";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";
import type { AssetStats } from "@/types/asset-rt";

/**
 * GET /api/asset-rt/stats
 * Returns aggregate stats for the asset hero section:
 * - total assets
 * - new assets this month
 * - assets currently in use (is_used = true)
 * - assets not in use (is_used = false) — includes null (tidak terpakai)
 */
export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

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

    const stats: AssetStats = {
      total: total ?? 0,
      new_this_month: newThisMonth ?? 0,
      in_use: inUse ?? 0,
      not_in_use: notInUse ?? 0,
    };

    return successResponse(stats);
  } catch (err) {
    console.error("[asset-rt/stats] GET error:", err);
    return errorResponse("Gagal memuat statistik aset.", 500);
  }
}
