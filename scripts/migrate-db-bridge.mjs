#!/usr/bin/env node
import pg from "pg";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const RED = "\x1b[31m", GREEN = "\x1b[32m", YELLOW = "\x1b[33m", CYAN = "\x1b[36m", RESET = "\x1b[0m";
function info(m) { console.log(`${CYAN}ℹ ${m}${RESET}`); }
function ok(m) { console.log(`${GREEN}✔ ${m}${RESET}`); }
function warn(m) { console.log(`${YELLOW}⚠ ${m}${RESET}`); }
function err(m) { console.log(`${RED}✖ ${m}${RESET}`); }

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env");
  if (!existsSync(envPath)) { err(".env not found"); process.exit(1); }
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim(), v = t.slice(i + 1).trim();
    if (k && v && !process.env[k]) process.env[k] = v;
  }
  const scs = process.env.SOURCE_CONNECTION_STRING;
  const tcs = process.env.TARGET_CONNECTION_STRING;
  if (!scs) { err("SOURCE_CONNECTION_STRING not set"); process.exit(1); }
  if (!tcs) { err("TARGET_CONNECTION_STRING not set"); process.exit(1); }
  return { scs, tcs };
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}
function parseCs(cs) {
  const m = cs.match(/^postgres(?:ql)?:\/\/([^:@]+)(?::([^@]*))?@([^:/]+)(?::(\d+))?(?:\/(.*))?$/);
  if (!m) throw new Error(`Cannot parse connection string`);
  return { user: safeDecode(m[1]), password: m[2] ? safeDecode(m[2]) : "", host: m[3], port: m[4] ? parseInt(m[4]) : 5432, database: m[5] || "postgres" };
}

function createPool(cs) {
  const c = parseCs(cs);
  return new pg.Pool({
    host: c.host, port: c.port, database: c.database, user: c.user, password: c.password,
    max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 20000, ssl: { rejectUnauthorized: false },
  });
}

// ─── Extract named SQL constants from migrations.ts ──────────────────────
function extractSQLMap() {
  const fp = resolve(__dirname, "..", "src", "config", "migrations.ts");
  const text = readFileSync(fp, "utf-8");
  const map = {};
  const re = /(?:export\s+)?const\s+(\w+)\s*=\s*`([\s\S]*?)`\s*(?:\.\w+(?:\(\))?)?\s*;/g;
  let m;
  while ((m = re.exec(text)) !== null) map[m[1]] = m[2].trim();
  return map;
}

function splitSQL(sql) {
  const cleaned = sql.replace(/^\s*--.*$/gm, "").trim();
  if (!cleaned) return [];
  const stmts = [];
  let cur = "", inStr = false, inDol = false, dolTag = "";
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (!inDol && !inStr) {
      if (ch === "'") { inStr = true; cur += ch; continue; }
      const dm = cleaned.slice(i).match(/^\$(\w*)\$/);
      if (dm) { dolTag = dm[1] ?? ""; inDol = true; cur += dm[0]; i += dm[0].length - 1; continue; }
      if (ch === ";") { const t = cur.trim(); if (t) stmts.push(t); cur = ""; continue; }
    } else if (inStr) {
      if (ch === "'" && cleaned[i + 1] === "'") { cur += "''"; i++; continue; }
      if (ch === "'") { inStr = false; }
    } else if (inDol) {
      const et = `$${dolTag}$`;
      if (cleaned.slice(i, i + et.length) === et) { inDol = false; dolTag = ""; cur += et; i += et.length - 1; continue; }
    }
    cur += ch;
  }
  const t = cur.trim();
  if (t) stmts.push(t);
  return stmts;
}

const PHASE_ORDER = [
  { label: "Extensions", steps: ["PGCYPTO", "PG_CRON"] },
  { label: "Enum Types", steps: ["ENUMS_SQL"] },
  { label: "Core Tables", steps: ["CORE_TABLES_SQL"] },
  { label: "Feature Tables", steps: ["FEATURE_TABLES_SQL"] },
  { label: "Incremental Tables", steps: ["INCREMENTAL_TABLES_SQL"] },
  { label: "Functions & Triggers", steps: ["KAS_RT_SUMMARY_FN", "DELETE_USER_FN", "CLEANUP_FN", "SESSION_CRON", "TRIGGER_FUNCTIONS_SQL"] },
  { label: "Indexes", steps: ["INDEXES_SQL"] },
  { label: "RLS Policies", steps: ["RLS_SQL"] },
  { label: "Seeds", steps: ["SEEDS_SQL"] },
];

