import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";

export async function POST(
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

    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isJson = (request.headers.get("content-type") ?? "").includes("json");
    let body: any = {};
    if (isJson) {
      try { body = await request.json(); } catch {}
    } else {
      const form = await request.formData();
      for (const [key, value] of form.entries()) {
        body[key] = value;
      }
    }

    if (!body.reason) {
      return NextResponse.json({ error: "Alasan penolakan harus diisi" }, { status: 400 });
    }

    const { data: letter } = await supabase
      .from("administrasi_letters")
      .select("status")
      .eq("id", id)
      .single();

    if (!letter) {
      return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
    }

    if (letter.status !== "draft") {
      return NextResponse.json({ error: "Surat sudah diterbitkan" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("administrasi_letters")
      .update({
        status: "rejected",
        rejected_by: session.userId,
        rejected_at: new Date().toISOString(),
        rejected_reason: body.reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Gagal menolak surat" }, { status: 500 });
    }

    await supabase.from("administrasi_letter_logs").insert({
      letter_id: id,
      action: "rejected",
      user_id: session.userId,
      metadata: { reason: body.reason },
    });

    if (!isJson) {
      return NextResponse.redirect(new URL(`/administrasi/surat/${id}`, request.url), 303);
    }

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Gagal menolak surat" }, { status: 500 });
  }
}
