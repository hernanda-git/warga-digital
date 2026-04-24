import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireCanManageOrganisation } from "../../require-manage";

/**
 * POST /api/organisation/members/avatar
 * Upload custom avatar for organisation member
 * Body: FormData with 'file' and 'memberId'
 */
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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { message: "File harus berupa gambar (JPG, PNG, dll)." },
        { status: 400 },
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: "Ukuran file maksimal 5MB." },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Verify member exists and user has permission
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

    // Upload to Supabase Storage
    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `custom-${memberId}-${Date.now()}.${fileExtension}`;
    const filePath = `organisation-members/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { message: "Gagal mengupload foto." },
        { status: 500 },
      );
    }

    // Get public URL
    const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? "";
    const avatarUrl = `${baseUrl}/storage/v1/object/public/avatars/${filePath}`;

    return NextResponse.json({
      ok: true,
      avatarUrl,
      filePath,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal mengupload foto." },
      { status: 500 },
    );
  }
}
