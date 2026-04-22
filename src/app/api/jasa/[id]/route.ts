import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";

interface JasaServiceDetailWithMedia {
  id: string;
  name: string;
  summary: string | null;
  description: string | null;
  estimated_price: number;
  hari_operasional: Record<string, boolean>;
  jam_operasional_mulai: string;
  jam_operasional_selesai: string;
  is_available: boolean;
  wa_number: string | null;
  location_note: string | null;
  owner_display_name: string;
  owner_user_id: string;
  category_name: string;
  category_icon: string | null;
  media: Array<{
    id: string;
    url: string;
    alt_text: string | null;
    sort_order: number;
    is_primary: boolean;
  }>;
  created_at: string;
  updated_at: string | null;
}

// PUT request body
interface UpdateJasaRequest {
  name?: string;
  description?: string;
  summary?: string;
  estimated_price?: number;
  category_id?: string;
  hari_operasional?: Record<string, boolean>;
  jam_operasional_mulai?: string;
  jam_operasional_selesai?: string;
  is_available?: boolean;
  wa_number?: string;
  location_note?: string;
}

/**
 * GET /api/jasa/[id]
 * Get single jasa service detail with all media
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { id } = await params;

  try {
    const { data: service, error: serviceError } = await supabase
      .from("jasa_services")
      .select(
        `
        id,
        name,
        summary,
        description,
        estimated_price,
        hari_operasional,
        jam_operasional_mulai,
        jam_operasional_selesai,
        is_available,
        wa_number,
        location_note,
        owner_display_name,
        owner_user_id,
        category_id,
        created_at,
        updated_at
      `,
      )
      .eq("id", id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json(
        { success: false, error: "Layanan jasa tidak ditemukan" },
        { status: 404 },
      );
    }

    // Authorization: users can view any available service, or their own any status

    if (!service.is_available && service.owner_user_id !== session.userId) {
      return NextResponse.json(
        { success: false, error: "Layanan jasa tidak tersedia" },
        { status: 404 },
      );
    }

    // Fetch category info
    const { data: category } = await supabase
      .from("marketplace_categories")
      .select("id, name, icon")
      .eq("id", service.category_id)
      .single();

    // Fetch all media for this service
    const { data: media, error: mediaError } = await supabase
      .from("jasa_service_media")
      .select("id, url, alt_text, sort_order, is_primary")
      .eq("service_id", id)
      .order("sort_order", { ascending: true });

    const response: JasaServiceDetailWithMedia = {
      ...service,
      category_name: category?.name || "Tidak Diketahui",
      category_icon: category?.icon || null,
      media: media || [],
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error: any) {
    console.error("Error fetching jasa service:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat detail layanan" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/jasa/[id]
 * Update jasa service (owner only)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { id } = await params;

    try {
      const body: UpdateJasaRequest = await request.json();

      // Check if service exists and user is owner
      const { data: existingService, error: fetchError } = await supabase
        .from("jasa_services")
        .select("id, owner_user_id")
        .eq("id", id)
        .single();

      if (fetchError || !existingService) {
      return NextResponse.json(
        { success: false, error: "Layanan jasa tidak ditemukan" },
        { status: 404 },
      );
    }

    if (existingService.owner_user_id !== session.userId) {
      return NextResponse.json(
        { success: false, error: "Tidak memiliki izin untuk mengedit" },
        { status: 403 },
      );
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: session.userId,
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.estimated_price !== undefined)
      updateData.estimated_price = body.estimated_price;
    if (body.category_id !== undefined)
      updateData.category_id = body.category_id;
    if (body.hari_operasional !== undefined)
      updateData.hari_operasional = body.hari_operasional;
    if (body.jam_operasional_mulai !== undefined)
      updateData.jam_operasional_mulai = body.jam_operasional_mulai;
    if (body.jam_operasional_selesai !== undefined)
      updateData.jam_operasional_selesai = body.jam_operasional_selesai;
    if (body.is_available !== undefined)
      updateData.is_available = body.is_available;
    if (body.wa_number !== undefined) updateData.wa_number = body.wa_number;
    if (body.location_note !== undefined)
      updateData.location_note = body.location_note;

    // If name changed, update slug
    if (body.name) {
      const slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 220);
      updateData.slug = slug;
    }

    // Validate time range if both provided
    if (body.jam_operasional_mulai && body.jam_operasional_selesai) {
      if (body.jam_operasional_mulai >= body.jam_operasional_selesai) {
        return NextResponse.json(
          {
            success: false,
            error: "Jam operasional mulai harus sebelum jam selesai",
          },
          { status: 400 },
        );
      }
    }

    // Validate category if changed
    if (body.category_id) {
      const { data: category } = await supabase
        .from("marketplace_categories")
        .select("domain_id")
        .eq("id", body.category_id)
        .single();

      if (category) {
        const { data: jasaDomain } = await supabase
          .from("marketplace_domains")
          .select("id")
          .eq("code", "JASA")
          .single();

        if (!jasaDomain) {
          return NextResponse.json(
            { success: false, error: "Domain JASA tidak ditemukan" },
            { status: 500 },
          );
        }

        if (category.domain_id !== jasaDomain.id) {
          return NextResponse.json(
            { success: false, error: "Kategori tidak termasuk domain JASA" },
            { status: 400 },
          );
        }
      }
    }

    // Perform update
    const { data: updatedService, error: updateError } = await supabase
      .from("jasa_services")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating jasa service:", updateError);
      return NextResponse.json(
        { success: false, error: "Gagal memperbarui layanan jasa" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedService,
      message: "Layanan jasa berhasil diperbarui",
    });
  } catch (error: any) {
    console.error("Error updating jasa service:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui layanan jasa" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/jasa/[id]
 * Delete jasa service (owner only) - cascades to media in storage
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { id } = await params;

  try {
    // Check if service exists and user is owner
    const { data: existingService, error: fetchError } = await supabase
      .from("jasa_services")
      .select("id, owner_user_id")
      .eq("id", id)
      .single();

    if (fetchError || !existingService) {
      return NextResponse.json(
        { success: false, error: "Layanan jasa tidak ditemukan" },
        { status: 404 },
      );
    }

    if (existingService.owner_user_id !== session.userId) {
      return NextResponse.json(
        { success: false, error: "Tidak memiliki izin untuk menghapus" },
        { status: 403 },
      );
    }

    // Fetch all media URLs before deletion to clean up storage
    const { data: media } = await supabase
      .from("jasa_service_media")
      .select("id, url")
      .eq("service_id", id);

    // Delete media from storage bucket
    if (media && media.length > 0) {
      const filePaths = media
        .map((m) => {
          const urlParts = m.url.split("/jasa-images/");
          return urlParts[1] || null;
        })
        .filter(Boolean);

      if (filePaths.length > 0) {
        await supabase.storage
          .from("jasa-images")
          .remove(filePaths)
          .catch((err) => {
            console.error("Failed to delete files from storage:", err);
          });
      }
    }

    // Delete service (cascade will handle media table records)
    const { error: deleteError } = await supabase
      .from("jasa_services")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting jasa service:", deleteError);
      return NextResponse.json(
        { success: false, error: "Gagal menghapus layanan jasa" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Layanan jasa berhasil dihapus",
    });
  } catch (error: any) {
    console.error("Error deleting jasa service:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus layanan jasa" },
      { status: 500 },
    );
  }
}
