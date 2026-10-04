#!/usr/bin/env node
/**
 * Apply the house_payment_overrides migration to the live DB via the
 * Supavisor pooler (the direct host is IPv6-only and unreachable here).
 *
 * Idempotent: the SQL uses IF NOT EXISTS / DROP ... IF EXISTS throughout.
 * Reports a readback of the created objects so the result is verifiable.
 */
import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env");
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
  if (!m) throw new Error("Cannot parse connection string");
  return { user: safeDecode(m[1]), password: m[2] ? safeDecode(m[2]) : "", host: m[3], port: m[4] ? parseInt(m[4]) : 5432, database: m[5] || "postgres" };
}

loadEnv();
const c = parseCs(process.env.TARGET_CONNECTION_STRING);
const ref = c.host.match(/^db\.([^.]+)\.supabase\.co$/)?.[1];

// Known-good route discovered by scripts/probe-pooler-overrides.mjs
const HOST = process.env.GW_POOLER_HOST || "aws-1-ap-northeast-1.pooler.supabase.com";

const sql = readFileSync(
  resolve(__dirname, "..", "supabase", "migrations", "20270102000000_add_house_payment_overrides.sql"),
  "utf-8",
);

const pool = new pg.Pool({
  host: HOST, port: 5432, database: c.database, user: `${c.user}.${ref}`,
  password: c.password, max: 1, connectionTimeoutMillis: 15000,
  ssl: { rejectUnauthorized: false },
});

try {
  const client = await pool.connect();
  console.log(`connected via ${HOST}`);
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("MIGRATION APPLIED");

    const cols = await client.query(
      "select column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name='house_payment_overrides' order by ordinal_position",
    );
    console.log("\ncolumns:");
    for (const r of cols.rows) console.log(`  ${r.column_name} ${r.data_type} ${r.is_nullable === "YES" ? "NULL" : "NOT NULL"}`);

    const idx = await client.query(
      "select indexname from pg_indexes where schemaname='public' and tablename='house_payment_overrides' order by 1",
    );
    console.log("\nindexes:", idx.rows.map((r) => r.indexname).join(", "));

    const cons = await client.query(
      "select conname from pg_constraint where conrelid='public.house_payment_overrides'::regclass order by 1",
    );
    console.log("constraints:", cons.rows.map((r) => r.conname).join(", "));

    const rls = await client.query(
      "select relrowsecurity from pg_class where relname='house_payment_overrides'",
    );
    console.log("rls enabled:", rls.rows[0].relrowsecurity);

    const cnt = await client.query("select count(*)::int n from house_payment_overrides");
    console.log("row count:", cnt.rows[0].n);
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.log("MIGRATION FAILED:", e.message);
    process.exitCode = 1;
  } finally {
    client.release();
  }
} catch (e) {
  console.log("CONNECT FAILED:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
