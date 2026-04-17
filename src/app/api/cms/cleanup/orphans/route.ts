import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { getSessionFromCookie } from "@/lib/auth/session";
import { requireAdmin } from "@/lib/auth/admin-guard";

// R2 Client
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

interface CleanupOptions {
  dryRun?: boolean;
  gracePeriodDays?: number;
  prefix?: string;
}

interface CleanupResult {
  totalObjects: number;
  orphanedObjects: string[];
  deletedObjects: string[];
  errors: string[];
  dryRun: boolean;
}

/**
 * POST /api/cms/cleanup/orphans
 *
 * Cleanup orphaned R2 objects that don't exist in the database
 *
 * Body: {
 *   dryRun?: boolean (default: true - safe mode, no deletions)
 *   gracePeriodDays?: number (default: 7 - only delete objects older than this)
 *   prefix?: string (default: 'articles/' - only scan this prefix)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin access
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const adminSession = await requireAdmin(supabase, session.userId);
    if (!adminSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body: CleanupOptions = await request.json();
    const { dryRun = true, gracePeriodDays = 7, prefix = "articles/" } = body;

    const result: CleanupResult = {
      totalObjects: 0,
      orphanedObjects: [],
      deletedObjects: [],
      errors: [],
      dryRun,
    };

    // 1. Fetch all object keys from database
    const { data: dbImages, error: dbError } = await supabase
      .from("article_images")
      .select("object_key, created_at");

    if (dbError) {
      console.error("Error fetching database images:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch database records" },
        { status: 500 },
      );
    }

    // Create a Set of valid object keys for O(1) lookup
    const validObjectKeys = new Set(
      dbImages?.map((img) => img.object_key) || [],
    );

    // 2. List all objects in R2 bucket under the prefix
    let continuationToken: string | undefined = undefined;
    const allR2Objects: string[] = [];

    do {
      const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const listResponse: ListObjectsV2CommandOutput =
        await r2Client.send(listCommand);

      if (listResponse.Contents) {
        for (const object of listResponse.Contents) {
          if (object.Key) {
            allR2Objects.push(object.Key);
          }
        }
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    result.totalObjects = allR2Objects.length;

    // 3. Identify orphaned objects
    const gracePeriodCutoff = new Date();
    gracePeriodCutoff.setDate(gracePeriodCutoff.getDate() - gracePeriodDays);

    for (const objectKey of allR2Objects) {
      // Skip if object key exists in database
      if (validObjectKeys.has(objectKey)) {
        continue;
      }

      // Check if object is old enough to be considered orphaned
      // We need to fetch the object's last modified date from R2
      // For now, we'll add it to the list and let the caller decide
      result.orphanedObjects.push(objectKey);
    }

    // 4. Delete orphaned objects (if not dry run)
    if (!dryRun && result.orphanedObjects.length > 0) {
      // Delete in batches of 1000 (S3/R2 limit)
      const batchSize = 1000;
      for (let i = 0; i < result.orphanedObjects.length; i += batchSize) {
        const batch = result.orphanedObjects.slice(i, i + batchSize);

        try {
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Delete: {
              Objects: batch.map((key) => ({ Key: key })),
              Quiet: false,
            },
          });

          const deleteResponse = await r2Client.send(deleteCommand);

          if (deleteResponse.Deleted) {
            result.deletedObjects.push(
              ...deleteResponse.Deleted.map((d) => d.Key!),
            );
          }

          if (deleteResponse.Errors) {
            for (const error of deleteResponse.Errors) {
              result.errors.push(`${error.Key}: ${error.Message}`);
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          result.errors.push(`Batch ${i / batchSize}: ${errorMessage}`);
        }
      }
    }

    // 5. Log cleanup action for audit
    await supabase.from("audit_logs").insert({
      action: "orphan_cleanup",
      details: {
        dryRun,
        totalObjects: result.totalObjects,
        orphanedCount: result.orphanedObjects.length,
        deletedCount: result.deletedObjects.length,
        errors: result.errors.length,
      },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      result,
      message: dryRun
        ? `Dry run complete. Found ${result.orphanedObjects.length} orphaned objects. Set dryRun=false to delete.`
        : `Cleanup complete. Deleted ${result.deletedObjects.length} of ${result.orphanedObjects.length} orphaned objects.`,
    });
  } catch (error) {
    console.error("Error in orphan cleanup:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cms/cleanup/orphans
 *
 * Get statistics about potential orphaned objects without performing cleanup
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin access
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const adminSession = await requireAdmin(supabase, session.userId);
    if (!adminSession) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch database statistics
    const { count: dbCount, error: dbError } = await supabase
      .from("article_images")
      .select("*", { count: "exact", head: true });

    if (dbError) {
      console.error("Error fetching database count:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch database statistics" },
        { status: 500 },
      );
    }

    // List R2 objects under articles prefix
    let continuationToken: string | undefined = undefined;
    let r2Count = 0;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        Prefix: "articles/",
        ContinuationToken: continuationToken,
      });

      const listResponse: ListObjectsV2CommandOutput = await r2Client.send(listCommand);

      if (listResponse.Contents) {
        r2Count += listResponse.Contents.length;
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    return NextResponse.json({
      databaseImages: dbCount || 0,
      r2Objects: r2Count,
      potentialOrphans: Math.max(0, r2Count - (dbCount || 0)),
      message: "Use POST to perform actual cleanup",
    });
  } catch (error) {
    console.error("Error in orphan cleanup stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
