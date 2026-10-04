#!/usr/bin/env node
/**
 * Verify the four shadow-month markings THROUGH the production API.
 *
 * Asserts, per block, that the credited months and the Lunas flag reflect the
 * override while the money figures are byte-identical to the real transactions.
 *
 * Usage: node scripts/verify-shadow-marks.mjs [base-url]
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { SignJWT } from "jose";
import { createHash, randomBytes } from "crypto";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || process.env.E2E_BASE || "https://www.warga-digital.com";

for (const line of readFileSync(resolve(__dirname, "..", ".env"), "utf-8").split("\n")) {
  const t = line.trim(); if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("="); if (i === -1) continue;
  const k = t.slice(0, i).trim(), v = t.slice(i + 1).trim();
  if (k && v && !process.env[k]) process.env[k] = v;
}
const sd = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const cs = process.env.TARGET_CONNECTION_STRING.match(/^postgres(?:ql)?:\/\/([^:@]+)(?::([^@]*))?@([^:/]+)(?::(\d+))?(?:\/(.*))?$/);
const ref = cs[3].match(/^db\.([^.]+)\.supabase\.co$/)[1];
const pool = new pg.Pool({
  host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 5432,
  database: cs[5] || "postgres", user: `${sd(cs[1])}.${ref}`, password: sd(cs[2]),
  max: 1, connectionTimeoutMillis: 15000, ssl: { rejectUnauthorized: false },
});

const LABELS = ["", "Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  PASS  ${name}${detail ? " — " + detail : ""}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
};

// ── real money snapshot from the DB (ground truth) ─────────────────────────
const T = process.env.DEFAULT_TENANT_ID, C = process.env.DEFAULT_COMMUNITY_ID;
const moneyBefore = (await pool.query(
  `select coalesce(sum(amount),0)::bigint t, count(*)::int n
     from kas_rt_transactions
    where tenant_id=$1 and community_id=$2 and is_shadow=false and deleted_at is null
      and date >= '2026-01-01' and date < '2027-01-01'`, [T, C])).rows[0];

// ── mint a real RT-manager session ────────────────────────────────────────
const mgr = (await pool.query(
  `select u.id from users u
     join tenant_users tu on tu.user_id = u.id
     join tenant_user_roles tur on tur.tenant_user_id = tu.id
    where tur.role_id in (4,8) and tur.revoked_at is null
      and tu.status='ACTIVE' and u.status='ACTIVE' limit 1`)).rows[0];
const token = randomBytes(32).toString("hex");
const sessionId = (await import("uuidv7")).uuidv7();
await pool.query(
  `insert into sessions (id, user_id, token_hash, expires_at, created_at)
   values ($1,$2,$3, now() + interval '1 hour', now())`,
  [sessionId, mgr.id, createHash("sha256").update(token).digest("hex")]);
const jwt = await new SignJWT({ sessionId, userId: mgr.id, appr: 1 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("365d")
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));
const cookie = `wd_session=${jwt}`;

async function api(path) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}_t=${Date.now()}`, {
    cache: "no-store",
    headers: { Cookie: cookie, "Cache-Control": "no-cache", Pragma: "no-cache" },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

console.log(`\n=== verifying ${BASE} ===`);
const hs = await api("/api/kas-rt/house-statuses?year=2026");
check("house-statuses reachable", hs.status === 200, `HTTP ${hs.status}`);
if (hs.status !== 200) {
  console.log(JSON.stringify(hs.body)?.slice(0, 400));
  await pool.query("delete from sessions where id=$1", [sessionId]);
  await pool.end();
  process.exit(1);
}
const rows = Array.isArray(hs.body) ? hs.body : (hs.body?.data ?? []);
const byBlok = new Map(rows.map((r) => [String(r.blokRumah).toUpperCase(), r]));

// ── expectations ──────────────────────────────────────────────────────────
// The credited months are OUR override, so they are asserted absolutely.
// Money is NOT hardcoded: real operators record payments while this runs, so
// the expected amount is read from the DB at run time. The invariant that
// matters is that the override adds no money — asserted separately below.
const EXPECT = {
  O4:  { credited: [11, 12] },
  O23: { credited: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  L3:  { credited: [1, 2, 3, 4, 5] },
  K10: { credited: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
};

const dbMoney = new Map(
  (await pool.query(
    `select reference, coalesce(sum(amount),0)::bigint total
       from kas_rt_transactions
      where tenant_id=$1 and community_id=$2 and is_shadow=false
        and deleted_at is null and reference = any($3)
        and date >= '2026-01-01' and date < '2027-01-01'
      group by reference`, [T, C, Object.keys(EXPECT)])).rows
    .map((r) => [r.reference, Number(r.total)]),
);

console.log("\n=== per-block ===");
for (const [blok, exp] of Object.entries(EXPECT)) {
  const row = byBlok.get(blok);
  if (!row) { check(`${blok} present`, false, "not in API payload"); continue; }
  const months = (row.overrideMonthNumbers ?? []).slice().sort((a, b) => a - b);
  const monthStr = months.map((m) => LABELS[m]).join("+");
  const expectedMoney = dbMoney.get(blok) ?? 0;
  // Lunas = money months (sequential from Jan) + credited months cover 12.
  const fromMoney =
    Math.floor(expectedMoney / 120000) + (expectedMoney % 120000 > 0 ? 1 : 0);
  const covered = new Set([
    ...Array.from({ length: fromMoney }, (_, i) => i + 1),
    ...months,
  ]).size;
  console.log(`\n${blok}: money=${Number(row.total2026).toLocaleString("id-ID")} (DB ${expectedMoney.toLocaleString("id-ID")}) credited=[${monthStr}] covered=${covered}/12 lunas=${row.isSettled}`);
  check(`${blok} money matches real transactions`, Number(row.total2026) === expectedMoney,
        `${Number(row.total2026)} vs ${expectedMoney}`);
  check(`${blok} credited months`, JSON.stringify(months) === JSON.stringify(exp.credited),
        `${monthStr}`);
  check(`${blok} lunas flag`, Boolean(row.isSettled) === (covered >= 12),
        `${row.isSettled} (covered ${covered}/12)`);
  check(`${blok} has overrideId`, Boolean(row.overrideId), `${row.overrideId ?? "none"}`);
}

// ── money invariant across the whole year ─────────────────────────────────
console.log("\n=== money invariant ===");
const moneyAfter = (await pool.query(
  `select coalesce(sum(amount),0)::bigint t, count(*)::int n
     from kas_rt_transactions
    where tenant_id=$1 and community_id=$2 and is_shadow=false and deleted_at is null
      and date >= '2026-01-01' and date < '2027-01-01'`, [T, C])).rows[0];
check("real transaction total unchanged",
      String(moneyAfter.t) === String(moneyBefore.t),
      `Rp${Number(moneyAfter.t).toLocaleString("id-ID")} (was Rp${Number(moneyBefore.t).toLocaleString("id-ID")})`);
check("real transaction count unchanged",
      moneyAfter.n === moneyBefore.n, `${moneyAfter.n} (was ${moneyBefore.n})`);

const sum = await api("/api/kas-rt/summary?year=2026&month=10");
if (sum.status === 200) {
  const ipl = sum.body?.iplCollection;
  console.log(`\nsummary iplCollection: paidHouses=${ipl?.paidHouses} totalPaid=${ipl?.totalPaid} overridePaidHouses=${ipl?.overridePaidHouses}`);
  check("summary reachable", true, "HTTP 200");
}

// ── cleanup ───────────────────────────────────────────────────────────────
await pool.query("delete from sessions where id=$1", [sessionId]);
await pool.end();

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);
