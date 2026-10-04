#!/usr/bin/env node
/**
 * Apply a migration .sql file to the live DB via the Supavisor pooler.
 *
 * Usage: node scripts/apply-migration.mjs <file.sql> [--no-tx]
 *
 * The direct Supabase host is IPv6-only and unreachable from this host; the
 * pooler has IPv4. Runs inside a transaction by default so a failure leaves
 * the database untouched.
 */
import pg from "pg";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const arg = process.argv[2];
if (!arg) {
  console.error("usage: node scripts/apply-migration.mjs <file.sql> [--no-tx]");
  process.exit(1);
}
const useTx = !process.argv.includes("--no-tx");

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env");
  if (!existsSync(envPath)) throw new Error(".env not found");
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim(), v = t.slice(i + 1).trim();
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
function safeDecode(s) { try { return decodeURIComponent(s); } catch { return s; } }
function parseCs(cs) {
  const m = cs.match(/^postgres(?:ql)?:\/\/([^:@]+)(?::([^@]*))?@([^:/]+)(?::(\d+))?(?:\/(.*))?$/);
  if (!m) throw new Error("cannot parse connection string");
  return { user: safeDecode(m[1]), password: m[2] ? safeDecode(m[2]) : "", host: m[3], port: m[4] ? parseInt(m[4]) : 5432, database: m[5] || "postgres" };
}

loadEnv();
const c = parseCs(process.env.TARGET_CONNECTION_STRING);
const ref = c.host.match(/^db\.([^.]+)\.supabase\.co$/)?.[1];
const sqlPath = resolve(__dirname, "..", arg);
if (!existsSync(sqlPath)) { console.error("file not found:", sqlPath); process.exit(1); }
const sql = readFileSync(sqlPath, "utf-8");

const pool = new pg.Pool({
  host: process.env.GW_POOLER_HOST || "aws-1-ap-northeast-1.pooler.supabase.com",
  port: 5432, database: c.database, user: `${c.user}.${ref}`, password: c.password,
  max: 1, connectionTimeoutMillis: 15000, ssl: { rejectUnauthorized: false },
});

const client = await pool.connect();
try {
  if (useTx) await client.query("BEGIN");
  await client.query(sql);
  if (useTx) await client.query("COMMIT");
  console.log("APPLIED:", arg);
} catch (e) {
  if (useTx) await client.query("ROLLBACK").catch(() => {});
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
