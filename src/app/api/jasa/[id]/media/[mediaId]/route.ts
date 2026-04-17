import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";

/**
 * DELETE /api/jasa/[id]/media/[mediaId]
 * Delete specific media from a jasa service (owner only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  // Require authentication
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { id, mediaId } = await params;

  try {
    // Verify the media belongs to this service
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

    // Check if user is the owner of the service
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

    // Extract file path from URL for storage deletion
    const filePath = extractPathFromUrl(media.url);

    // Delete from storage first (if file exists)
    if (filePath) {
      await supabase.storage
        .from("jasa-images")
        .remove([filePath])
        .catch((err) => {
          console.error("Failed to delete file from storage:", err);
        });
    }

    // Delete media record from database
    const { error: deleteError } = await supabase
      .from("jasa_service_media")
      .delete()
      .eq("id", mediaId);

    if (deleteError) {
      console.error("Error deleting media record:", deleteError);
      return NextResponse.json(
        { success: false, error: "Gagal menghapus media" },
        { status: 500 },
      );
    }

    // If deleted media was primary, promote another image to primary
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
    console.error("Error deleting media:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus media" },
      { status: 500 },
    );
  }
}

// Helper: Extract storage path from public URL
function extractPathFromUrl(url: string): string | null {
  try {
    // URL format: https://[bucket].supabase.co/storage/v1/object/public/jasa-images/[path]
    const parts = url.split("/jasa-images/");
    return parts[1] || null;
  } catch {
    return null;
  }
}
