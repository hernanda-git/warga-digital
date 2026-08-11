import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { serverUpload, getPublicUrl, MAX_AVATAR_FILE_SIZE } from "@/lib/r2";
import { validateImageFile } from "@/lib/validation/image-validation";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "File tidak ditemukan. Gunakan field 'file'." },
        { status: 400 },
      );
    }

    const validation = await validateImageFile(file, MAX_AVATAR_FILE_SIZE);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type as any)) {
      return NextResponse.json(
        { error: "Format tidak didukung. Gunakan JPEG, PNG, WebP, atau HEIC." },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpeg", "jpg", "png", "webp", "heic"].includes(ext)
      ? ext
      : "jpg";
    const path = `${session.userId}/avatar.${safeExt}`;
    const fullUrl = getPublicUrl(path);

    const supabase = createServerClient();

    await serverUpload(new Uint8Array(await file.arrayBuffer()), path, file.type);

    const { error: updateError } = await supabase
      .from("users")
      .update({
        avatar_path: fullUrl,
        updated_at: new Date().toISOString(),
        updated_by: session.userId,
      })
      .eq("id", session.userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Gagal menyimpan referensi foto." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      profilePictureUrl: fullUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Gagal mengunggah foto profil." },
      { status: 500 },
    );
  }
}
