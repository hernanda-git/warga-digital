import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";

/**
 * GET /api/admin/settings
 *
 * Returns all app settings as a JSON object { [key]: value }.
 * Any authenticated user can read settings (needed for the sidebar logo, etc.).
 */
export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .eq("tenant_id", DEFAULT_TENANT_ID);

  if (error) {
    return NextResponse.json(
      { error: "Gagal memuat pengaturan." },
      { status: 500 },
    );
  }

  // Convert rows to a flat object { key: value }
  const settings: Record<string, string | null> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }

  return NextResponse.json(settings);
}

/**
 * PUT /api/admin/settings
 *
 * Upserts a single app setting.
 * Body: { key: string, value: string }
 * Requires admin role.
 */
export async function PUT(request: NextRequest) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    key?: string;
    value?: string;
  };

  const key = body.key?.trim();
  if (!key) {
    return NextResponse.json({ error: "Key wajib diisi." }, { status: 400 });
  }

  if (key.length > 100) {
    return NextResponse.json(
      { error: "Key maksimal 100 karakter." },
      { status: 400 },
    );
  }

  const value = body.value ?? null;

  const { error } = await supabase.from("app_settings").upsert(
    {
      tenant_id: DEFAULT_TENANT_ID,
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by: session.userId,
    },
    {
      onConflict: "tenant_id, key",
      ignoreDuplicates: false,
    },
  );

  if (error) {
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, key, value });
}
