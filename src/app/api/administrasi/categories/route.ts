import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data: categories, error } = await supabase
      .from("administrasi_categories")
      .select(`
        *,
        letter_types:administrasi_letter_types(
          id,
          code,
          name,
          slug,
          description,
          sort_order,
          is_active,
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
        )
      `)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("is_active", true)
      .eq("letter_types.is_active", true)
      .order("sort_order", { ascending: true })
      .order("sort_order", { referencedTable: "letter_types", ascending: true })
      .order("sort_order", { referencedTable: "letter_types.fields", ascending: true });

    if (error) {
      return NextResponse.json({ error: "Gagal memuat kategori" }, { status: 500 });
    }

    return NextResponse.json({ data: categories ?? [] });
  } catch {
    return NextResponse.json({ error: "Gagal memuat kategori" }, { status: 500 });
  }
}
