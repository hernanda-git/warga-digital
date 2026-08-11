import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireCanManageOrganisation } from "../../require-manage";
import { serverUpload, getPublicUrl, MAX_AVATAR_FILE_SIZE, ALLOWED_IMAGE_TYPES } from "@/lib/r2";
import { validateImageFile } from "@/lib/validation/image-validation";

export async function POST(request: Request) {
  const forbidden = await requireCanManageOrganisation();
  if (forbidden) return forbidden;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const memberId = formData.get("memberId") as string | null;

    if (!file) {
      return NextResponse.json(
        { message: "File tidak ditemukan." },
        { status: 400 },
      );
    }

    if (!memberId) {
      return NextResponse.json(
        { message: "ID anggota tidak valid." },
        { status: 400 },
      );
    }

    const validation = await validateImageFile(file, MAX_AVATAR_FILE_SIZE);
    if (!validation.valid) {
      return NextResponse.json({ message: validation.error }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
      return NextResponse.json(
        { message: "File harus berupa gambar (JPG, PNG, WebP, GIF, HEIC, AVIF)." },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    const { data: member } = await supabase
      .from("organisation_members")
      .select("id, organisation_role_id")
      .eq("id", memberId)
      .single();

    if (!member) {
      return NextResponse.json(
        { message: "Anggota tidak ditemukan." },
        { status: 404 },
      );
    }

    const { data: role } = await supabase
      .from("organisation_roles")
      .select("tenant_id")
      .eq("id", member.organisation_role_id)
      .single();

    if (!role) {
      return NextResponse.json(
        { message: "Peran tidak ditemukan." },
        { status: 404 },
      );
    }

    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `organisation-members/custom-${memberId}-${Date.now()}.${fileExtension}`;

    await serverUpload(new Uint8Array(await file.arrayBuffer()), fileName, file.type);

    return NextResponse.json({
      ok: true,
      avatarUrl: getPublicUrl(fileName),
      filePath: fileName,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal mengupload foto." },
      { status: 500 },
    );
  }
}
