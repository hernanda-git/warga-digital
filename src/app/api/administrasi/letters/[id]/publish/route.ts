import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { MONTH_ROMAN } from "@/config/administrasi";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const isJson = (_request.headers.get("content-type") ?? "").includes("json");
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

    const { data: letter } = await supabase
      .from("administrasi_letters")
      .select("*, letter_type:administrasi_letter_types!administrasi_letters_letter_type_id_fkey(code)")
      .eq("id", id)
      .single();

    if (!letter) {
      return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
    }

    if (letter.status !== "draft") {
      return NextResponse.json({ error: "Surat sudah diterbitkan" }, { status: 400 });
    }

    const { data: config } = await supabase
      .from("administrasi_number_configs")
      .select("*")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .single();

    if (!config) {
      return NextResponse.json({ error: "Konfigurasi nomor surat belum diatur" }, { status: 400 });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let newSequence = config.last_sequence;
    if (config.reset_frequency === "yearly" && config.last_reset_year !== currentYear) {
      newSequence = 0;
    } else if (config.reset_frequency === "monthly" && (config.last_reset_year !== currentYear || config.last_reset_month !== currentMonth)) {
      newSequence = 0;
    }
    newSequence += 1;

    const formatTokens: Record<string, string> = {
      sequence: String(newSequence).padStart(3, "0"),
      letter_code: (letter.letter_type as any)?.code || "XXX",
      rt: config.rt,
      rw: config.rw,
      month_roman: MONTH_ROMAN[currentMonth] || String(currentMonth),
      month: String(currentMonth).padStart(2, "0"),
      year: String(currentYear),
    };

    let letterNumber = config.format_pattern;
    for (const [key, value] of Object.entries(formatTokens)) {
      letterNumber = letterNumber.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }

    const { data: updated, error } = await supabase
      .from("administrasi_letters")
      .update({
        status: "published",
        letter_number: letterNumber,
        published_by: session.userId,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Gagal menerbitkan surat" }, { status: 500 });
    }

    await supabase
      .from("administrasi_number_configs")
      .update({
        last_sequence: newSequence,
        last_reset_year: currentYear,
        last_reset_month: currentMonth,
      })
      .eq("tenant_id", DEFAULT_TENANT_ID);

    await supabase.from("administrasi_letter_logs").insert({
      letter_id: id,
      action: "published",
      user_id: session.userId,
      metadata: { letter_number: letterNumber },
    });

    if (!isJson) {
      return NextResponse.redirect(new URL(`/administrasi/surat/${id}`, _request.url), 303);
    }

    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Gagal menerbitkan surat" }, { status: 500 });
  }
}
