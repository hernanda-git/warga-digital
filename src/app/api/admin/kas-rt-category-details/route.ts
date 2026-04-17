"use server";

import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";

export interface CategoryDetailRow {
  id: string;
  category_id: string;
  name: string;
  rate_per_warga: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

/**
 * GET /api/admin/kas-rt-category-details?category_id=xxx
 *
 * Returns all details for a category (including inactive).
 * Ordered by sort_order then name.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category_id");

  if (!categoryId) {
    return NextResponse.json(
      { error: "category_id parameter is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("kas_rt_transaction_category_details")
    .select(
      "id, category_id, name, rate_per_warga, sort_order, is_active, created_at, updated_at",
    )
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[admin/kas-rt-category-details] GET error:", error);
    return NextResponse.json(
      { error: "Gagal memuat detail kategori." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    details: (data ?? []) as CategoryDetailRow[],
  });
}

/**
 * POST /api/admin/kas-rt-category-details
 *
 * Creates a new category detail.
 * Body: { category_id, name, rate_per_warga, sort_order?, is_active? }
 */
export async function POST(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    category_id?: string;
    name?: string;
    rate_per_warga?: number;
    sort_order?: number;
    is_active?: boolean;
  };

  const categoryId = body.category_id?.trim();
  if (!categoryId) {
    return NextResponse.json(
      { error: "category_id wajib diisi." },
      { status: 400 },
    );
  }

  const name = body.name?.trim() ?? "";
  if (!name) {
    return NextResponse.json(
      { error: "Nama detail wajib diisi." },
      { status: 400 },
    );
  }
  if (name.length > 100) {
    return NextResponse.json(
      { error: "Nama detail maksimal 100 karakter." },
      { status: 400 },
    );
  }

  const ratePerWarga = Number(body.rate_per_warga) ?? 0;
  if (Number.isNaN(ratePerWarga) || ratePerWarga < 0) {
    return NextResponse.json(
      { error: "Rate per warga harus berupa angka positif." },
      { status: 400 },
    );
  }

  // Verify the category exists
  const { data: category } = await supabase
    .from("kas_rt_transaction_categories")
    .select("id")
    .eq("id", categoryId)
    .single();

  if (!category) {
    return NextResponse.json(
      { error: "Kategori tidak ditemukan." },
      { status: 404 },
    );
  }

  // Get max sort_order for auto-increment
  const { data: maxRow } = await supabase
    .from("kas_rt_transaction_category_details")
    .select("sort_order")
    .eq("category_id", categoryId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const autoSortOrder = body.sort_order ?? ((maxRow?.sort_order as number) ?? 0) + 10;
  const isActive = body.is_active !== false; // default true

  const { data, error } = await supabase
    .from("kas_rt_transaction_category_details")
    .insert({
      category_id: categoryId,
      name,
      rate_per_warga: ratePerWarga,
      sort_order: autoSortOrder,
      is_active: isActive,
    })
    .select(
      "id, category_id, name, rate_per_warga, sort_order, is_active, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("[admin/kas-rt-category-details] POST insert error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `Detail dengan nama "${name}" sudah ada di kategori ini.` },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Gagal menyimpan detail kategori." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { detail: data as CategoryDetailRow },
    { status: 201 },
  );
}
