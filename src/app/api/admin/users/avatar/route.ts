import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { serverUpload, deleteObject, getPublicUrl } from "@/lib/r2";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const userId = formData.get("userId") as string | null;
    const file = formData.get("file");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID wajib diisi" },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "File tidak ditemukan. Gunakan field 'file'." },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format tidak didukung. Gunakan JPEG, PNG, WebP, atau HEIC." },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpeg", "jpg", "png", "webp", "heic"].includes(ext)
      ? ext
      : "jpg";
    const path = `${userId}/avatar.${safeExt}`;

    await serverUpload(new Uint8Array(await file.arrayBuffer()), path, file.type);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        avatar_path: path,
        updated_at: new Date().toISOString(),
        updated_by: session.userId,
      })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Gagal menyimpan referensi foto." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, profilePictureUrl: getPublicUrl(path) });
  } catch {
    return NextResponse.json(
      { error: "Gagal mengunggah foto profil." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

    if (!userId) {
      return NextResponse.json(
        { error: "User ID wajib diisi" },
        { status: 400 },
      );
    }

    const { data: user } = await supabase
      .from("users")
      .select("avatar_path")
      .eq("id", userId)
      .single();

    if (!user?.avatar_path) {
      return NextResponse.json({
        success: true,
        message: "User tidak memiliki foto profil.",
      });
    }

    await deleteObject(user.avatar_path);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        avatar_path: null,
        updated_at: new Date().toISOString(),
        updated_by: session.userId,
      })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Gagal menyimpan perubahan." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus foto profil." },
      { status: 500 },
    );
  }
}
