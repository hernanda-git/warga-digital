import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { serverUpload } from "@/lib/r2";

const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;

interface ScanResult {
  bucket: string;
  total: number;
  needsMigration: number;
}

interface MigrationItem {
  id: string;
  status: "ok" | "skipped" | "error";
  detail?: string;
}

interface MigrationResult {
  bucket: string;
  completed: number;
  skipped: number;
  failed: number;
  items: MigrationItem[];
}

function getR2PublicUrl(objectKey: string): string {
  return `${R2_PUBLIC_BASE_URL}/${objectKey}`;
}

async function fetchFromSupabase(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return res.arrayBuffer();
  } catch {
    return null;
  }
}

// ── GET /api/admin/migrate-storage ─────────────────────────────────────────
// Scan DB and return counts of items needing migration per bucket.

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const results: ScanResult[] = [];

    // Avatars
    const { count: avatarTotal, error: avatarCountErr } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .not("avatar_path", "is", null);
    results.push({
      bucket: "avatars",
      total: avatarTotal ?? 0,
      needsMigration: avatarTotal ?? 0,
    });

    // Jasa images
    const { count: jasaTotal, error: jasaCountErr } = await supabase
      .from("jasa_service_media")
      .select("id", { count: "exact", head: true });
    const { count: jasaSupabase } = await supabase
      .from("jasa_service_media")
      .select("id", { count: "exact", head: true })
      .ilike("url", `%supabase.co%`);
    results.push({
      bucket: "jasa-images",
      total: jasaTotal ?? 0,
      needsMigration: jasaSupabase ?? 0,
    });

    // Kas RT attachments
    const { count: kasTotal, error: kasCountErr } = await supabase
      .from("kas_rt_attachments")
      .select("id", { count: "exact", head: true });
    const { count: kasOld } = await supabase
      .from("kas_rt_attachments")
      .select("id", { count: "exact", head: true })
      .not("storage_path", "like", "kas-rt/%");
    results.push({
      bucket: "kas-rt-attachments",
      total: kasTotal ?? 0,
      needsMigration: kasOld ?? 0,
    });

    // Related data (org members, customs, articles referencing Supabase)
    const { count: orgMembers } = await supabase
      .from("organisation_members")
      .select("id", { count: "exact", head: true })
      .ilike("profile_picture_url", `%supabase.co/storage/v1/object/public/avatars/%`);
    const { count: orgCustoms } = await supabase
      .from("organisation_member_customs")
      .select("id", { count: "exact", head: true })
      .ilike("custom_profile_picture_url", `%supabase.co/storage/v1/object/public/avatars/%`);
    const { count: articlesFeatured } = await supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .ilike("featured_image_url", `%supabase.co/storage/v1/object/public/%`);
    results.push({
      bucket: "related-data",
      total: (orgMembers ?? 0) + (orgCustoms ?? 0) + (articlesFeatured ?? 0),
      needsMigration: (orgMembers ?? 0) + (orgCustoms ?? 0) + (articlesFeatured ?? 0),
    });

    return NextResponse.json({ buckets: results });
  } catch {
    return NextResponse.json(
      { error: "Gagal memindai status migrasi." },
      { status: 500 },
    );
  }
}

// ── POST /api/admin/migrate-storage ────────────────────────────────────────
// Body: { bucket: "avatars" | "jasa-images" | "kas-rt-attachments" }

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const bucket = body?.bucket as string;

    if (!bucket || !["avatars", "jasa-images", "kas-rt-attachments", "related-data"].includes(bucket)) {
      return NextResponse.json(
        { error: "Bucket tidak valid. Gunakan: avatars, jasa-images, kas-rt-attachments, atau related-data." },
        { status: 400 },
      );
    }

    let result: MigrationResult;

    if (bucket === "avatars") {
      result = await migrateAvatars(supabase);
    } else if (bucket === "jasa-images") {
      result = await migrateJasaImages(supabase);
    } else if (bucket === "kas-rt-attachments") {
      result = await migrateKasRtAttachments(supabase);
    } else {
      result = await migrateRelatedData(supabase);
    }

    return NextResponse.json({ result });
  } catch {
    return NextResponse.json(
      { error: "Gagal menjalankan migrasi." },
      { status: 500 },
    );
  }
}

// ── Migrate Avatars ────────────────────────────────────────────────────────