// ─── Get columns for a table (excludes generated) ────────────────────────
async function getTableColumns(pool, table) {
  const res = await pool.query(`
    SELECT column_name, is_generated = 'ALWAYS' AS is_generated
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [table]);
  return res.rows.filter(r => !r.is_generated).map(r => r.column_name);
}

// ─── Step 1: Schema ──────────────────────────────────────────────────────
async function runSchema(pool, sqlMap) {
  info("Running schema migration on target...");
  let total = 0, okCount = 0, failCount = 0;
  const errors = [];
  for (const phase of PHASE_ORDER) {
    info(`  ${phase.label}`);
    for (const name of phase.steps) {
      const sql = sqlMap[name];
      if (!sql) { warn(`    ${name}: NOT FOUND`); continue; }
      for (const stmt of splitSQL(sql)) {
        total++;
        try {
          await pool.query(stmt);
          okCount++;
        } catch (e) {
          const msg = e.message || "";
          if (msg.includes("already exists") || msg.includes("duplicate key") || msg.includes("could not create extension") || msg.includes("already registered")) {
            okCount++;
          } else {
            failCount++;
            errors.push({ stmt: stmt.slice(0, 80), msg: msg.slice(0, 120) });
          }
        }
      }
    }
  }
  if (failCount === 0) ok(`Schema: ${okCount}/${total} OK`);
  else {
    warn(`Schema: ${okCount} OK, ${failCount} failed (${total} total)`);
    for (const e of errors) warn(`  ${e.stmt}... → ${e.msg}`);
  }
  return failCount === 0;
}

// ─── Step 2: Data copy with column matching ──────────────────────────────
async function copyData(srcPool, tgtPool) {
  info("Copying data from source to target (read-only on source)...");

  // Get actual tables in source (public schema only)
  const tablesRes = await srcPool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  const srcTables = new Set(tablesRes.rows.map(r => r.table_name));

  // FK-safe order
  const tableOrder = [
    "users", "tenants", "communities", "roles", "houses", "tenant_users",
    "user_houses", "tenant_user_roles", "marketplace_domains", "marketplace_categories",
    "authority_assignments", "verifications", "otp_codes", "sessions", "badges",
    "marketplace_items", "marketplace_item_media", "marketplace_item_tags",
    "marketplace_transactions", "marketplace_transaction_events",
    "kas_rt_transaction_categories", "kas_rt_transaction_category_details",
    "kas_rt_transactions", "kas_rt_transaction_details", "notifications", "announcements",
    "user_badges", "house_join_requests", "system_preregistered_house_owners",
    "organisation_roles", "organisation_members", "organisation_member_customs",
    "jasa_services", "jasa_sub_services", "jasa_service_media", "jualan_categories",
    "jualan_goods", "jualan_item_media", "articles", "article_images", "audit_logs",
    "password_reset_tokens",
  ];

  const toCopy = tableOrder.filter(t => srcTables.has(t));
  const missing = tableOrder.filter(t => !srcTables.has(t));
  if (missing.length) warn(`Tables not in source: ${missing.join(", ")}`);

  let totalRows = 0;
  const failed = [];

  // Disable FK triggers on target for bulk insert
  info("Disabling FK triggers on target (session_replication_role = replica)...");
  await tgtPool.query("SET session_replication_role = replica");

  for (const table of toCopy) {
    try {
      // Get columns from source, excluding generated cols
      const srcCols = await getTableColumns(srcPool, table);
      if (srcCols.length === 0) { ok(`  ${table}: 0 cols (skipped)`); continue; }

      // Get common columns on target
      const tgtCols = await getTableColumns(tgtPool, table);
      const commonCols = srcCols.filter(c => tgtCols.includes(c));

      if (commonCols.length === 0) { warn(`  ${table}: no common columns`); continue; }

      // Check row count
      const cr = await srcPool.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
      const rowCount = cr.rows[0]?.c ?? 0;
      if (rowCount === 0) { ok(`  ${table}: 0 rows`); continue; }

      // Read data (only common columns)
      const colList = commonCols.map(c => `"${c}"`).join(", ");
      const dr = await srcPool.query(`SELECT ${colList} FROM "${table}"`);
      const rows = dr.rows;

      // Build insert with common cols only
      const params = commonCols.map((_, i) => `$${i + 1}`).join(", ");
      const insertSQL = `INSERT INTO "${table}" (${colList}) VALUES (${params}) ON CONFLICT DO NOTHING`;

      // Batch insert
      const batchSize = 100;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const client = await tgtPool.connect();
        try {
          await client.query("BEGIN");
          for (const row of batch) {
            const values = commonCols.map(c => row[c] ?? null);
            await client.query(insertSQL, values);
            inserted++;
          }
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK").catch(() => {});
          throw e;
        } finally { client.release(); }
      }
      totalRows += inserted;
      ok(`  ${table}: ${inserted}/${rowCount} rows (${commonCols.length} cols)`);
    } catch (e) {
      failed.push(table);
      warn(`  ${table}: FAILED — ${(e.message || "").slice(0, 150)}`);
    }
  }

  // Re-enable FK triggers
  info("Re-enabling FK triggers...");
  await tgtPool.query("SET session_replication_role = DEFAULT");

  if (failed.length === 0) ok(`Data copy complete: ${totalRows} rows`);
  else warn(`Data: ${totalRows} rows, ${failed.length} tables: ${failed.join(", ")}`);
  return failed.length === 0;
}

// ─── Verify ──────────────────────────────────────────────────────────────
async function verify(pool) {
  info("Verifying target...");
  const tr = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );
  const tables = tr.rows.map(r => r.table_name);
  info(`Tables: ${tables.length}`);
  let total = 0;
  for (const t of tables) {
    try {
      const c = await pool.query(`SELECT COUNT(*)::int AS c FROM "${t}"`);
      const cnt = c.rows[0]?.c ?? 0;
      console.log(`  ${t.padEnd(40)} ${cnt}`);
      total += cnt;
    } catch { console.log(`  ${t.padEnd(40)} ERR`); }
  }
  ok(`Total rows: ${total}`);
}

// ─── Main ────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  WARGA DIGITAL — Database Migration");
  console.log("  Source → Target (read-only on source)");
  console.log("=".repeat(60) + "\n");

  const { scs, tcs } = loadEnv();
  const src = parseCs(scs), tgt = parseCs(tcs);
  info(`Source: ${src.host}:${src.port}/${src.database}`);
  info(`Target: ${tgt.host}:${tgt.port}/${tgt.database}`);

  const sqlMap = extractSQLMap();
  info(`Found ${Object.keys(sqlMap).length} SQL constants in migrations.ts`);

  const srcPool = createPool(scs);
  const tgtPool = createPool(tcs);

  try {
    // Test connections
    info("Testing connections...");
    const sv = await srcPool.query("SELECT version() as v");
    ok(`Source: ${sv.rows[0]?.v?.slice(0, 60)}`);
    const tv = await tgtPool.query("SELECT version() as v");
    ok(`Target: ${tv.rows[0]?.v?.slice(0, 60)}`);

    // Phase 1: Schema
    console.log("\n" + "-".repeat(40));
    info("PHASE 1: Schema Migration");
    await runSchema(tgtPool, sqlMap);

    // Phase 2: Data
    console.log("\n" + "-".repeat(40));
    info("PHASE 2: Data Migration");
    const dataOk = await copyData(srcPool, tgtPool);

    // Phase 3: Verify
    console.log("\n" + "-".repeat(40));
    info("PHASE 3: Verification");
    await verify(tgtPool);

    console.log("\n" + "=".repeat(60));
    if (dataOk) ok("Migration completed successfully!");
    else warn("Migration completed with some errors (see above).");
    ok("Source database was NOT modified.");
    console.log("=".repeat(60) + "\n");
  } finally {
    await srcPool.end().catch(() => {});
    await tgtPool.end().catch(() => {});
  }
}

main().catch(e => { err(`Fatal: ${e.message}`); process.exit(1); });
