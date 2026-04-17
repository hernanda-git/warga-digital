import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { verifyPin } from "@/lib/crypto";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { setCommunityNameCookie } from "@/lib/cookies";
import {
  looksLikePhone,
  normalizeWaNumber,
  getWaNumberVariants,
} from "@/lib/phone-utils";
import { loginLimiter, rateLimitResponse } from "@/lib/rate-limiter";

const PIN_REGEX = /^\d{4}$/;

/**
 * Extract a rate limit key from the request.
 * Uses the login identifier (phone/username) to prevent brute force
 * against specific accounts, regardless of IP rotation.
 */
function getRateLimitKey(login: string): string {
  return `login:${login.trim().toLowerCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    console.log("[Login] Request received");
    const body = await request.json();
    const { login, pin } = body;
    console.log(
      "[Login] login:",
      login,
      "pin length:",
      String(pin ?? "").length,
    );

    if (!login || typeof login !== "string" || !login.trim()) {
      return NextResponse.json(
        { error: "Nomor WhatsApp atau username wajib" },
        { status: 400 },
      );
    }

    const pinStr = String(pin ?? "").trim();
    if (!PIN_REGEX.test(pinStr)) {
      return NextResponse.json(
        { error: "PIN harus 4 digit angka" },
        { status: 400 },
      );
    }

    // ── Rate limiting ──────────────────────────────────────────────────────
    const rateKey = getRateLimitKey(login);
    const rateResult = loginLimiter.consume(rateKey);

    if (!rateResult.allowed) {
      return rateLimitResponse(rateResult);
    }

    const loginTrimmed = login.trim();
    console.log("[Login] Creating Supabase client...");
    const supabase = createServerClient();
    console.log("[Login] Supabase client created");
    let user: {
      id: string;
      full_name: string;
      pin_hash: string | null;
      status: string;
    } | null = null;

    if (looksLikePhone(loginTrimmed)) {
      console.log("[Login] Detected as phone number");
      // Query all plausible storage variants so we match regardless of which
      // format was used when the account was originally created
      // (e.g. "08...", "628...", "+628...", or bare "8...").
      const variants = getWaNumberVariants(loginTrimmed);
      console.log("[Login] Phone variants:", variants);

      const { data, error: fetchError } = await supabase
        .from("users")
        .select("id, full_name, pin_hash, status")
        .in("wa_number", variants)
        .limit(1);

      if (!fetchError && data && data.length > 0) {
        user = data[0];
        console.log("[Login] User found via phone variants");
      } else if (fetchError) {
        console.error("[Login] Phone lookup error:", fetchError);
      }

      // Fallback: also try the canonical normalized form explicitly
      // (handles edge cases where getWaNumberVariants missed a format)
      if (!user) {
        const canonical = normalizeWaNumber(loginTrimmed);
        if (!variants.includes(canonical)) {
          console.log("[Login] Trying canonical phone:", canonical);
          const { data: fb, error: fbErr } = await supabase
            .from("users")
            .select("id, full_name, pin_hash, status")
            .eq("wa_number", canonical)
            .maybeSingle();
          if (!fbErr && fb) {
            user = fb;
            console.log("[Login] User found via canonical phone");
          }
        }
      }
    } else {
      console.log("[Login] Detected as username");
      // Treat as username (case-insensitive)
      const { data: row, error: fetchError } = await supabase
        .from("users")
        .select("id, full_name, pin_hash, status")
        .ilike("username", loginTrimmed)
        .not("username", "is", null)
        .maybeSingle();
      if (!fetchError) {
        user = row;
        console.log(
          "[Login] Username lookup result:",
          user ? "found" : "not found",
        );
      } else {
        console.error("[Login] Username lookup error:", fetchError);
      }
    }

    if (!user) {
      console.log("[Login] User not found");
      return NextResponse.json(
        { error: "Username atau nomor WhatsApp tidak ditemukan." },
        { status: 404 },
      );
    }

    console.log("[Login] User found, checking PIN hash...");
    if (!user.pin_hash) {
      return NextResponse.json(
        {
          error:
            "Akun belum mengatur PIN. Selesaikan pendaftaran terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Akun belum aktif. Verifikasi nomor WhatsApp terlebih dahulu.",
        },
        { status: 400 },
      );
    }

    console.log("[Login] Verifying PIN...");
    if (!verifyPin(pinStr, user.pin_hash)) {
      console.log("[Login] PIN verification failed");
      return NextResponse.json({ error: "PIN salah." }, { status: 401 });
    }
    console.log("[Login] PIN verified");

    // ── Create session ─────────────────────────────────────────────────────
    console.log("[Login] Creating session...");
    const jwt = await createSession(user.id);
    console.log("[Login] Session created, setting cookie...");
    await setSessionCookie(jwt);
    console.log("[Login] Cookie set");

    // ── Set community name cookie ─────────────────────────────────────────
    // Already have supabase client from earlier in the function
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tenantUser?.tenant_id) {
      const { data: community } = await supabase
        .from("communities")
        .select("name")
        .eq("tenant_id", tenantUser.tenant_id)
        .maybeSingle();

      if (community?.name) {
        await setCommunityNameCookie(community.name);
        console.log("[Login] Community name cookie set:", community.name);
      }
    }

    // Reset rate limit on successful login
    loginLimiter.reset(rateKey);

    return NextResponse.json({
      success: true,
      userId: user.id,
      fullName: user.full_name,
    });
  } catch (err) {
    const errorDetails =
      err instanceof Error
        ? { message: err.message, stack: err.stack, name: err.name }
        : String(err);
    console.error("[Login] Unhandled error:", errorDetails);
    console.error("[Login] Raw error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
