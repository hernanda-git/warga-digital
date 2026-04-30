import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { serverUpload, getR2Client, extractObjectKey, getPublicUrl } from "@/lib/r2";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { clearLog, debug, info, warn, logError, LOG_FILE } from "@/lib/debug-logger";

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
    debug(`Fetching from Supabase: ${url}`);
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      debug(`Supabase fetch failed with status ${res.status}: ${url}`);
      return null;
    }
    const buffer = await res.arrayBuffer();
    debug(`Successfully fetched ${buffer.byteLength} bytes from ${url}`);
    return buffer;
  } catch (e: any) {
    debug(`Supabase fetch error: ${e?.message || "Unknown error"}`, { url });
    return null;
  }
}

async function checkFileExistsInR2(objectKey: string): Promise<boolean> {
  try {
    const client = getR2Client();
    const command = new HeadObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: objectKey,
    });
    await client.send(command);
    return true;
  } catch (e: any) {
    if (e?.name === "NotFound" || e?.$metadata?.httpStatusCode === 404) {
      return false;
    }
    debug(`R2 head object error for ${objectKey}: ${e?.message}`);
    return false;
  }
}

// ── GET /api/admin/migrate-storage ─────────────────────────────────────────
// Scan DB and return counts of items needing migration per bucket.

