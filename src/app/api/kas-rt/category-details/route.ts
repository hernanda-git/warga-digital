"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";

export interface CategoryDetailRow {
  id: string;
  category_id: string;
  name: string;
  rate_per_warga: number;
  sort_order: number;
  is_active: boolean;
}

export interface CategoryDetailsWithCalculation {
  category_id: string;
  details: CategoryDetailRow[];
  default_jumlah_warga: number;
}

/**
 * GET /api/kas-rt/category-details?category_id=xxx
 *
 * Returns category details with rates and default jumlah warga count.
 * Used by the Kas RT transaction form to pre-calculate expense amounts.
 */
export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");

    if (!categoryId) {
      return NextResponse.json(
        { error: "category_id parameter is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Fetch category details (rates)
    const { data: details, error: detailsError } = await supabase
      .from("kas_rt_transaction_category_details")
      .select(
        "id, category_id, name, rate_per_warga, sort_order, is_active",
      )
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (detailsError) {
      console.error("[Kas RT] Fetch category details error:", detailsError);
      return NextResponse.json(
        { error: "Gagal memuat detail kategori." },
        { status: 500 },
      );
    }

    // Count active residents (jumlah warga)
    // user_houses doesn't have community_id directly, need to join through houses
    const { data: activeResidents, error: countError } = await supabase
      .from("user_houses")
      .select("id, houses!inner(community_id)")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("houses.community_id", DEFAULT_COMMUNITY_ID)
      .eq("status", "ACTIVE");

    if (countError) {
      console.error("[Kas RT] Count user_houses error:", countError);
    }

    const count = activeResidents?.length ?? 0;

    const response: CategoryDetailsWithCalculation = {
      category_id: categoryId,
      details: (details ?? []) as CategoryDetailRow[],
      default_jumlah_warga: count ?? 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Kas RT] Unexpected GET category-details error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memuat detail kategori." },
      { status: 500 },
    );
  }
}
