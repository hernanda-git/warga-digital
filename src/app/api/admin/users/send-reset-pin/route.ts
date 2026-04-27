import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { hashSha256 } from "@/lib/crypto";
import { sendResetPinEmail, getAppUrl } from "@/lib/email/resend";
import { randomBytes } from "crypto";
import { getSessionFromCookie } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/admin-guard";

const TOKEN_EXPIRY_HOURS = 6;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): { allowed: boolean; resetAt: number } {
  const now = Date.now();
  const existing = rateLimitMap.get(key);

  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, resetAt: existing.resetAt };
  }

  existing.count++;
  return { allowed: true, resetAt: existing.resetAt };
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

    if (!userId) {
      return NextResponse.json(
        { error: "User ID wajib diisi" },
        { status: 400 },
      );
    }

    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: adminTenantUser } = await supabase
      .from("tenant_users")
      .select("user_id, tenant_id")
      .eq("id", adminUser.id)
      .single();

    if (!adminTenantUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminUserId = adminTenantUser.user_id;
    const adminTenantId = adminTenantUser.tenant_id;

    const rateKey = `admin-reset-pin:${adminUserId}:${userId}`;
    const rateResult = checkRateLimit(rateKey);

    if (!rateResult.allowed) {
      const resetIn = Math.ceil((rateResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${resetIn} detik.` },
        { status: 429 },
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, full_name, email, status, username, wa_number")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Akun user tidak aktif" },
        { status: 400 },
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "User belum memiliki email terdaftar" },
        { status: 400 },
      );
    }

    const rawToken = generateToken();
    const tokenHash = hashSha256(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString());

    const { data: tokenData, error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !tokenData) {
      return NextResponse.json(
        { error: "Gagal membuat token reset" },
        { status: 500 },
      );
    }

    const tokenId = tokenData.id;

    const appUrl = getAppUrl();
    const resetUrl = `${appUrl}/auth/reset-pin?token=${rawToken}&user=${user.id}`;

    await sendResetPinEmail({
      to: user.email,
      userName: user.full_name,
      resetUrl,
      expiresInHours: TOKEN_EXPIRY_HOURS,
    });

    const { error: notifErr } = await supabase
      .from("notifications")
      .insert({
        tenant_id: adminTenantId,
        recipient_user_id: user.id,
        actor_user_id: adminUserId,
        type: "SYSTEM",
        priority: "NORMAL",
        title: "PIN Direset oleh Admin",
        body: `Admin telah mereset PIN Anda. Periksa email untuk link reset.`,
        action_url: "/auth/reset-pin",
        entity_table: "password_reset_tokens",
        entity_id: tokenId,
        dedupe_key: `admin-reset-pin:${userId}:${Date.now()}`,
        metadata: {
          resetBy: adminUserId,
          resetType: "admin_initiated",
          tokenId,
        },
        created_by: adminUserId,
      });

    if (!notifErr) {
      await supabase.from("audit_logs").insert({
        action: "ADMIN_RESET_PIN",
        user_id: adminUserId,
        entity_type: "users",
        entity_id: userId,
        details: {
          targetUser: userId,
          targetEmail: user.email,
          targetName: user.full_name,
          resetType: "admin_initiated",
          tokenExpiresAt: expiresAt.toISOString(),
        },
        created_by: adminUserId,
      });
    }

    const maskedEmail = user.email.replace(
      /^(.)(.*?)@(.*)$/,
      "$1***@$3",
    );

    return NextResponse.json({
      success: true,
      message: `Email reset PIN telah dikirim ke ${maskedEmail}`,
      email: maskedEmail,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Terjadi kesalahan. Coba lagi nanti." },
      { status: 500 },
    );
  }
}
