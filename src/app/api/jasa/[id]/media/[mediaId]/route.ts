import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { deleteObject } from "@/lib/r2";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { id, mediaId } = await params;

  try {
    const { data: media, error: mediaError } = await supabase
      .from("jasa_service_media")
      .select("id, service_id, url, is_primary")
      .eq("id", mediaId)
      .eq("service_id", id)
      .single();

    if (mediaError || !media) {
      return NextResponse.json(
        { success: false, error: "Media tidak ditemukan" },
        { status: 404 },
      );
    }

    const { data: service, error: serviceError } = await supabase
      .from("jasa_services")
      .select("owner_user_id")
      .eq("id", id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { success: false, error: "Layanan jasa tidak ditemukan" },
        { status: 404 },
      );
    }

    if (service.owner_user_id !== session.userId) {
      return NextResponse.json(
        { success: false, error: "Tidak memiliki izin untuk menghapus" },
        { status: 403 },
      );
    }

    const baseUrl = process.env.R2_PUBLIC_BASE_URL;
    const objectKey = baseUrl && media.url.startsWith(baseUrl)
      ? media.url.replace(baseUrl + "/", "")
      : null;

    if (objectKey) {
      await deleteObject(objectKey);
    }

    const { error: deleteError } = await supabase
      .from("jasa_service_media")
      .delete()
      .eq("id", mediaId);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: "Gagal menghapus media" },
        { status: 500 },
      );
    }

    if (media.is_primary) {
      const { data: nextMedia } = await supabase
        .from("jasa_service_media")
        .select("id")
        .eq("service_id", id)
        .order("sort_order", { ascending: true })
        .limit(1);

      if (nextMedia && nextMedia.length > 0) {
        await supabase
          .from("jasa_service_media")
          .update({ is_primary: true })
          .eq("id", nextMedia[0].id);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Media berhasil dihapus",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Gagal menghapus media" },
      { status: 500 },
    );
  }
}