async function migrateAvatars(supabase: ReturnType<typeof createServerClient>): Promise<MigrationResult> {
  const result: MigrationResult = {
    bucket: "avatars",
    completed: 0,
    skipped: 0,
    failed: 0,
    items: [],
  };

  const { data: users, error } = await supabase
    .from("users")
    .select("id, avatar_path")
    .not("avatar_path", "is", null);

  if (error || !users) {
    result.failed = 1;
    result.items.push({ id: "query", status: "error", detail: error?.message });
    return result;
  }

  for (const user of users) {
    const objectKey = user.avatar_path;
    const supabaseUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${objectKey}`;

    const buffer = await fetchFromSupabase(supabaseUrl);
    if (!buffer) {
      result.skipped++;
      result.items.push({ id: user.id, status: "skipped", detail: "File not found in Supabase" });
      continue;
    }

    try {
      await serverUpload(new Uint8Array(buffer), objectKey, "application/octet-stream");
      result.completed++;
      result.items.push({ id: user.id, status: "ok" });
    } catch (err: any) {
      result.failed++;
      result.items.push({ id: user.id, status: "error", detail: err?.message });
    }
  }

  return result;
}

// ── Migrate Jasa Images ────────────────────────────────────────────────────

async function migrateJasaImages(supabase: ReturnType<typeof createServerClient>): Promise<MigrationResult> {
  const result: MigrationResult = {
    bucket: "jasa-images",
    completed: 0,
    skipped: 0,
    failed: 0,
    items: [],
  };

  const { data: media, error } = await supabase
    .from("jasa_service_media")
    .select("id, url")
    .ilike("url", `%supabase.co%`);

  if (error || !media) {
    result.failed = 1;
    result.items.push({ id: "query", status: "error", detail: error?.message });
    return result;
  }

  for (const item of media) {
    const path = extractPathFromSupabaseUrl(item.url, "jasa-images");
    if (!path) {
      result.skipped++;
      result.items.push({ id: item.id, status: "skipped", detail: "Could not extract path from URL" });
      continue;
    }

    const objectKey = `jasa-images/${path}`;
    const buffer = await fetchFromSupabase(item.url);
    if (!buffer) {
      result.skipped++;
      result.items.push({ id: item.id, status: "skipped", detail: "File not found in Supabase" });
      continue;
    }

    try {
      await serverUpload(new Uint8Array(buffer), objectKey, "application/octet-stream");
      const r2Url = getR2PublicUrl(objectKey);

      const { error: updateError } = await supabase
        .from("jasa_service_media")
        .update({ url: r2Url })
        .eq("id", item.id);

      if (updateError) {
        result.failed++;
        result.items.push({ id: item.id, status: "error", detail: `Uploaded but DB update failed: ${updateError.message}` });
        continue;
      }

      result.completed++;
      result.items.push({ id: item.id, status: "ok" });
    } catch (err: any) {
      result.failed++;
      result.items.push({ id: item.id, status: "error", detail: err?.message });
    }
  }

  return result;
}

// ── Migrate Kas RT Attachments ─────────────────────────────────────────────

async function migrateKasRtAttachments(supabase: ReturnType<typeof createServerClient>): Promise<MigrationResult> {
  const result: MigrationResult = {
    bucket: "kas-rt-attachments",
    completed: 0,
    skipped: 0,
    failed: 0,
    items: [],
  };

  const { data: attachments, error } = await supabase
    .from("kas_rt_attachments")
    .select("id, storage_path")
    .not("storage_path", "like", "kas-rt/%");

  if (error || !attachments) {
    result.failed = 1;
    result.items.push({ id: "query", status: "error", detail: error?.message });
    return result;
  }

  for (const att of attachments) {
    const { data: blob, error: downloadError } = await supabase.storage
      .from("kas-rt-attachments")
      .download(att.storage_path);

    if (downloadError || !blob) {
      result.skipped++;
      result.items.push({ id: att.id, status: "skipped", detail: `Download failed: ${downloadError?.message ?? "Not found"}` });
      continue;
    }

    const newObjectKey = `kas-rt/${att.storage_path}`;

    try {
      const buffer = await blob.arrayBuffer();
      await serverUpload(new Uint8Array(buffer), newObjectKey, blob.type || "application/octet-stream");

      const { error: updateError } = await supabase
        .from("kas_rt_attachments")
        .update({ storage_path: newObjectKey })
        .eq("id", att.id);

      if (updateError) {
        result.failed++;
        result.items.push({ id: att.id, status: "error", detail: `Uploaded but DB update failed: ${updateError.message}` });
        continue;
      }

      result.completed++;
      result.items.push({ id: att.id, status: "ok" });
    } catch (err: any) {
      result.failed++;
      result.items.push({ id: att.id, status: "error", detail: err?.message });
    }
  }

  return result;
}

// ── Migrate Related Data ───────────────────────────────────────────────────
// Updates DB records that reference Supabase Storage URLs for avatars and
// other media. The actual files should already be in R2 (migrated via the
// "avatars" bucket migration). This only updates URL references in the DB.

async function migrateRelatedData(supabase: ReturnType<typeof createServerClient>): Promise<MigrationResult> {
  const result: MigrationResult = {
    bucket: "related-data",
    completed: 0,
    skipped: 0,
    failed: 0,
    items: [],
  };

  // ── 1. Organisation members ──────────────────────────────────────────────
  const { data: orgMembers, error: orgErr } = await supabase
    .from("organisation_members")
    .select("id, profile_picture_url")
    .ilike("profile_picture_url", `%supabase.co/storage/v1/object/public/avatars/%`);

  if (orgErr) {
    result.items.push({ id: "org-members-query", status: "error", detail: orgErr.message });
  } else if (orgMembers) {
    for (const member of orgMembers) {
      const newUrl = replaceSupabaseWithR2(member.profile_picture_url!);
      if (!newUrl) {
        result.skipped++;
        result.items.push({ id: member.id, status: "skipped", detail: "Could not extract path" });
        continue;
      }
      const { error: updateErr } = await supabase
        .from("organisation_members")
        .update({ profile_picture_url: newUrl })
        .eq("id", member.id);
      if (updateErr) {
        result.failed++;
        result.items.push({ id: member.id, status: "error", detail: updateErr.message });
      } else {
        result.completed++;
        result.items.push({ id: member.id, status: "ok" });
      }
    }
  }

  // ── 2. Organisation member customs ───────────────────────────────────────
  const { data: orgCustoms, error: custErr } = await supabase
    .from("organisation_member_customs")
    .select("organisation_member_id, custom_profile_picture_url")
    .ilike("custom_profile_picture_url", `%supabase.co/storage/v1/object/public/avatars/%`);

  if (custErr) {
    result.items.push({ id: "org-customs-query", status: "error", detail: custErr.message });
  } else if (orgCustoms) {
    for (const cust of orgCustoms) {
      const newUrl = replaceSupabaseWithR2(cust.custom_profile_picture_url!);
      if (!newUrl) {
        result.skipped++;
        result.items.push({ id: cust.organisation_member_id, status: "skipped", detail: "Could not extract path" });
        continue;
      }
      const { error: updateErr } = await supabase
        .from("organisation_member_customs")
        .update({ custom_profile_picture_url: newUrl })
        .eq("organisation_member_id", cust.organisation_member_id);
      if (updateErr) {
        result.failed++;
        result.items.push({ id: cust.organisation_member_id, status: "error", detail: updateErr.message });
      } else {
        result.completed++;
        result.items.push({ id: cust.organisation_member_id, status: "ok" });
      }
    }
  }

  // ── 3. Articles featured image ───────────────────────────────────────────
  const { data: articles, error: artErr } = await supabase
    .from("articles")
    .select("id, featured_image_url")
    .ilike("featured_image_url", `%supabase.co/storage/v1/object/public/%`);

  if (artErr) {
    result.items.push({ id: "articles-query", status: "error", detail: artErr.message });
  } else if (articles) {
    for (const article of articles) {
      const newUrl = replaceSupabaseWithR2(article.featured_image_url!);
      if (!newUrl) {
        result.skipped++;
        result.items.push({ id: article.id, status: "skipped", detail: "Could not extract path" });
        continue;
      }
      const { error: updateErr } = await supabase
        .from("articles")
        .update({ featured_image_url: newUrl })
        .eq("id", article.id);
      if (updateErr) {
        result.failed++;
        result.items.push({ id: article.id, status: "error", detail: updateErr.message });
      } else {
        result.completed++;
        result.items.push({ id: article.id, status: "ok" });
      }
    }
  }

  return result;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractPathFromSupabaseUrl(url: string, bucket: string): string | null {
  try {
    const parts = url.split(`/${bucket}/`);
    return parts[1] || null;
  } catch {
    return null;
  }
}

function replaceSupabaseWithR2(url: string): string | null {
  try {
    const marker = "/storage/v1/object/public/";
    const idx = url.indexOf(marker);
    if (idx === -1 || !R2_PUBLIC_BASE_URL) return null;
    const path = url.slice(idx + marker.length);
    return `${R2_PUBLIC_BASE_URL}/${path}`;
  } catch {
    return null;
  }
}
