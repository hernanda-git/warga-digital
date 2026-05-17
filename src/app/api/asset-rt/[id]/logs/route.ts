import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  forbiddenResponse,
} from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import type {
  AssetLog,
  AssetLogType,
  AssetUsageStatus,
} from "@/types/asset-rt";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): AssetLog {
  return {
    id: row.id as string,
    asset_id: row.asset_id as string,
    tenant_id: row.tenant_id as string,
    log_type: row.log_type as AssetLogType,
    old_status: (row.old_status as AssetUsageStatus) ?? null,
    new_status: (row.new_status as AssetUsageStatus) ?? null,
    part_name: (row.part_name as string) ?? null,
    replaced_with: (row.replaced_with as string) ?? null,
    image_url: (row.image_url as string) ?? null,
    old_quantity: (row.old_quantity as number) ?? null,
    new_quantity: (row.new_quantity as number) ?? null,
    notes: (row.notes as string) ?? null,
    logged_by: (row.logged_by as string) ?? null,
    logged_by_full_name:
      (row.logged_by_profile as { full_name?: string } | null)?.full_name ??
      null,
    logged_at: row.logged_at as string,
  };
}

// ─── GET /api/asset-rt/[id]/logs ─────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookie();
  if (!session) return unauthorizedResponse();

  const { id: assetId } = await params;
  const supabase = createServerClient();

  // Verify the asset exists
  const { data: asset, error: assetErr } = await supabase
    .from("rt_assets")
    .select("id")
    .eq("id", assetId)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .is("deleted_at", null)
    .single();

  if (assetErr || !asset) return notFoundResponse();

  const { data, error } = await supabase
    .from("rt_asset_logs")
    .select(
      `
      id, asset_id, tenant_id, log_type,
      old_status, new_status,
      part_name, replaced_with,
      image_url,
      old_quantity, new_quantity,
      notes,
      logged_by, logged_at,
      logged_by_profile:users!logged_by ( full_name )
    `,
    )
    .eq("asset_id", assetId)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .order("logged_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);

  const logs: AssetLog[] = (data ?? []).map((row) =>
    mapRow(row as Record<string, unknown>),
  );

  return successResponse({ logs });
}

// ─── POST /api/asset-rt/[id]/logs ────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookie();
  if (!session) return unauthorizedResponse();

  const { id: assetId } = await params;
  const supabase = createServerClient();

  const adminUser = await requireAdmin(supabase, session.userId);
  if (!adminUser) {
    return forbiddenResponse(
      "Hanya admin RT yang dapat menambah riwayat aset.",
    );
  }

  // Verify asset
  const { data: asset, error: assetErr } = await supabase
    .from("rt_assets")
    .select("id")
    .eq("id", assetId)
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .is("deleted_at", null)
    .single();

  if (assetErr || !asset) return notFoundResponse();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequestResponse("Invalid JSON body");
  }

  const log_type = body.log_type as AssetLogType | undefined;
  const validTypes: AssetLogType[] = [
    "status_change",
    "part_replacement",
    "maintenance",
    "general",
    "image_attachment",
    "quantity_change",
  ];

  if (!log_type || !validTypes.includes(log_type)) {
    return badRequestResponse(
      "log_type must be one of: status_change, part_replacement, maintenance, general, image_attachment, quantity_change",
    );
  }

  // ── Type-specific validation ──
  if (log_type === "status_change") {
    const validStatuses: AssetUsageStatus[] = ["used", "unused", "unset"];
    if (
      !body.new_status ||
      !validStatuses.includes(body.new_status as AssetUsageStatus)
    ) {
      return badRequestResponse("new_status required for status_change");
    }
  }

  if (log_type === "part_replacement") {
    if (!body.part_name || String(body.part_name).trim() === "") {
      return badRequestResponse("part_name required for part_replacement");
    }
    if (!body.replaced_with || String(body.replaced_with).trim() === "") {
      return badRequestResponse("replaced_with required for part_replacement");
    }
  }

  if (log_type === "maintenance" || log_type === "general") {
    if (!body.notes || String(body.notes).trim() === "") {
      return badRequestResponse(
        "notes required for maintenance and general entries",
      );
    }
  }

  if (log_type === "image_attachment") {
    if (!body.image_url || String(body.image_url).trim() === "") {
      return badRequestResponse("image_url required for image_attachment");
    }
    if (!body.notes || String(body.notes).trim() === "") {
      return badRequestResponse("notes required for image_attachment");
    }
  }

  if (log_type === "quantity_change") {
    if (
      body.new_quantity === undefined ||
      body.new_quantity === null ||
      isNaN(Number(body.new_quantity))
    ) {
      return badRequestResponse("new_quantity required for quantity_change");
    }
  }

  // ── Determine old_status for status_change ──
  let old_status: AssetUsageStatus | null = null;
  if (log_type === "status_change") {
    const { data: current } = await supabase
      .from("rt_assets")
      .select("is_used")
      .eq("id", assetId)
      .single();

    if (current) {
      old_status =
        current.is_used === true
          ? "used"
          : current.is_used === false
            ? "unused"
            : "unset";
    }

    // Also update the asset's is_used
    const newIsUsed =
      body.new_status === "used"
        ? true
        : body.new_status === "unused"
          ? false
          : null;

    await supabase
      .from("rt_assets")
      .update({ is_used: newIsUsed })
      .eq("id", assetId);
  }

  // ── Determine old_quantity for quantity_change ──
  let old_quantity: number | null = null;
  if (log_type === "quantity_change") {
    const { data: current } = await supabase
      .from("rt_assets")
      .select("quantity")
      .eq("id", assetId)
      .single();

    if (current) {
      old_quantity = current.quantity;
    }

    // Also update the asset's quantity
    await supabase
      .from("rt_assets")
      .update({ quantity: Number(body.new_quantity) })
      .eq("id", assetId);
  }

  // ── Sync catatan pada parent asset untuk log tipe general ──
  if (log_type === "general") {
    await supabase
      .from("rt_assets")
      .update({ notes: String(body.notes).trim() })
      .eq("id", assetId);
  }

  // ── Update asset's last-modified timestamp ──
  // Touch updated_at/updated_by so the parent reflects the new log activity
  await supabase
    .from("rt_assets")
    .update({
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId);

  // ── Insert log entry ──
  const insertData: Record<string, unknown> = {
    asset_id: assetId,
    tenant_id: DEFAULT_TENANT_ID,
    log_type,
    old_status,
    new_status: (body.new_status as string) ?? null,
    part_name: (body.part_name as string) ?? null,
    replaced_with: (body.replaced_with as string) ?? null,
    image_url: (body.image_url as string) ?? null,
    old_quantity: old_quantity,
    new_quantity:
      body.new_quantity !== undefined && body.new_quantity !== null
        ? Number(body.new_quantity)
        : null,
    notes: (body.notes as string) ?? null,
    logged_by: session.userId,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("rt_asset_logs")
    .insert(insertData)
    .select(
      `
      id, asset_id, tenant_id, log_type,
      old_status, new_status,
      part_name, replaced_with,
      image_url,
      old_quantity, new_quantity,
      notes,
      logged_by, logged_at,
      logged_by_profile:users!logged_by ( full_name )
    `,
    )
    .single();

  if (insertErr) return errorResponse(insertErr.message, 500);

  return successResponse(
    { log: mapRow(inserted as Record<string, unknown>) },
    201,
  );
}