export async function GET() {
  const requestId = crypto.randomUUID();
  clearLog();
  info(`=== SCAN START (Request ID: ${requestId}) ===`);
  debug("Environment check", {
    R2_PUBLIC_BASE_URL: R2_PUBLIC_BASE_URL ? "SET" : "MISSING",
    SUPABASE_URL: SUPABASE_URL ? "SET" : "MISSING",
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME ? "SET" : "MISSING",
  });

  try {
    const session = await getSessionFromCookie();
    if (!session) {
      warn("Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      warn(`Forbidden access attempt by user ${session.userId}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    info(`Admin user ${session.userId} initiated scan`);
    const results: ScanResult[] = [];

    // Avatars - Option B: Check R2 file existence
    info("Scanning avatars...");
    const { data: users, error: avatarQueryError } = await supabase
      .from("users")
      .select("id, avatar_path")
      .not("avatar_path", "is", null);

    if (avatarQueryError) {
      logError("Avatar query error", avatarQueryError);
    } else {
      debug(`Found ${users?.length || 0} users with avatars`);
      let needsMigration = 0;
      for (const user of users || []) {
        const isFullUrl = user.avatar_path?.startsWith("https://");
        const objectKey = isFullUrl ? extractObjectKey(user.avatar_path) : user.avatar_path;
        if (!objectKey) {
          debug(`Cannot determine object key for user ${user.id}, skipping scan`);
          continue;
        }
        const existsInR2 = await checkFileExistsInR2(objectKey);
        if (!existsInR2) {
          needsMigration++;
          debug(`Avatar needs migration: user ${user.id}, path ${user.avatar_path}`);
        } else {
          debug(`Avatar already in R2: user ${user.id}, path ${user.avatar_path}`);
        }
      }
      results.push({
        bucket: "avatars",
        total: users?.length ?? 0,
        needsMigration,
      });
      info(`Avatars scan complete: ${needsMigration}/${users?.length || 0} need migration`);
    }

    // Jasa images
    info("Scanning jasa images...");
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
    info(`Jasa images scan: ${jasaSupabase ?? 0}/${jasaTotal ?? 0} need migration`);

    // Kas RT attachments
    info("Scanning kas-rt attachments...");
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
    info(`Kas RT attachments scan: ${kasOld ?? 0}/${kasTotal ?? 0} need migration`);

    // Related data (org members, customs, articles referencing Supabase)
    info("Scanning related data...");
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
    info(`Related data scan: ${results[3].needsMigration} records need URL updates`);

    info(`=== SCAN COMPLETE (Request ID: ${requestId}) ===`);
    debug("Scan results", results);
    return NextResponse.json({ buckets: results });
  } catch (e: any) {
    logError(`Scan failed: ${e?.message}`, e);
    return NextResponse.json(
      { error: "Gagal memindai status migrasi." },
      { status: 500 },
    );
  }
}

// ── POST /api/admin/migrate-storage ────────────────────────────────────────
// Body: { bucket: "avatars" | "jasa-images" | "kas-rt-attachments" }

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  info(`=== MIGRATION START (Request ID: ${requestId}) ===`);

  try {
    const session = await getSessionFromCookie();
    if (!session) {
      warn("Unauthorized migration attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const adminUser = await requireAdmin(supabase, session.userId);
    if (!adminUser) {
      warn(`Forbidden migration attempt by user ${session.userId}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const bucket = body?.bucket as string;

    info(`Admin user ${session.userId} requested migration for bucket: ${bucket}`);
    debug("Request body", { bucket });

    if (!bucket || !["avatars", "jasa-images", "kas-rt-attachments", "related-data"].includes(bucket)) {
      warn(`Invalid bucket requested: ${bucket}`);
      return NextResponse.json(
        { error: "Bucket tidak valid. Gunakan: avatars, jasa-images, kas-rt-attachments, atau related-data." },
        { status: 400 },
      );
    }

    let result: MigrationResult;

    if (bucket === "avatars") {
      info("Starting avatars migration...");
      result = await migrateAvatars(supabase);
    } else if (bucket === "jasa-images") {
      info("Starting jasa images migration...");
      result = await migrateJasaImages(supabase);
    } else if (bucket === "kas-rt-attachments") {
      info("Starting kas-rt attachments migration...");
      result = await migrateKasRtAttachments(supabase);
    } else {
      info("Starting related data migration...");
      result = await migrateRelatedData(supabase);
    }

    info(`Migration complete: ${result.completed} completed, ${result.skipped} skipped, ${result.failed} failed`);
    debug("Migration result", result);
    info(`=== MIGRATION COMPLETE (Request ID: ${requestId}) ===`);

    return NextResponse.json({ result });
  } catch (e: any) {
    logError(`Migration failed: ${e?.message}`, e);
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
    logError("Avatar query failed", error);
    result.failed = 1;
    result.items.push({ id: "query", status: "error", detail: error?.message });
    return result;
  }

  info(`Found ${users.length} users with avatars to migrate`);
  debug("Users to migrate", users.map(u => ({ id: u.id, path: u.avatar_path })));

  for (const user of users) {
    // avatar_path may be a relative path (pre-migration) or full URL (post-migration)
    const isFullUrl = user.avatar_path?.startsWith("https://");
    const objectKey = isFullUrl ? extractObjectKey(user.avatar_path) : user.avatar_path;
    if (!objectKey) {
      warn(`Could not extract object key for user ${user.id}: ${user.avatar_path}`);
      result.skipped++;
      result.items.push({ id: user.id, status: "skipped", detail: "Invalid avatar_path" });
      continue;
    }

    const supabaseUrl = `${SUPABASE_URL}/storage/v1/object/public/avatars/${objectKey}`;

    debug(`Processing avatar: user ${user.id}`, { objectKey, supabaseUrl });

    // Check if already exists in R2
    const existsInR2 = await checkFileExistsInR2(objectKey);
    if (existsInR2) {
      // If already in R2 but avatar_path is not yet a full URL, update it
      if (!isFullUrl) {
        await supabase
          .from("users")
          .update({ avatar_path: getPublicUrl(objectKey) })
          .eq("id", user.id);
      }
      debug(`Avatar already exists in R2, skipping: user ${user.id}`);
      result.skipped++;
      result.items.push({ id: user.id, status: "skipped", detail: "Already in R2" });
      continue;
    }

    const buffer = await fetchFromSupabase(supabaseUrl);
    if (!buffer) {
      warn(`Avatar file not found in Supabase: user ${user.id}`);
      result.skipped++;
      result.items.push({ id: user.id, status: "skipped", detail: "File not found in Supabase" });
      continue;
    }

    try {
      info(`Uploading avatar to R2: user ${user.id}`);
      await serverUpload(new Uint8Array(buffer), objectKey, "application/octet-stream");
      
      // Update to full URL
      const fullUrl = getPublicUrl(objectKey);
      await supabase
        .from("users")
        .update({ avatar_path: fullUrl })
        .eq("id", user.id);

      // Verify upload
      const verifyExists = await checkFileExistsInR2(objectKey);
      if (verifyExists) {
        debug(`Avatar successfully uploaded and verified in R2: user ${user.id}`);
        result.completed++;
        result.items.push({ id: user.id, status: "ok" });
      } else {
        logError(`Avatar upload verification failed: user ${user.id}`);
        result.failed++;
        result.items.push({ id: user.id, status: "error", detail: "Upload verification failed" });
      }
    } catch (err: any) {
      logError(`Avatar upload failed: user ${user.id}`, err);
      result.failed++;
      result.items.push({ id: user.id, status: "error", detail: err?.message });
    }
  }

  info(`Avatars migration complete: ${result.completed}/${users.length} completed`);
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
    logError("Jasa media query failed", error);
    result.failed = 1;
    result.items.push({ id: "query", status: "error", detail: error?.message });
    return result;
  }

  info(`Found ${media.length} jasa media items to migrate`);
  debug("Jasa media items", media.map(m => ({ id: m.id, url: m.url })));

  for (const item of media) {
    const path = extractPathFromSupabaseUrl(item.url, "jasa-images");
    if (!path) {
      warn(`Could not extract path from URL: ${item.url}`);
      result.skipped++;
      result.items.push({ id: item.id, status: "skipped", detail: "Could not extract path from URL" });
      continue;
    }

    const objectKey = `jasa-images/${path}`;
    debug(`Processing jasa image: ${item.id}`, { objectKey, originalUrl: item.url });

    // Check if already exists in R2
    const existsInR2 = await checkFileExistsInR2(objectKey);
    if (existsInR2) {
      debug(`Jasa image already exists in R2, skipping: ${item.id}`);
      result.skipped++;
      result.items.push({ id: item.id, status: "skipped", detail: "Already in R2" });
      continue;
    }

    const buffer = await fetchFromSupabase(item.url);
    if (!buffer) {
      warn(`Jasa image file not found in Supabase: ${item.id}`);
      result.skipped++;
      result.items.push({ id: item.id, status: "skipped", detail: "File not found in Supabase" });
      continue;
    }

    try {
      info(`Uploading jasa image to R2: ${item.id}`);
      await serverUpload(new Uint8Array(buffer), objectKey, "application/octet-stream");
      
      // Verify upload
      const verifyExists = await checkFileExistsInR2(objectKey);
      if (!verifyExists) {
        logError(`Jasa image upload verification failed: ${item.id}`);
        result.failed++;
        result.items.push({ id: item.id, status: "error", detail: "Upload verification failed" });
        continue;
      }

      const r2Url = getR2PublicUrl(objectKey);
      debug(`Updating database with R2 URL: ${r2Url}`);

      const { error: updateError } = await supabase
        .from("jasa_service_media")
        .update({ url: r2Url })
        .eq("id", item.id);

      if (updateError) {
        logError(`Database update failed for jasa image: ${item.id}`, updateError);
        result.failed++;
        result.items.push({ id: item.id, status: "error", detail: `Uploaded but DB update failed: ${updateError.message}` });
        continue;
      }

      debug(`Jasa image successfully migrated: ${item.id}`);
      result.completed++;
      result.items.push({ id: item.id, status: "ok" });
    } catch (err: any) {
      logError(`Jasa image upload failed: ${item.id}`, err);
      result.failed++;
      result.items.push({ id: item.id, status: "error", detail: err?.message });
    }
  }

  info(`Jasa images migration complete: ${result.completed}/${media.length} completed`);
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
    logError("Kas RT attachments query failed", error);
    result.failed = 1;
    result.items.push({ id: "query", status: "error", detail: error?.message });
    return result;
  }

  info(`Found ${attachments.length} kas-rt attachments to migrate`);
  debug("Attachments to migrate", attachments.map(a => ({ id: a.id, path: a.storage_path })));

  for (const att of attachments) {
    debug(`Processing kas-rt attachment: ${att.id}`, { storage_path: att.storage_path });

    const { data: blob, error: downloadError } = await supabase.storage
      .from("kas-rt-attachments")
      .download(att.storage_path);

    if (downloadError || !blob) {
      warn(`Kas RT attachment download failed: ${att.id}`, downloadError);
      result.skipped++;
      result.items.push({ id: att.id, status: "skipped", detail: `Download failed: ${downloadError?.message ?? "Not found"}` });
      continue;
    }

    const newObjectKey = `kas-rt/${att.storage_path}`;

    // Check if already exists in R2
    const existsInR2 = await checkFileExistsInR2(newObjectKey);
    if (existsInR2) {
      debug(`Kas RT attachment already exists in R2, skipping: ${att.id}`);
      result.skipped++;
      result.items.push({ id: att.id, status: "skipped", detail: "Already in R2" });
      continue;
    }

    try {
      const buffer = await blob.arrayBuffer();
      info(`Uploading kas-rt attachment to R2: ${att.id}`);
      await serverUpload(new Uint8Array(buffer), newObjectKey, blob.type || "application/octet-stream");

      // Verify upload
      const verifyExists = await checkFileExistsInR2(newObjectKey);
      if (!verifyExists) {
        logError(`Kas RT attachment upload verification failed: ${att.id}`);
        result.failed++;
        result.items.push({ id: att.id, status: "error", detail: "Upload verification failed" });
        continue;
      }

      debug(`Updating database with new storage path: ${newObjectKey}`);
      const { error: updateError } = await supabase
        .from("kas_rt_attachments")
        .update({ storage_path: newObjectKey })
        .eq("id", att.id);

      if (updateError) {
        logError(`Database update failed for kas-rt attachment: ${att.id}`, updateError);
        result.failed++;
        result.items.push({ id: att.id, status: "error", detail: `Uploaded but DB update failed: ${updateError.message}` });
        continue;
      }

      debug(`Kas RT attachment successfully migrated: ${att.id}`);
      result.completed++;
      result.items.push({ id: att.id, status: "ok" });
    } catch (err: any) {
      logError(`Kas RT attachment upload failed: ${att.id}`, err);
      result.failed++;
      result.items.push({ id: att.id, status: "error", detail: err?.message });
    }
  }

  info(`Kas RT attachments migration complete: ${result.completed}/${attachments.length} completed`);
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
  info("Migrating organisation members...");
  const { data: orgMembers, error: orgErr } = await supabase
    .from("organisation_members")
    .select("id, profile_picture_url")
    .ilike("profile_picture_url", `%supabase.co/storage/v1/object/public/avatars/%`);

  if (orgErr) {
    logError("Organisation members query failed", orgErr);
    result.items.push({ id: "org-members-query", status: "error", detail: orgErr.message });
  } else if (orgMembers) {
    debug(`Found ${orgMembers.length} organisation members to update`);
    for (const member of orgMembers) {
      const newUrl = replaceSupabaseWithR2(member.profile_picture_url!);
      if (!newUrl) {
        warn(`Could not extract path from organisation member URL: ${member.profile_picture_url}`);
        result.skipped++;
        result.items.push({ id: member.id, status: "skipped", detail: "Could not extract path" });
        continue;
      }
      debug(`Updating organisation member ${member.id}: ${member.profile_picture_url} -> ${newUrl}`);
      const { error: updateErr } = await supabase
        .from("organisation_members")
        .update({ profile_picture_url: newUrl })
        .eq("id", member.id);
      if (updateErr) {
        logError(`Organisation member update failed: ${member.id}`, updateErr);
        result.failed++;
        result.items.push({ id: member.id, status: "error", detail: updateErr.message });
      } else {
        result.completed++;
        result.items.push({ id: member.id, status: "ok" });
      }
    }
  }

  // ── 2. Organisation member customs ───────────────────────────────────────
  info("Migrating organisation member customs...");
  const { data: orgCustoms, error: custErr } = await supabase
    .from("organisation_member_customs")
    .select("organisation_member_id, custom_profile_picture_url")
    .ilike("custom_profile_picture_url", `%supabase.co/storage/v1/object/public/avatars/%`);

  if (custErr) {
    logError("Organisation member customs query failed", custErr);
    result.items.push({ id: "org-customs-query", status: "error", detail: custErr.message });
  } else if (orgCustoms) {
    debug(`Found ${orgCustoms.length} organisation member customs to update`);
    for (const cust of orgCustoms) {
      const newUrl = replaceSupabaseWithR2(cust.custom_profile_picture_url!);
      if (!newUrl) {
        warn(`Could not extract path from custom URL: ${cust.custom_profile_picture_url}`);
        result.skipped++;
        result.items.push({ id: cust.organisation_member_id, status: "skipped", detail: "Could not extract path" });
        continue;
      }
      debug(`Updating organisation member custom ${cust.organisation_member_id}: ${cust.custom_profile_picture_url} -> ${newUrl}`);
      const { error: updateErr } = await supabase
        .from("organisation_member_customs")
        .update({ custom_profile_picture_url: newUrl })
        .eq("organisation_member_id", cust.organisation_member_id);
      if (updateErr) {
        logError(`Organisation member custom update failed: ${cust.organisation_member_id}`, updateErr);
        result.failed++;
        result.items.push({ id: cust.organisation_member_id, status: "error", detail: updateErr.message });
      } else {
        result.completed++;
        result.items.push({ id: cust.organisation_member_id, status: "ok" });
      }
    }
  }

  // ── 3. Articles featured image ───────────────────────────────────────────
  info("Migrating articles featured images...");
  const { data: articles, error: artErr } = await supabase
    .from("articles")
    .select("id, featured_image_url")
    .ilike("featured_image_url", `%supabase.co/storage/v1/object/public/%`);

  if (artErr) {
    logError("Articles query failed", artErr);
    result.items.push({ id: "articles-query", status: "error", detail: artErr.message });
  } else if (articles) {
    debug(`Found ${articles.length} articles to update`);
    for (const article of articles) {
      const newUrl = replaceSupabaseWithR2(article.featured_image_url!);
      if (!newUrl) {
        warn(`Could not extract path from article URL: ${article.featured_image_url}`);
        result.skipped++;
        result.items.push({ id: article.id, status: "skipped", detail: "Could not extract path" });
        continue;
      }
      debug(`Updating article ${article.id}: ${article.featured_image_url} -> ${newUrl}`);
      const { error: updateErr } = await supabase
        .from("articles")
        .update({ featured_image_url: newUrl })
        .eq("id", article.id);
      if (updateErr) {
        logError(`Article update failed: ${article.id}`, updateErr);
        result.failed++;
        result.items.push({ id: article.id, status: "error", detail: updateErr.message });
      } else {
        result.completed++;
        result.items.push({ id: article.id, status: "ok" });
      }
    }
  }

  info(`Related data migration complete: ${result.completed} records updated`);
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
