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
 * GET /api/admin/kas-rt-category-details/[id]
 *
 * Get a single category detail by ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from("kas_rt_transaction_category_details")
    .select(
      "id, category_id, name, rate_per_warga, sort_order, is_active, created_at, updated_at",
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("[admin/kas-rt-category-details] GET error:", error);
    return NextResponse.json(
      { error: "Detail kategori tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ detail: data as CategoryDetailRow });
}

/**
 * PATCH /api/admin/kas-rt-category-details/[id]
 *
 * Update a category detail.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    rate_per_warga?: number;
    sort_order?: number;
    is_active?: boolean;
  };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.name !== undefined) {
    const name = body.name.trim();
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
    updates.name = name;
  }

  if (body.rate_per_warga !== undefined) {
    const rate = Number(body.rate_per_warga);
    if (Number.isNaN(rate) || rate < 0) {
      return NextResponse.json(
        { error: "Rate per warga harus berupa angka positif." },
        { status: 400 },
      );
    }
    updates.rate_per_warga = rate;
  }

  if (body.sort_order !== undefined) {
    updates.sort_order = Number(body.sort_order) || 0;
  }

  if (body.is_active !== undefined) {
    updates.is_active = Boolean(body.is_active);
  }

  const { data, error } = await supabase
    .from("kas_rt_transaction_category_details")
    .update(updates)
    .eq("id", id)
    .select(
      "id, category_id, name, rate_per_warga, sort_order, is_active, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("[admin/kas-rt-category-details] PATCH error:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Detail dengan nama tersebut sudah ada di kategori ini." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Gagal memperbarui detail kategori." },
      { status: 500 },
    );
  }

  return NextResponse.json({ detail: data as CategoryDetailRow });
}

/**
 * DELETE /api/admin/kas-rt-category-details/[id]
 *
 * Delete a category detail.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from("kas_rt_transaction_category_details")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[admin/kas-rt-category-details] DELETE error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus detail kategori." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
