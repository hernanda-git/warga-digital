#!/usr/bin/env tsx

/**
 * Security Verification Script for R2 + Supabase CMS Image Integration
 *
 * This script verifies that all security hardening measures are in place
 * before production deployment.
 *
 * Run with: npx tsx scripts/verify-r2-security.ts
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

interface SecurityCheck {
  name: string;
  description: string;
  check: () => { passed: boolean; message: string };
  severity: "critical" | "high" | "medium" | "low";
}

const checks: SecurityCheck[] = [
  {
    name: "R2 Secrets Not Exposed to Client",
    description: "Verify R2 secrets do not have NEXT_PUBLIC_ prefix",
    severity: "critical",
    check: () => {
      try {
        const result = execSync(
          'grep -r "NEXT_PUBLIC_R2" src/ --include="*.ts" --include="*.tsx" || true',
          {
            encoding: "utf-8",
            cwd: process.cwd(),
          },
        );

        if (result.trim()) {
          return {
            passed: false,
            message: `Found R2 secrets with NEXT_PUBLIC_ prefix:\n${result}`,
          };
        }

        return { passed: true, message: "No R2 secrets exposed to client" };
      } catch {
        return {
          passed: false,
          message: "Failed to check for exposed secrets",
        };
      }
    },
  },

  {
    name: "No Secret Logging",
    description: "Verify no console.log statements expose R2 credentials",
    severity: "high",
    check: () => {
      try {
        const result = execSync(
          'grep -r "console.log.*R2" src/ --include="*.ts" --include="*.tsx" || true',
          {
            encoding: "utf-8",
            cwd: process.cwd(),
          },
        );

        if (result.trim()) {
          return {
            passed: false,
            message: `Found console.log statements with R2:\n${result}`,
          };
        }

        return { passed: true, message: "No secret logging found" };
      } catch {
        return { passed: false, message: "Failed to check for secret logging" };
      }
    },
  },

  {
    name: "Upload Endpoint Has Auth Check",
    description: "Verify upload URL endpoint requires authentication",
    severity: "critical",
    check: () => {
      const filePath = join(
        process.cwd(),
        "src/app/api/cms/articles/upload-url/route.ts",
      );

      if (!existsSync(filePath)) {
        return { passed: false, message: "Upload endpoint file not found" };
      }

      const content = readFileSync(filePath, "utf-8");

      if (
        !content.includes("getSessionFromCookie") &&
        !content.includes("auth")
      ) {
        return {
          passed: false,
          message: "Upload endpoint missing authentication check",
        };
      }

      return { passed: true, message: "Upload endpoint has authentication" };
    },
  },

  {
    name: "Upload Endpoint Has Rate Limiting",
    description: "Verify upload URL endpoint has rate limiting",
    severity: "high",
    check: () => {
      const filePath = join(
        process.cwd(),
        "src/app/api/cms/articles/upload-url/route.ts",
      );

      if (!existsSync(filePath)) {
        return { passed: false, message: "Upload endpoint file not found" };
      }

      const content = readFileSync(filePath, "utf-8");

      if (!content.includes("rateLimit") && !content.includes("rate-limit")) {
        return {
          passed: false,
          message: "Upload endpoint missing rate limiting",
        };
      }

      return { passed: true, message: "Upload endpoint has rate limiting" };
    },
  },

  {
    name: "File Type Validation",
    description: "Verify file type allowlist is enforced",
    severity: "critical",
    check: () => {
      const filePath = join(process.cwd(), "src/lib/r2.ts");

      if (!existsSync(filePath)) {
        return { passed: false, message: "R2 utility file not found" };
      }

      const content = readFileSync(filePath, "utf-8");

      if (!content.includes("ALLOWED_IMAGE_TYPES")) {
        return { passed: false, message: "File type allowlist not defined" };
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      const hasAllTypes = allowedTypes.every((type) => content.includes(type));

      if (!hasAllTypes) {
        return { passed: false, message: "File type allowlist incomplete" };
      }

      return { passed: true, message: "File type validation in place" };
    },
  },

  {
    name: "File Size Validation",
    description: "Verify max file size is enforced",
    severity: "high",
    check: () => {
      const filePath = join(process.cwd(), "src/lib/r2.ts");

      if (!existsSync(filePath)) {
        return { passed: false, message: "R2 utility file not found" };
      }

      const content = readFileSync(filePath, "utf-8");

      if (!content.includes("MAX_FILE_SIZE")) {
        return { passed: false, message: "Max file size not defined" };
      }

      return { passed: true, message: "File size validation in place" };
    },
  },

  {
    name: "Object Key Generation",
    description: "Verify object keys are generated server-side with UUID",
    severity: "high",
    check: () => {
      const filePath = join(process.cwd(), "src/lib/r2.ts");

      if (!existsSync(filePath)) {
        return { passed: false, message: "R2 utility file not found" };
      }

      const content = readFileSync(filePath, "utf-8");

      if (!content.includes("generateObjectKey")) {
        return {
          passed: false,
          message: "Object key generation function not found",
        };
      }

      if (
        !content.includes("crypto.randomUUID()") &&
        !content.includes("uuid")
      ) {
        return { passed: false, message: "Object key generation missing UUID" };
      }

      if (!content.includes("articles/")) {
        return {
          passed: false,
          message: "Object key pattern does not include articles/ prefix",
        };
      }

      return { passed: true, message: "Object key generation is secure" };
    },
  },

  {
    name: "Content Security Policy",
    description: "Verify CSP includes R2 domain",
    severity: "medium",
    check: () => {
      const filePath = join(process.cwd(), "src/middleware.ts");

      if (!existsSync(filePath)) {
        return { passed: false, message: "Middleware file not found" };
      }

      const content = readFileSync(filePath, "utf-8");

      if (!content.includes("Content-Security-Policy")) {
        return { passed: false, message: "CSP not configured" };
      }

      if (!content.includes("img-src")) {
        return { passed: false, message: "CSP missing img-src directive" };
      }

      if (!content.includes("r2.cloudflarestorage.com")) {
        return { passed: false, message: "CSP does not include R2 domain" };
      }

      return { passed: true, message: "CSP configured with R2 domain" };
    },
  },

  {
    name: "Next.js Image Remote Patterns",
    description: "Verify next.config.ts includes R2 domain",
    severity: "high",
    check: () => {
      const filePath = join(process.cwd(), "next.config.ts");

      if (!existsSync(filePath)) {
        return { passed: false, message: "next.config.ts not found" };
      }

      const content = readFileSync(filePath, "utf-8");

      if (!content.includes("remotePatterns")) {
        return { passed: false, message: "remotePatterns not configured" };
      }

      if (!content.includes("r2.cloudflarestorage.com")) {
        return {
          passed: false,
          message: "remotePatterns does not include R2 domain",
        };
      }

      return { passed: true, message: "Next.js image optimization configured" };
    },
  },

  {
    name: "Environment Variables File",
    description: "Verify .env.development is gitignored",
    severity: "critical",
    check: () => {
      const gitignorePath = join(process.cwd(), ".gitignore");

      if (!existsSync(gitignorePath)) {
        return { passed: false, message: ".gitignore not found" };
      }

      const content = readFileSync(gitignorePath, "utf-8");

      if (!content.includes(".env.development") && !content.includes(".env*")) {
        return { passed: false, message: ".env.development not in .gitignore" };
      }

      return { passed: true, message: "Environment files are gitignored" };
    },
  },

  {
    name: "Image Validation Utility",
    description: "Verify comprehensive image validation is implemented",
    severity: "high",
    check: () => {
      const filePath = join(
        process.cwd(),
        "src/lib/validation/image-validation.ts",
      );

      if (!existsSync(filePath)) {
        return { passed: false, message: "Image validation utility not found" };
      }

      const content = readFileSync(filePath, "utf-8");

      if (!content.includes("validateImageFile")) {
        return {
          passed: false,
          message: "Image validation function not found",
        };
      }

      if (
        !content.includes("magic bytes") &&
        !content.includes("MAGIC_BYTES")
      ) {
        return {
          passed: false,
          message: "Magic bytes validation not implemented",
        };
      }

      return {
        passed: true,
        message: "Comprehensive image validation in place",
      };
    },
  },

  {
    name: "Audit Logging",
    description: "Verify audit logs table exists for tracking",
    severity: "medium",
    check: () => {
      const migrationFiles = [
        "20260501000002_create_audit_logs.sql",
        "create_audit_logs.sql",
      ];

      const migrationsDir = join(process.cwd(), "supabase/migrations");

      if (!existsSync(migrationsDir)) {
        return { passed: false, message: "Migrations directory not found" };
      }

      const hasAuditLogMigration = migrationFiles.some((file) =>
        existsSync(join(migrationsDir, file)),
      );

      if (!hasAuditLogMigration) {
        return { passed: false, message: "Audit logs migration not found" };
      }

      return { passed: true, message: "Audit logging is configured" };
    },
  },

  {
    name: "Error Handling",
    description: "Verify API routes have proper error handling",
    severity: "medium",
    check: () => {
      const filePath = join(
        process.cwd(),
        "src/app/api/cms/articles/upload-url/route.ts",
      );

      if (!existsSync(filePath)) {
        return { passed: false, message: "Upload endpoint file not found" };
      }

      const content = readFileSync(filePath, "utf-8");

      if (!content.includes("try") || !content.includes("catch")) {
        return { passed: false, message: "Error handling not implemented" };
      }

      // Check that error responses to clients are generic (no stack traces)
      // Proper pattern: catch block logs server-side, returns generic message to client
      const hasServerSideErrorLogging = content.includes("console.error");
      const hasGenericClientResponse =
        content.includes('{ error: "Internal server error" }') ||
        content.includes('"Internal server error"');

      if (hasServerSideErrorLogging && !hasGenericClientResponse) {
        return {
          passed: false,
          message: "Error handling may expose details to clients",
        };
      }

      return { passed: true, message: "Proper error handling in place" };
    },
  },
];

function runChecks(): void {
  console.log(
    "\n🔒 R2 + Supabase CMS Image Integration - Security Verification\n",
  );
  console.log("=".repeat(70));

  let criticalFailed = 0;
  let highFailed = 0;
  let mediumFailed = 0;
  let lowFailed = 0;

  checks.forEach((check, index) => {
    const result = check.check();
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    const severity = check.severity.toUpperCase().padEnd(8);

    console.log(`\n${index + 1}. ${check.name}`);
    console.log(`   Severity: ${severity}`);
    console.log(`   ${status}: ${result.message}`);
    console.log(`   Description: ${check.description}`);

    if (!result.passed) {
      switch (check.severity) {
        case "critical":
          criticalFailed++;
          break;
        case "high":
          highFailed++;
          break;
        case "medium":
          mediumFailed++;
          break;
        case "low":
          lowFailed++;
          break;
      }
    }
  });

  console.log("\n" + "=".repeat(70));
  console.log("\n📊 Summary:");
  console.log(`   Total Checks: ${checks.length}`);
  console.log(
    `   Passed: ${checks.length - criticalFailed - highFailed - mediumFailed - lowFailed}`,
  );
  console.log(
    `   Failed: ${criticalFailed + highFailed + mediumFailed + lowFailed}`,
  );
  console.log(`   - Critical: ${criticalFailed}`);
  console.log(`   - High: ${highFailed}`);
  console.log(`   - Medium: ${mediumFailed}`);
  console.log(`   - Low: ${lowFailed}`);

  if (criticalFailed > 0 || highFailed > 0) {
    console.log("\n🚨 SECURITY ISSUES FOUND!");
    console.log(
      "   Please address all critical and high severity issues before deployment.",
    );
    process.exit(1);
  } else if (mediumFailed > 0 || lowFailed > 0) {
    console.log("\n⚠️  Some security checks failed.");
    console.log(
      "   Review and address medium/low severity issues before production deployment.",
    );
    process.exit(1);
  } else {
    console.log("\n✅ All security checks passed!");
    console.log(
      "   Your R2 + Supabase CMS image integration is ready for deployment.",
    );
    process.exit(0);
  }
}

// Run the security checks
runChecks();
