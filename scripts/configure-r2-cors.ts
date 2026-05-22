/**
 * R2 Bucket CORS Configuration Script
 *
 * Run: npx tsx scripts/configure-r2-cors.ts
 *
 * This script configures CORS on your Cloudflare R2 bucket to allow
 * direct browser uploads from your production and development domains.
 *
 * Prerequisites:
 * - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *   must be set in your .env file or environment
 *
 * Usage:
 *   npx tsx scripts/configure-r2-cors.ts
 *
 * You can override the allowed origins:
 *   npx tsx scripts/configure-r2-cors.ts --origins "https://www.warga-digital.com,https://staging.warga-digital.com,http://localhost:3000"
 */

import {
  S3Client,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { loadEnvConfig } from "@next/env";
import { join } from "path";

async function main() {
  // Load .env file
  const projectDir = join(__dirname, "..");
  loadEnvConfig(projectDir);

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error("❌ Missing required R2 environment variables.");
    console.error(
      "   Ensure R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME are set.",
    );
    process.exit(1);
  }

  // Parse origins from CLI args or use defaults
  const originArg = process.argv.find((a) => a.startsWith("--origins="));
  const allowedOrigins = originArg
    ? originArg
        .replace("--origins=", "")
        .split(",")
        .map((o) => o.trim())
    : [
        "https://www.warga-digital.com",
        "https://oo.warga-digital.com",
        "https://warga-digital.com",
        "http://localhost:3000",
      ];

  console.log(`\n🔧 Configuring CORS for R2 bucket: ${bucketName}\n`);
  console.log("Allowed origins:");
  allowedOrigins.forEach((o) => console.log(`   • ${o}`));
  console.log();

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const corsConfig = {
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: allowedOrigins,
          AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
          AllowedHeaders: [
            "*",
            "x-amz-content-sha256",
            "content-type",
            "x-amz-checksum-crc32",
            "x-amz-checksum-crc32c",
          ],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  };

  try {
    // Check current CORS config
    try {
      const currentConfig = await client.send(
        new GetBucketCorsCommand({ Bucket: bucketName }),
      );
      console.log("📋 Current CORS configuration:");
      console.log(JSON.stringify(currentConfig.CORSRules, null, 2));
      console.log();
    } catch {
      console.log("ℹ️  No existing CORS configuration found.\n");
    }

    // Apply new CORS config
    console.log("⏳ Applying CORS configuration...");
    await client.send(new PutBucketCorsCommand(corsConfig));
    console.log("✅ CORS configuration applied successfully!\n");

    // Verify
    const verifyConfig = await client.send(
      new GetBucketCorsCommand({ Bucket: bucketName }),
    );
    console.log("📋 Verified CORS configuration:");
    console.log(JSON.stringify(verifyConfig.CORSRules, null, 2));
    console.log();
    console.log("🚀 Your R2 bucket is now configured for browser uploads.");
  } catch (error) {
    console.error("❌ Failed to configure CORS:", error);
    process.exit(1);
  }
}

main();
