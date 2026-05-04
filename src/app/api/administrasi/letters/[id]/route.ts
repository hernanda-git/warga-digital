import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { renderLetterTemplate, BASE_LETTER_TEMPLATE } from "@/config/letter-templates";
import { MONTH_ROMAN } from "@/config/administrasi";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const supabase = createServerClient();

    const { data: letter, error } = await supabase
      .from("administrasi_letters")
      .select(`
        *,
        letter_type:administrasi_letter_types!administrasi_letters_letter_type_id_fkey(id, code, name, slug, template_html),
        user:users!administrasi_letters_user_id_fkey(id, full_name),
        logs:administrasi_letter_logs!administrasi_letter_logs_letter_id_fkey(*)
      `)
      .eq("id", id)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .is("deleted_at", null)
      .single();

    if (error || !letter) {
      return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
    }

    const { data: config } = await supabase
      .from("administrasi_number_configs")
      .select("*")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .single();

    const renderedHtml = renderLetterTemplate(
      letter.letter_type?.template_html || BASE_LETTER_TEMPLATE,
      letter.data as Record<string, any>,
      {
        nomor_surat: letter.letter_number || "-",
        rt: config?.rt || "01",
        rw: config?.rw || "02",
        kota: config?.kota || "",
        kecamatan: config?.kecamatan || "",
        kelurahan: config?.kelurahan || "",
        provinsi: config?.provinsi || "",
        alamat_kantor: config?.alamat_kantor || "",
        nama_ketua_rt: config?.nama_ketua_rt || "",
      },
    );

    await supabase.from("administrasi_letter_logs").insert({
      letter_id: id,
      action: "viewed",
      user_id: session.userId,
    });

    return NextResponse.json({
      data: { ...letter, rendered_html: renderedHtml },
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat surat" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerClient();
    const body = await request.json() as { data?: Record<string, any>; notes?: string };

    const { data: letter } = await supabase
      .from("administrasi_letters")
      .select("status, user_id")
      .eq("id", id)
      .single();

    if (!letter) {
      return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
    }

    if (letter.user_id !== session.userId && letter.status !== "draft") {
      return NextResponse.json({ error: "Tidak dapat mengubah surat" }, { status: 403 });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.data) updates.data = body.data;
    if (body.notes !== undefined) updates.notes = body.notes;

    const { data: updated, error } = await supabase
      .from("administrasi_letters")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Gagal mengubah surat" }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Gagal mengubah surat" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerClient();

    const { data: letter } = await supabase
      .from("administrasi_letters")
      .select("status, user_id")
      .eq("id", id)
      .single();

    if (!letter) {
      return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
    }

    if (letter.user_id !== session.userId && letter.status !== "draft") {
      return NextResponse.json({ error: "Tidak dapat menghapus surat" }, { status: 403 });
    }

    const { error } = await supabase
      .from("administrasi_letters")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Gagal menghapus surat" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus surat" }, { status: 500 });
  }
}
