import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { hashSha256, hashPin } from "@/lib/crypto";
import { forgotPinLimiter, rateLimitResponse } from "@/lib/rate-limiter";

const PIN_REGEX = /^\d{4}$/;

function getRateLimitKey(userId: string): string {
  return `reset-pin:${userId}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, userId, pin, confirmPin } = body;

    if (!token || typeof token !== "string" || !userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Permintaan tidak valid." },
        { status: 400 },
      );
    }

    const pinStr = String(pin ?? "").trim();
    const confirmPinStr = String(confirmPin ?? "").trim();

    if (!PIN_REGEX.test(pinStr)) {
      return NextResponse.json(
        { error: "PIN harus 4 digit angka." },
        { status: 400 },
      );
    }

    if (pinStr !== confirmPinStr) {
      return NextResponse.json(
        { error: "PIN dan konfirmasi PIN tidak cocok." },
        { status: 400 },
      );
    }

    // ── Rate limiting ──────────────────────────────────────────────────────
    const rateKey = getRateLimitKey(userId);
    const rateResult = forgotPinLimiter.consume(rateKey);
    if (!rateResult.allowed) {
      return rateLimitResponse(rateResult);
    }

    const supabase = createServerClient();
    const tokenHash = hashSha256(token);

    const { data: row, error: fetchError } = await supabase
      .from("password_reset_tokens")
      .select("id, expires_at, used_at")
      .eq("user_id", userId)
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (fetchError || !row) {
      return NextResponse.json(
        { error: "Tautan tidak valid atau sudah kadaluarsa." },
        { status: 400 },
      );
    }

    if (row.used_at) {
      return NextResponse.json(
        { error: "Tautan sudah digunakan." },
        { status: 400 },
      );
    }

    if (new Date(row.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Tautan sudah kadaluarsa." },
        { status: 400 },
      );
    }

    // ── Update PIN ─────────────────────────────────────────────────────────
    const newPinHash = hashPin(pinStr);

    const { error: updateError } = await supabase
      .from("users")
      .update({ pin_hash: newPinHash })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Gagal mengubah PIN. Coba lagi." },
        { status: 500 },
      );
    }

    // ── Mark token as used ─────────────────────────────────────────────────
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);

    // ── Invalidate all sessions for the user ───────────────────────────────
    await supabase.from("sessions").delete().eq("user_id", userId);

    // Reset rate limit on success
    forgotPinLimiter.reset(rateKey);

    return NextResponse.json({ success: true, message: "PIN berhasil diubah. Silakan masuk dengan PIN baru." });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan. Coba lagi." },
      { status: 500 },
    );
  }
}
