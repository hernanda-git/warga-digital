import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { hashSha256 } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const userId = searchParams.get("user");

    if (!token || !userId) {
      return NextResponse.json(
        { valid: false, error: "Tautan tidak valid." },
        { status: 400 },
      );
    }

    const tokenHash = hashSha256(token);
    const supabase = createServerClient();

    const { data: row, error } = await supabase
      .from("password_reset_tokens")
      .select("id, expires_at, used_at")
      .eq("user_id", userId)
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json(
        { valid: false, error: "Tautan tidak valid atau sudah kadaluarsa." },
        { status: 400 },
      );
    }

    if (row.used_at) {
      return NextResponse.json(
        { valid: false, error: "Tautan sudah digunakan." },
        { status: 400 },
      );
    }

    if (new Date(row.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, error: "Tautan sudah kadaluarsa." },
        { status: 400 },
      );
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json(
      { valid: false, error: "Terjadi kesalahan. Coba lagi." },
      { status: 500 },
    );
  }
}
