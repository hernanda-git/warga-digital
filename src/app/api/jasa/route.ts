import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";

// Types for query parameters
interface JasaListQuery {
  page?: string;
  limit?: string;
  category_id?: string;
  is_available?: string;
  hari?: string;
  min_price?: string;
  max_price?: string;
  q?: string;
  community_id?: string;
}

// Types for response
interface JasaServiceWithMedia {
  id: string;
  name: string;
  summary: string | null;
  description: string | null;
  estimated_price: number;
  currency_code: string;
  hari_operasional: Record<string, boolean>;
  jam_operasional_mulai: string;
  jam_operasional_selesai: string;
  is_available: boolean;
  wa_number: string | null;
  location_note: string | null;
  rating_avg: number;
  rating_count: number;
  is_featured: boolean;
  published_at: string | null;
  owner_display_name: string;
  owner_blok_rumah: string | null;
  category_name: string;
  category_icon: string | null;
  primary_image_url: string | null;
  created_at: string;
}

interface JasaListResponse {
  success: boolean;
  data: {
    services: JasaServiceWithMedia[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
    filters: {
      categories: Array<{ id: string; name: string; icon: string | null }>;
    };
  };
}

/**
 * GET /api/jasa
 * List JASA services with filters and pagination
 */
export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  try {
    const { searchParams } = new URL(request.url);
    const query: JasaListQuery = {};

    for (const [key, value] of searchParams.entries()) {
      query[key as keyof JasaListQuery] = value as any;
    }

    const page = Math.min(parseInt(query.page || "1"), 100);

    const limit = Math.min(parseInt(query.limit || "20"), 50);

    const offset = (page - 1) * limit;

    // Get tenant ID for the current user

    console.log("[Jasa GET] Fetching tenant_user for userId:", session.userId);
    const { data: tenantUser, error: tenantUserError } = await supabase

      .from("tenant_users")

      .select("tenant_id")

      .eq("user_id", session.userId)

      .single();
    console.log("[Jasa GET] tenant_user result:", {
      tenantUser,
      tenantUserError,
    });

    if (tenantUserError || !tenantUser) {
      return NextResponse.json(
        { success: false, error: "User tidak terdaftar di tenant" },
        { status: 403 },
      );
    }

    let tenantId = tenantUser.tenant_id;

    if (searchParams.get("community_id")) {
      console.log(
        "[Jasa GET] Fetching community with id:",
        searchParams.get("community_id"),
      );

      const { data: community, error: commError } = await supabase

        .from("communities")

        .select("tenant_id")

        .eq("id", searchParams.get("community_id"))

        .single();

      console.log("[Jasa GET] community result:", { community, commError });

      if (commError || !community) {
        return NextResponse.json(
          { success: false, error: "Community not found" },
          { status: 404 },
        );
      }

      tenantId = community.tenant_id;
    }

    let baseQuery = supabase

      .from("jasa_services")

      .select(
        `

        id,

        name,

        summary,

        description,

        estimated_price,

        currency_code,

        hari_operasional,

        jam_operasional_mulai,

        jam_operasional_selesai,

        is_available,

        wa_number,

        location_note,

        rating_avg,

        rating_count,

        is_featured,


        published_at,



        owner_user_id,



        category_id,


        created_at

      `,

        { count: "exact" },
      )

      .or(`is_available.eq.true,owner_user_id.eq.${session.userId}`)

      .eq("tenant_id", tenantId);

    if (query.category_id) {
      baseQuery = baseQuery.eq("category_id", query.category_id);
    }

    if (query.is_available !== undefined) {
      baseQuery = baseQuery.eq("is_available", query.is_available === "true");
    }

    if (query.min_price) {
      baseQuery = baseQuery.gte("estimated_price", parseFloat(query.min_price));
    }

    if (query.max_price) {
      baseQuery = baseQuery.lte("estimated_price", parseFloat(query.max_price));
    }

    if (query.q) {
      baseQuery = baseQuery.or(
        `name.ilike.%${query.q}%,description.ilike.%${query.q}%,summary.ilike.%${query.q}%`,
      );
    }

    if (query.hari) {
      const hariFilter = { [query.hari]: true };
      baseQuery = baseQuery.contains("hari_operasional", hariFilter);
    }

    // Build count query with same filters

    console.log("[Jasa GET] Building count query with filters:", {
      category_id: query.category_id,

      is_available: query.is_available,
      min_price: query.min_price,

      max_price: query.max_price,

      q: query.q,

      hari: query.hari,

      tenantId,
    });

    let countQuery = supabase

      .from("jasa_services")

      .select("*", { count: "exact", head: true })

      .or(`is_available.eq.true,owner_user_id.eq.${session.userId}`)

      .eq("tenant_id", tenantId);

    if (query.category_id) {
      countQuery = countQuery.eq("category_id", query.category_id);
    }

    if (query.is_available !== undefined) {
      countQuery = countQuery.eq("is_available", query.is_available === "true");
    }

    if (query.min_price) {
      countQuery = countQuery.gte(
        "estimated_price",
        parseFloat(query.min_price),
      );
    }

    if (query.max_price) {
      countQuery = countQuery.lte(
        "estimated_price",
        parseFloat(query.max_price),
      );
    }

    if (query.q) {
      countQuery = countQuery.or(
        `name.ilike.%${query.q}%,description.ilike.%${query.q}%,summary.ilike.%${query.q}%`,
      );
    }

    if (query.hari) {
      const hariFilter = { [query.hari]: true };
      countQuery = countQuery.contains("hari_operasional", hariFilter);
    }

    console.log("[Jasa GET] Executing count query");
    const { count: total, error: countError } = await countQuery;

    console.log("[Jasa GET] Count query result:", { total, countError });

    if (countError) {
      throw countError;
    }

    const { data: services, error: servicesError } = await baseQuery

      .order("is_featured", { ascending: false })

      .order("published_at", { ascending: false })

      .order("created_at", { ascending: false })

      .range(offset, offset + limit - 1);

    if (servicesError) {
      throw servicesError;
    }

    const ownerIds = [...new Set(services.map((s) => s.owner_user_id))];

    console.log("[Jasa GET] Fetching owners for ids:", ownerIds);
    const { data: owners } = await supabase

      .from("users")

      .select("id, full_name, blok_rumah")

      .in("id", ownerIds);
    console.log("[Jasa GET] Owners result:", {
      ownersCount: owners?.length,
      owners,
    });

    const ownerMap = new Map(
      (owners || []).map((u) => [
        u.id,
        { name: u.full_name, blok: u.blok_rumah },
      ]),
    );

    const categoryIds = [...new Set(services.map((s) => s.category_id))];
    const { data: categories } = await supabase
      .from("marketplace_categories")

      .select("id, name, icon")

      .in("id", categoryIds);

    const categoryMap = new Map(
      (categories || []).map((c) => [c.id, { name: c.name, icon: c.icon }]),
    );

    const serviceIds = services.map((s) => s.id);

    console.log("[Jasa GET] Fetching media for service ids:", serviceIds);
    const { data: media } = await supabase

      .from("jasa_service_media")

      .select("service_id, url, alt_text")

      .in("service_id", serviceIds)

      .eq("is_primary", true);

    console.log("[Jasa GET] Media result:", {
      mediaCount: media?.length,
      media,
    });

    const mediaMap = new Map((media || []).map((m) => [m.service_id, m.url]));

    const enrichedServices: JasaServiceWithMedia[] = services.map(
      (service) => {
        const owner = ownerMap.get(service.owner_user_id);
        return {
          ...service,

          owner_display_name: owner?.name || "Unknown",
          owner_blok_rumah: owner?.blok || null,
          category_name:
            categoryMap.get(service.category_id)?.name || "Tidak Diketahui",

          category_icon: categoryMap.get(service.category_id)?.icon || null,

          primary_image_url: mediaMap.get(service.id) || null,
        };
      },
    );

    console.log("[Jasa GET] Fetching all categories for JASA domain");
    const { data: allCategories } = await supabase

      .from("marketplace_categories")

      .select("id, name, icon")

      .eq(
        "domain_id",

        (
          await supabase

            .from("marketplace_domains")

            .select("id")

            .eq("code", "JASA")

            .single()
        ).data?.id,
      )

      .eq("is_active", true)

      .order("sort_order");
    console.log("[Jasa GET] All categories result:", {
      allCategoriesCount: allCategories?.length,
      allCategories,
    });

    const response: JasaListResponse = {
      success: true,
      data: {
        services: enrichedServices,
        pagination: {
          page,
          limit,
          total: total || 0,
          total_pages: Math.ceil((total || 0) / limit),
        },
        filters: {
          categories: (allCategories || []).map((c) => ({
            id: c.id,
            name: c.name,
            icon: c.icon,
          })),
        },
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Error fetching jasa services:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memuat layanan jasa" },
      { status: 500 },
    );
  }
}

// POST request body interface
interface CreateJasaRequest {
  name: string;
  description?: string;
  summary?: string;
  estimated_price: number;
  category_id: string;
  hari_operasional: Record<string, boolean>;
  jam_operasional_mulai: string;
  jam_operasional_selesai: string;
  status?: string;
  wa_number?: string;
  location_note?: string;
}

/**
 * POST /api/jasa
 * Create new jasa service listing
 */
export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  try {
    const formData = await request.formData();

    console.log("[Jasa POST] Form data keys:", [...formData.keys()]);

    const name = formData.get("name") as string;

    const description = formData.get("description") as string | null;
    const summary = formData.get("summary") as string | null;
    const estimated_price_str = formData.get("estimated_price") as string;
    const category_id = formData.get("category_id") as string;
    const hari_operasional_str = formData.get("hari_operasional") as string;
    const jam_mulai = formData.get("jam_operasional_mulai") as string;
    const jam_selesai = formData.get("jam_operasional_selesai") as string;
    const status = formData.get("status") as string;
    const wa_number = formData.get("wa_number") as string | null;
    const location_note = formData.get("location_note") as string | null;
    const primary_image_file = formData.get("primary_image") as File | null;

    if (
      !name ||
      !estimated_price_str ||
      !category_id ||
      !hari_operasional_str ||
      !jam_mulai ||
      !jam_selesai
    ) {
      return NextResponse.json(
        { success: false, error: "Semua field yang diperlukan harus diisi" },
        { status: 400 },
      );
    }

    const estimated_price = parseFloat(estimated_price_str);
    if (isNaN(estimated_price) || estimated_price < 0) {
      return NextResponse.json(
        { success: false, error: "Harga tidak valid" },
        { status: 400 },
      );
    }

    let hari_operasional: Record<string, boolean>;
    try {
      hari_operasional = JSON.parse(hari_operasional_str);
      const requiredKeys = [
        "senin",
        "selasa",
        "rabu",
        "kamis",
        "jumat",
        "sabtu",
        "minggu",
        "tanggal_merah",
      ];
      if (!requiredKeys.every((key) => key in hari_operasional)) {
        throw new Error("Missing keys");
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Format hari operasional tidak valid" },
        { status: 400 },
      );
    }

    if (jam_mulai >= jam_selesai) {
      return NextResponse.json(
        {
          success: false,
          error: "Jam operasional mulai harus sebelum jam selesai",
        },
        { status: 400 },
      );
    }

    // Default to AVAILABLE if not provided
    const finalStatus = status || "AVAILABLE";

    const { data: user, error: userError } = await supabase

      .from("users")

      .select("full_name")

      .eq("id", session.userId)

      .single();

    console.log("[Jasa POST] User fetch result:", { user, userError });

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 220);

