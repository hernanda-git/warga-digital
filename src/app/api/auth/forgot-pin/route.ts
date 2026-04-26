import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { hashSha256 } from "@/lib/crypto";
import { sendResetPinEmail, getAppUrl } from "@/lib/email/resend";
import { forgotPinLimiter, rateLimitResponse } from "@/lib/rate-limiter";
import {
  looksLikePhone,
  normalizeWaNumber,
  getWaNumberVariants,
} from "@/lib/phone-utils";
import { randomBytes } from "crypto";

const TOKEN_EXPIRY_HOURS = 6;

function getRateLimitKey(login: string): string {
  return `forgot-pin:${login.trim().toLowerCase()}`;
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = typeof body?.login === "string" ? body.login.trim() : "";

    if (!login) {
      return NextResponse.json(
        { error: "Isi Username atau Nomor WhatsApp untuk melanjutkan." },
        { status: 400 },
      );
    }

    // ── Rate limiting ──────────────────────────────────────────────────────
    const rateKey = getRateLimitKey(login);
    const rateResult = forgotPinLimiter.consume(rateKey);
    if (!rateResult.allowed) {
      return rateLimitResponse(rateResult);
    }

    const supabase = createServerClient();
    let user: {
      id: string;
      full_name: string;
      email: string | null;
      status: string;
    } | null = null;

    if (looksLikePhone(login)) {
      const variants = getWaNumberVariants(login);
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("id, full_name, email, status")
        .in("wa_number", variants)
        .limit(1);

      if (!fetchError && data && data.length > 0) {
        user = data[0];
      }

      if (!user) {
        const canonical = normalizeWaNumber(login);
        if (!variants.includes(canonical)) {
          const { data: fb, error: fbErr } = await supabase
            .from("users")
            .select("id, full_name, email, status")
            .eq("wa_number", canonical)
            .maybeSingle();
          if (!fbErr && fb) user = fb;
        }
      }
    } else {
      const { data: row, error: fetchError } = await supabase
        .from("users")
        .select("id, full_name, email, status")
        .ilike("username", login)
        .not("username", "is", null)
        .maybeSingle();
      if (!fetchError) user = row;
    }

    if (!user) {
      // Return generic message to prevent user enumeration
      return NextResponse.json(
        { message: "Jika akun ditemukan, email reset PIN telah dikirim." },
        { status: 200 },
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Akun belum aktif. Tidak dapat mereset PIN." },
        { status: 400 },
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "Akun ini belum memiliki email terdaftar. Hubungi admin untuk bantuan." },
        { status: 400 },
      );
    }

    // ── Generate token ─────────────────────────────────────────────────────
    const rawToken = generateToken();
    const tokenHash = hashSha256(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    // Invalidate any existing unused tokens for this user
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString());

    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      return NextResponse.json(
        { error: "Gagal membuat token reset. Coba lagi." },
        { status: 500 },
      );
    }

    // ── Send email ─────────────────────────────────────────────────────────
    const appUrl = getAppUrl();
    const resetUrl = `${appUrl}/auth/reset-pin?token=${rawToken}&user=${user.id}`;

    await sendResetPinEmail({
      to: user.email,
      userName: user.full_name,
      resetUrl,
      expiresInHours: TOKEN_EXPIRY_HOURS,
    });

    // Reset rate limit on success
    forgotPinLimiter.reset(rateKey);

    return NextResponse.json({
      message: "Jika akun ditemukan, email reset PIN telah dikirim.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Don't leak internal errors to the client
    return NextResponse.json(
      { error: "Terjadi kesalahan. Coba lagi nanti." },
      { status: 500 },
    );
  }
}
