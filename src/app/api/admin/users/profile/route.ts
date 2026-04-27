import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import {
  normalizeWaNumber,
  validateNormalizedWaNumber,
} from "@/lib/phone-utils";

const VALID_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"];

const ALLOWED_KEYS = [
  "full_name",
  "email",
  "wa_number",
  "username",
  "status",
] as const;

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const userId =
      typeof body?.userId === "string" ? body.userId.trim() : "";
    if (!userId) {
      return NextResponse.json(
        { error: "User ID wajib diisi" },
        { status: 400 },
      );
    }

    const { data: targetUser, error: userError } = await supabase
      .from("users")
      .select("id, full_name, username, wa_number, email, status")
      .eq("id", userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    const updates: Record<string, unknown> = {};

    for (const key of ALLOWED_KEYS) {
      if (!(key in body)) continue;
      const v = body[key];

      if (key === "username") {
        if (v === null || v === "") {
          updates[key] = null;
        } else if (typeof v === "string") {
          const trimmed = v.trim();
          if (trimmed.length < 3 || trimmed.length > 30) {
            return NextResponse.json(
              { error: "Username harus 3\u201330 karakter" },
              { status: 400 },
            );
          }
          if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
            return NextResponse.json(
              { error: "Username hanya huruf, angka, dan underscore" },
              { status: 400 },
            );
          }
          updates[key] = trimmed;
        }
      } else if (key === "wa_number") {
        if (v === null || v === "") {
          updates[key] = null;
        } else if (typeof v === "string") {
          const normalized = normalizeWaNumber(v.trim());
          const waError = validateNormalizedWaNumber(normalized);
          if (waError) {
            return NextResponse.json({ error: waError }, { status: 400 });
          }
          updates[key] = normalized;
        }
      } else if (key === "full_name") {
        if (typeof v !== "string" || !v.trim()) {
          return NextResponse.json(
            { error: "Nama lengkap wajib diisi" },
            { status: 400 },
          );
        }
        if (v.trim().length < 2) {
          return NextResponse.json(
            { error: "Nama minimal 2 karakter" },
            { status: 400 },
          );
        }
        updates.full_name = v.trim();
      } else if (key === "email") {
        updates[key] =
          v === null || v === "" ? null : String(v).trim() || null;
      } else if (key === "status") {
        if (typeof v === "string" && VALID_STATUSES.includes(v)) {
          updates[key] = v;
        }
      }
    }

    const hasUsername =
      updates.username !== null &&
      updates.username !== undefined &&
      updates.username !== "";
    const hasWaNumber =
      updates.wa_number !== null &&
      updates.wa_number !== undefined &&
      updates.wa_number !== "";
    const updatingUsername = "username" in body;
    const updatingWaNumber = "wa_number" in body;

    if (updatingUsername || updatingWaNumber) {
      const finalUsername = updatingUsername
        ? (updates.username ?? null)
        : (targetUser.username ?? null);
      const finalWaNumber = updatingWaNumber
        ? (updates.wa_number ?? null)
        : (targetUser.wa_number ?? null);

      if (!finalUsername && !finalWaNumber) {
        return NextResponse.json(
          {
            error:
              "Username atau nomor WhatsApp wajib diisi (minimal satu harus aktif)",
          },
          { status: 400 },
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data yang diubah" },
        { status: 400 },
      );
    }

    updates.updated_at = new Date().toISOString();
    updates.updated_by = session.userId;

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select(
        "id, full_name, username, wa_number, email, status, updated_at",
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Username, email, atau nomor WhatsApp sudah dipakai" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Gagal menyimpan profil" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: data.id,
        fullName: data.full_name,
        username: data.username ?? null,
        waNumber: data.wa_number ?? null,
        email: data.email ?? null,
        status: data.status,
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal menyimpan profil" },
      { status: 500 },
    );
  }
}