    const { data: category, error: categoryError } = await supabase

      .from("marketplace_categories")

      .select("id, domain_id")

      .eq("id", category_id)

      .single();

    console.log("[Jasa POST] Category fetch result:", {
      category,
      categoryError,
    });

    if (categoryError || !category) {
      return NextResponse.json(
        { success: false, error: "Kategori tidak ditemukan" },
        { status: 404 },
      );
    }

    const { data: jasaDomain } = await supabase

      .from("marketplace_domains")

      .select("id")

      .eq("code", "JASA")

      .single();

    console.log("[Jasa POST] JASA domain fetch result:", jasaDomain);

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

    const { data: tenantUser, error: tenantUserError } = await supabase

      .from("tenant_users")

      .select("tenant_id")

      .eq("user_id", session.userId)

      .single();

    console.log("[Jasa POST] Tenant user fetch result:", {
      tenantUser,
      tenantUserError,
    });

    if (tenantUserError || !tenantUser) {
      return NextResponse.json(
        { success: false, error: "User bukan anggota tenant" },
        { status: 400 },
      );
    }

    const { data: newService, error: insertError } = await supabase

      .from("jasa_services")

      .insert({
        tenant_id: tenantUser.tenant_id,

        category_id,

        owner_user_id: session.userId,

        owner_display_name: user.full_name,

        name,

        slug,

        description,

        summary,

        estimated_price,

        currency_code: "IDR",

        hari_operasional,

        jam_operasional_mulai: jam_mulai,

        jam_operasional_selesai: jam_selesai,

        status: finalStatus,

        published_at: new Date().toISOString(),

        wa_number,

        location_note,
      })

