import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const status = searchParams.get("status");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("administrasi_letters")
      .select(`
        *,
        letter_type:administrasi_letter_types!administrasi_letters_letter_type_id_fkey(id, code, name, slug),
        user:users!administrasi_letters_user_id_fkey(id, full_name)
      `, { count: "exact" })
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const isAdmin = searchParams.get("admin") === "true";
    if (!isAdmin) {
      query = query.eq("user_id", session.userId);
    }

    const { data: letters, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: "Gagal memuat surat" }, { status: 500 });
    }

    return NextResponse.json({
      data: letters ?? [],
      meta: {
        total: count ?? 0,
        page,
        limit,
        has_more: (count ?? 0) > offset + limit,
      },
    });
  } catch {
    return NextResponse.json({ error: "Gagal memuat surat" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const body = await request.json() as {
      letter_type_slug: string;
      data: Record<string, any>;
    };

    if (!body.letter_type_slug || !body.data) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const { data: letterType, error: typeError } = await supabase
      .from("administrasi_letter_types")
      .select("id")
      .eq("slug", body.letter_type_slug)
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("is_active", true)
      .single();

    if (typeError || !letterType) {
      return NextResponse.json({ error: "Jenis surat tidak ditemukan" }, { status: 404 });
    }

    const profile = await fetchUserProfile(supabase, session.userId);

    const letterData = {
      ...body.data,
      _profile: profile,
    };

    const { data: letter, error } = await supabase
      .from("administrasi_letters")
      .insert({
        tenant_id: DEFAULT_TENANT_ID,
        letter_type_id: letterType.id,
        user_id: session.userId,
        status: "draft",
        data: letterData,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Gagal menyimpan surat" }, { status: 500 });
    }

    await supabase.from("administrasi_letter_logs").insert({
      letter_id: letter.id,
      action: "created",
      user_id: session.userId,
      metadata: { letter_type_slug: body.letter_type_slug },
    });

    return NextResponse.json({ data: letter }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan surat" }, { status: 500 });
  }
}

async function fetchUserProfile(supabase: any, userId: string) {
  const { data: user } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .single();

  const { data: admProfile } = await supabase
    .from("administrasi_user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: houseLink } = await supabase
    .from("user_houses")
    .select("houses(blok_rumah)")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .maybeSingle();

  const blokRumah = (houseLink?.houses as any)?.blok_rumah ?? null;

  return {
    nama: user?.full_name || "",
    nik: admProfile?.nik || "",
    tempat_lahir: admProfile?.tempat_lahir || "",
    tanggal_lahir: admProfile?.tanggal_lahir
      ? new Date(admProfile.tanggal_lahir).toLocaleDateString("id-ID")
      : "",
    jenis_kelamin: admProfile?.jenis_kelamin || "",
    agama: admProfile?.agama || "",
    pekerjaan: admProfile?.pekerjaan || "",
    alamat: blokRumah || "",
    kewarganegaraan: admProfile?.kewarganegaraan || "WNI",
    status_perkawinan: admProfile?.status_perkawinan || "",
  };
}
