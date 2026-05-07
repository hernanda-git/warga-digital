import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import type { HouseStatus } from "@/types/database";

const VALID_STATUSES: HouseStatus[] = ["PRIBADI", "KONTRAKAN", "KOSONG"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const name =
      typeof body?.name === "string" ? body.name.trim() : undefined;
    const status =
      typeof body?.status === "string" ? body.status.trim().toUpperCase() : undefined;

    if (name === undefined && status === undefined) {
      return NextResponse.json(
        { error: "Minimal satu field (name/status) harus diisi" },
        { status: 400 },
      );
    }

    const patch: Record<string, string> = {};

    if (name !== undefined) {
      if (!name) {
        return NextResponse.json(
          { error: "Nama rumah tidak boleh kosong" },
          { status: 400 },
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          { error: "Nama rumah maksimal 100 karakter" },
          { status: 400 },
        );
      }
      patch.name = name;
    }

    if (status !== undefined) {
      if (!(VALID_STATUSES as string[]).includes(status)) {
        return NextResponse.json(
          {
            error: `Status tidak valid. Gunakan: ${VALID_STATUSES.join(", ")}`,
          },
          { status: 400 },
        );
      }
      patch.status = status;
    }

    patch.updated_at = new Date().toISOString();
    patch.updated_by = session.userId;

    const { data: updated, error: updateError } = await supabase
      .from("houses")
      .update(patch)
      .eq("id", id)
      .select(
        "id, name, blok_rumah, status, address, total_residents, is_active, updated_at",
      )
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: updateError?.message ?? "Rumah tidak ditemukan" },
        { status: updateError ? 500 : 404 },
      );
    }

    return NextResponse.json({ house: updated });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan" },
      { status: 500 },
    );
  }
}
