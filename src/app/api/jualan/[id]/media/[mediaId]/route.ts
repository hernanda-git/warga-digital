import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { deleteObject, extractObjectKey } from "@/lib/r2";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "@/lib/api-response";

/**
 * DELETE /api/jualan/[id]/media/[mediaId]
 * Delete media from R2 and database
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> },
) {
  const resolvedParams = await params;
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return unauthorizedResponse();
    }

    const supabase = createServerClient();

    const { data: media } = await supabase
      .from("jualan_item_media")
      .select("url, item_id, is_primary")
      .eq("id", resolvedParams.mediaId)
      .eq("item_id", resolvedParams.id)
      .single();

    if (!media) {
      return notFoundResponse("Media tidak ditemukan");
    }

    const { data: goods } = await supabase
      .from("jualan_goods")
      .select("owner_user_id")
      .eq("id", resolvedParams.id)
      .single();

    if (!goods) {
      return notFoundResponse("Barang tidak ditemukan");
    }

    if (goods.owner_user_id !== session.userId) {
      return forbiddenResponse("Anda bukan pemilik barang ini");
    }

    const objectKey = extractObjectKey(media.url);

    if (objectKey) {
      try {
        await deleteObject(objectKey);
      } catch (r2Error) {
      }
    }

    const { error: deleteError } = await supabase
      .from("jualan_item_media")
      .delete()
      .eq("id", resolvedParams.mediaId);

    if (deleteError) {
      return errorResponse("Gagal menghapus media", 500);
    }

    if (media.is_primary) {
      const { data: remainingMedia } = await supabase
        .from("jualan_item_media")
        .select("id")
        .eq("item_id", resolvedParams.id)
        .order("sort_order", { ascending: true })
        .limit(1);

      if (remainingMedia && remainingMedia.length > 0) {
        await supabase
          .from("jualan_item_media")
          .update({ is_primary: true })
          .eq("id", remainingMedia[0].id);
      }
    }

    return successResponse({ message: "Media berhasil dihapus" });
  } catch (error) {
    return errorResponse("Terjadi kesalahan server", 500);
  }
}


