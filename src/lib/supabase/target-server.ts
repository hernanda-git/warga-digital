import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";

function getTargetUrl(): string {
  const url =
    process.env.TARGET_PUBLIC_SUPABASE_URL || process.env.TARGET_SUPABASE_URL;
  if (!url) throw new Error("TARGET_PUBLIC_SUPABASE_URL is required");
  return url;
}

function getTargetServiceKey(): string {
  const key =
    process.env.TARGET_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("TARGET_SUPABASE_SERVICE_ROLE_KEY is required");
  if (key.startsWith("sb_publishable_") || key.startsWith("sb_anon_") || !key.startsWith("eyJ")) {
    throw new Error(
      "TARGET_SUPABASE_SERVICE_ROLE_KEY must be the service_role secret (JWT starting with eyJ), not the anon key.",
    );
  }
  return key;
}

function getTargetConnectionString(): string {
  const cs = process.env.TARGET_CONNECTION_STRING;
  if (cs) return cs;
  const pw = process.env.TARGET_SUPABASE_DB_PASSWORD;
  if (pw) {
    const ref = getTargetProjectRef();
    return `postgresql://postgres:${encodeURIComponent(pw)}@db.${ref}.supabase.co:5432/postgres`;
  }
  throw new Error(
    "TARGET_CONNECTION_STRING (or TARGET_SUPABASE_DB_PASSWORD) is required",
  );
}

export function getTargetProjectRef(): string {
  const url = getTargetUrl();
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split(".");
    if (parts.length >= 2 && parts[0] !== "localhost") return parts[0];
    throw new Error("Could not extract project ref from URL");
  } catch {
    throw new Error("Invalid Supabase URL format. Expected: https://<ref>.supabase.co");
  }
}

export function createTargetServerClient() {
  return createClient(getTargetUrl(), getTargetServiceKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let poolInstance: Pool | null = null;

export function getTargetDbPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: getTargetConnectionString(),
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });
  }
  return poolInstance;
}

export async function closeTargetDbPool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}
