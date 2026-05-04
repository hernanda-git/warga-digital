"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json(
        { message: "Anda harus masuk untuk mengakses data rumah." },
        { status: 401 },
      );
    }

    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json(
        { message: "Konfigurasi tenant/komunitas tidak ditemukan." },
        { status: 500 },
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("houses")
      .select("id, name, blok_rumah, status")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .eq("is_active", true)
      .order("blok_rumah", { ascending: true });

    if (error) {
      console.error("[kas-rt/houses] Failed to fetch houses:", error);
      return NextResponse.json(
        { message: "Gagal memuat daftar rumah." },
        { status: 500 },
      );
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("[kas-rt/houses] Unexpected error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memuat daftar rumah." },
      { status: 500 },
    );
  }
}
