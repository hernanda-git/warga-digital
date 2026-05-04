import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    const supabase = createServerClient();

    const { data: letterType, error } = await supabase
      .from("administrasi_letter_types")
      .select(`
        *,
        fields:administrasi_letter_fields(
          id,
          field_key,
          field_label,
          field_type,
          field_options,
          placeholder,
          is_required,
          auto_fill_source,
          sort_order
        )
      `)
      .eq("slug", slug)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("is_active", true)
      .single();

    if (error || !letterType) {
      return NextResponse.json({ error: "Jenis surat tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ data: letterType });
  } catch {
    return NextResponse.json({ error: "Gagal memuat jenis surat" }, { status: 500 });
  }
}
