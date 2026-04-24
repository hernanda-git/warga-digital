import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";

/**
 * POST /api/jasa/[id]/upload
 * Upload images for a jasa service
 *
 * Expects: multipart/form-data with:
 * - files: multiple image files (FileList)
 * - is_primary (optional): boolean string for first file if not set
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Require authentication
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { id } = await params;

  try {
    // Check if service exists and user is owner
    const { data: service, error: fetchError } = await supabase
      .from("jasa_services")
      .select("id, owner_user_id")
      .eq("id", id)
      .single();

    if (fetchError || !service) {
      return NextResponse.json(
        { success: false, error: "Layanan jasa tidak ditemukan" },
        { status: 404 },
      );
    }

    if (service.owner_user_id !== session.userId) {
      return NextResponse.json(
        { success: false, error: "Tidak memiliki izin untuk upload" },
        { status: 403 },
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const isPrimaryParam = formData.get("is_primary") as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "Tidak ada file yang diupload" },
        { status: 400 },
      );
    }

    // Limit: max 5 additional images per upload (or 1 if primary not set yet)
    const existingMediaCount = await getMediaCount(supabase, id);
    const maxImages = 5;
    const canUploadCount = maxImages - existingMediaCount;

    if (canUploadCount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Maksimum ${maxImages} gambar per layanan`,
        },
        { status: 400 },
      );
    }

    if (files.length > canUploadCount) {
      return NextResponse.json(
        {
          success: false,
          error: `Hanya dapat upload ${canUploadCount} gambar lagi`,
        },
        { status: 400 },
      );
    }

    // Determine if we need to set a primary image
    const needsPrimary = !(await hasPrimaryImage(supabase, id));
    const uploadedMedia: Array<{
      id: string;
      url: string;
      is_primary: boolean;
    }> = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPrimary = needsPrimary && i === 0 && isPrimaryParam !== "false";

      const uploadResult = await uploadImageToStorage(
        supabase,

        session.userId,

        id,

        file,

        isPrimary,
      );

      if (!uploadResult.success || !uploadResult.url) {
        // Delete any already uploaded files on failure
        for (const media of uploadedMedia) {
          const path = extractPathFromUrl(media.url);
          if (path) {
            await supabase.storage.from("jasa-images").remove([path]);
          }
        }
        return NextResponse.json(
          {
            success: false,
            error: uploadResult.error || "Gagal upload gambar",
          },
          { status: 500 },
        );
      }

      // Insert media record
      const { data: mediaRecord, error: insertError } = await supabase
        .from("jasa_service_media")
        .insert({
          service_id: id,
          url: uploadResult.url,
          alt_text: `Gambar layanan ${i + 1}`,
          sort_order: existingMediaCount + i,
          is_primary: isPrimary,
        })
        .select("id, url, is_primary")
        .single();

      if (insertError) {
        // Cleanup storage
        const path = extractPathFromUrl(uploadResult.url);
        if (path) {
          await supabase.storage.from("jasa-images").remove([path]);
        }
        return NextResponse.json(
          { success: false, error: "Gagal menyimpan data gambar" },
          { status: 500 },
        );
      }

      uploadedMedia.push(mediaRecord);
    }

    return NextResponse.json({
      success: true,
      data: uploadedMedia,
      message: `${files.length} gambar berhasil diupload`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Gagal upload gambar" },
      { status: 500 },
    );
  }
}

// Helper: Check if service already has a primary image
async function hasPrimaryImage(
  supabase: any,
  serviceId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("jasa_service_media")
    .select("id")
    .eq("service_id", serviceId)
    .eq("is_primary", true)
    .limit(1);

  return (data && data.length > 0) || false;
}

// Helper: Get count of existing media
async function getMediaCount(
  supabase: any,
  serviceId: string,
): Promise<number> {
  const { count } = await supabase
    .from("jasa_service_media")
    .select("*", { count: "exact" })
    .eq("service_id", serviceId);

  return count || 0;
}

// Helper: Upload image to Supabase storage
async function uploadImageToStorage(
  supabase: any,
  userId: string,
  serviceId: string,
  file: File,
  isPrimary: boolean,
): Promise<{ success: boolean; url: string | null; error?: string }> {
  try {
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        url: null,
        error: "Tipe file tidak didukung (hanya JPEG, PNG, WebP)",
      };
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        url: null,
        error: "Ukuran file terlalu besar (maks 10MB)",
      };
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${serviceId}/${fileName}`;

    // Upload to storage bucket 'jasa-images'
    const { error: uploadError } = await supabase.storage
      .from("jasa-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return { success: false, url: null, error: "Gagal upload gambar" };
    }

    // Get public URL with transformation for optimization
    const { data: publicUrlData } = supabase.storage
      .from("jasa-images")
      .getPublicUrl(filePath);

    return { success: true, url: publicUrlData.publicUrl };
  } catch (error) {
    return { success: false, url: null, error: "Gagal upload gambar" };
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