      .select()

      .single();

    console.log("[Jasa POST] Service insert result:", {
      newService,
      insertError,
    });

    if (insertError) {
      console.error("Error inserting jasa service:", insertError);
      return NextResponse.json(
        { success: false, error: "Gagal membuat layanan jasa" },
        { status: 500 },
      );
    }

    if (primary_image_file) {
      try {
        const uploadResult = await uploadImageToStorage(
          supabase,
          session.userId,
          newService.id,
          primary_image_file,
          true,
        );

        if (uploadResult.success && uploadResult.url) {
          await supabase.from("jasa_service_media").insert({
            service_id: newService.id,

            url: uploadResult.url,

            alt_text: name,

            sort_order: 0,

            is_primary: true,
          });

          console.log("[Jasa POST] Media insert result: success");
        }
      } catch (uploadError) {
        console.error("Error uploading primary image:", uploadError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: newService,
        message: "Layanan jasa berhasil dibuat",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating jasa service:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat layanan jasa" },
      { status: 500 },
    );
  }
}

// Helper function to upload image to Supabase storage
async function uploadImageToStorage(
  supabase: any,
  userId: string,
  serviceId: string,
  file: File,
  isPrimary: boolean,
): Promise<{ success: boolean; url: string | null; error?: string }> {
  try {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        url: null,
        error: "Tipe file tidak didukung (hanya JPEG, PNG, WebP)",
      };
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        url: null,
        error: "Ukuran file terlalu besar (maks 10MB)",
      };
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${userId}/${serviceId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("jasa-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { success: false, url: null, error: "Gagal upload gambar" };
    }

    const { data: publicUrlData } = supabase.storage
      .from("jasa-images")
      .getPublicUrl(filePath);

    return { success: true, url: publicUrlData.publicUrl };
  } catch (error) {
    console.error("Upload exception:", error);
    return { success: false, url: null, error: "Gagal upload gambar" };
  }
}
