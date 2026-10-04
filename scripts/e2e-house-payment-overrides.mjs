#!/usr/bin/env node
/**
 * E2E for house payment overrides against a locally running build.
 *
 * Proves the whole point of the feature: marking a house "lunas" raises the
 * Lunas count and fills months, while EVERY money figure stays identical.
 *
 * Steps:
 *   1. find an active kas-RT manager (role 4 or 8) and mint a real session row + JWT
 *   2. snapshot money + paid counts before
 *   3. POST an override for a house that has NOT paid the full year
 *   4. re-read: Lunas up, overrideMonths up, total2026 UNCHANGED, summary income unchanged
 *   5. revoke it and confirm everything returns to the baseline
 *   6. clean up the temporary session row
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { SignJWT } from "jose";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.E2E_BASE || "http://127.0.0.1:3137";

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
  if (!m) throw new Error("bad connection string");
  return { user: safeDecode(m[1]), password: m[2] ? safeDecode(m[2]) : "", host: m[3], port: m[4] ? parseInt(m[4]) : 5432, database: m[5] || "postgres" };
}

loadEnv();
const c = parseCs(process.env.TARGET_CONNECTION_STRING);
const ref = c.host.match(/^db\.([^.]+)\.supabase\.co$/)?.[1];
const pool = new pg.Pool({
  host: process.env.GW_POOLER_HOST || "aws-1-ap-northeast-1.pooler.supabase.com",
  port: 5432, database: c.database, user: `${c.user}.${ref}`, password: c.password,
  max: 2, connectionTimeoutMillis: 15000, ssl: { rejectUnauthorized: false },
});

const YEAR = new Date().getFullYear();
let sessionId = null;
let cookie = null;
const log = (...a) => console.log(...a);

async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(init.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
}

try {
  // ── 1. Find a kas-RT manager ────────────────────────────────────────────
  const mgr = await pool.query(
    `select u.id, u.full_name, t.name as tenant
       from users u
       join tenant_users tu on tu.user_id = u.id
       join tenant_user_roles tur on tur.tenant_user_id = tu.id
       join roles t on t.id = tur.role_id
      where tur.role_id in (4,8) and tur.revoked_at is null
        and tu.status = 'ACTIVE' and u.status = 'ACTIVE'
      limit 1`,
  );
  if (!mgr.rows.length) throw new Error("no active kas-RT manager found");
  const userId = mgr.rows[0].id;
  log(`manager: ${mgr.rows[0].full_name} (${mgr.rows[0].tenant})`);

  // ── 2. Mint a real session row + JWT ────────────────────────────────────
  const { createHash, randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  sessionId = (await import("uuidv7")).uuidv7();
  await pool.query(
    `insert into sessions (id, user_id, token_hash, expires_at, created_at)
     values ($1, $2, $3, now() + interval '1 day', now())`,
    [sessionId, userId, tokenHash],
  );
  const jwt = await new SignJWT({ sessionId, userId, appr: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  cookie = `wd_session=${jwt}`;
  log("session minted");

  // ── 3. Baseline ─────────────────────────────────────────────────────────
  const before = await api("/api/kas-rt/house-statuses");
  check("GET house-statuses 200", before.status === 200, `status=${before.status}`);
  const beforeList = Array.isArray(before.body) ? before.body : [];
  check("house-statuses has override fields",
    beforeList.length > 0 && "overrideMonths" in beforeList[0] && "isSettled" in beforeList[0]);

  const beforeLunas = beforeList.filter((h) => h.isSettled).length;
  const beforeMoney = beforeList.reduce((s, h) => s + h.total2026, 0);

  const sumBefore = await api(`/api/kas-rt/summary?year=${YEAR}&month=1`);
  const incomeBefore = sumBefore.body?.selectedMonth?.income ?? null;
  const paidHousesBefore = sumBefore.body?.iplCollection?.paidHouses ?? null;
  log(`baseline: lunas=${beforeLunas} money=${beforeMoney} summaryIncome=${incomeBefore} paidHouses=${paidHousesBefore}`);

  // ── 4. Pick a house that is NOT settled and has real money ─────────────
  // Prefer one that is also absent from the summary's paid-block list, so the
  // union semantics of summary.paidHouses can be asserted meaningfully.
  const summaryPaidBlocks = new Set(
    Array.isArray(sumBefore.body?.iplCollection?.unpaidHouses)
      ? sumBefore.body.iplCollection.unpaidHouses
      : [],
  );
  const unsettled = beforeList.filter((h) => !h.isSettled && h.houseId);
  const candidate =
    unsettled.find((h) => !summaryPaidBlocks.has(h.blokRumah)) ?? unsettled[0];
  if (!candidate) throw new Error("no unsettled house available to test");
  const candidateWasUnpaidInSummary = !summaryPaidBlocks.has(candidate.blokRumah);
  log(
    `target house: blok ${candidate.blokRumah} total=${candidate.total2026} months=${candidate.overrideMonths} absentFromSummaryPaidList=${candidateWasUnpaidInSummary}`,
  );

  // ── 5. Mark it paid ─────────────────────────────────────────────────────
  const mark = await api("/api/kas-rt/house-payment-overrides", {
    method: "POST",
    body: JSON.stringify({
      house_id: candidate.houseId,
      year: YEAR,
      credited_months: 12,
      reason: "PEMBEBASAN",
      notes: "E2E test override — akan dibatalkan",
    }),
  });
  check("POST override 200", mark.status === 200, `status=${mark.status} body=${JSON.stringify(mark.body).slice(0, 160)}`);
  const overrideId = mark.body?.id;

  // Duplicate must be rejected
  const dup = await api("/api/kas-rt/house-payment-overrides", {
    method: "POST",
    body: JSON.stringify({
      house_id: candidate.houseId, year: YEAR, credited_months: 12,
      reason: "PEMBEBASAN", notes: "duplikat",
    }),
  });
  check("duplicate override rejected 409", dup.status === 409, `status=${dup.status}`);

  // Missing notes must be rejected
  const noNotes = await api("/api/kas-rt/house-payment-overrides", {
    method: "POST",
    body: JSON.stringify({
      house_id: candidate.houseId, year: YEAR, credited_months: 12, reason: "KOREKSI",
    }),
  });
  check("missing notes rejected 400", noNotes.status === 400, `status=${noNotes.status}`);

  // ── 6. THE CORE ASSERTION ───────────────────────────────────────────────
  const after = await api("/api/kas-rt/house-statuses");
  const afterList = Array.isArray(after.body) ? after.body : [];
  const afterHouse = afterList.find((h) => h.blokRumah === candidate.blokRumah);
  const afterLunas = afterList.filter((h) => h.isSettled).length;
  const afterMoney = afterList.reduce((s, h) => s + h.total2026, 0);

  check("Lunas count increased", afterLunas === beforeLunas + 1, `${beforeLunas} -> ${afterLunas}`);
  check("target house now settled", afterHouse?.isSettled === true);
  check("overrideMonths recorded", afterHouse?.overrideMonths === 12, `got ${afterHouse?.overrideMonths}`);
  check("TOTAL MONEY UNCHANGED", afterMoney === beforeMoney, `${beforeMoney} -> ${afterMoney}`);
  check("target house money unchanged", afterHouse?.total2026 === candidate.total2026,
    `${candidate.total2026} -> ${afterHouse?.total2026}`);

  const sumAfter = await api(`/api/kas-rt/summary?year=${YEAR}&month=1`);
  const incomeAfter = sumAfter.body?.selectedMonth?.income ?? null;
  const paidHousesAfter = sumAfter.body?.iplCollection?.paidHouses ?? null;
  check("summary INCOME unchanged", incomeAfter === incomeBefore, `${incomeBefore} -> ${incomeAfter}`);
  const expectedPaidAfter = candidateWasUnpaidInSummary
    ? (paidHousesBefore ?? 0) + 1
    : paidHousesBefore;
  check("summary paidHouses matches union semantics",
    paidHousesAfter === expectedPaidAfter,
    `${paidHousesBefore} -> ${paidHousesAfter} (expected ${expectedPaidAfter}, candidate already paid in summary: ${!candidateWasUnpaidInSummary})`);
  check("summary reports overridePaidHouses", (sumAfter.body?.iplCollection?.overridePaidHouses ?? 0) >= 1,
    `overridePaidHouses=${sumAfter.body?.iplCollection?.overridePaidHouses}`);

  // ── 7. Audit trail ──────────────────────────────────────────────────────
  const audit = await pool.query(
    "select action from audit_logs where entity_id = $1 order by created_at desc",
    [overrideId],
  );
  check("audit row written", audit.rows.some((r) => r.action === "house_payment_override_created"),
    audit.rows.map((r) => r.action).join(",") || "none");

  // ── 8. Revoke ───────────────────────────────────────────────────────────
  const rev = await api(`/api/kas-rt/house-payment-overrides/${overrideId}`, { method: "DELETE" });
  check("DELETE override 200", rev.status === 200, `status=${rev.status}`);

  const revAgain = await api(`/api/kas-rt/house-payment-overrides/${overrideId}`, { method: "DELETE" });
  check("double revoke rejected 409", revAgain.status === 409, `status=${revAgain.status}`);

  const final = await api("/api/kas-rt/house-statuses");
  const finalList = Array.isArray(final.body) ? final.body : [];
  const finalLunas = finalList.filter((h) => h.isSettled).length;
  const finalMoney = finalList.reduce((s, h) => s + h.total2026, 0);
  const finalHouse = finalList.find((h) => h.blokRumah === candidate.blokRumah);

  check("Lunas back to baseline", finalLunas === beforeLunas, `${beforeLunas} -> ${finalLunas}`);
  check("money still unchanged after revoke", finalMoney === beforeMoney, `${beforeMoney} -> ${finalMoney}`);
  check("override cleared on house", (finalHouse?.overrideMonths ?? 0) === 0, `got ${finalHouse?.overrideMonths}`);

  // Revoked row must survive for audit
  const revokedRow = await pool.query(
    "select is_active, revoked_at, revoked_by from house_payment_overrides where id = $1",
    [overrideId],
  );
  check("revoked row retained (soft delete)",
    revokedRow.rows.length === 1 && revokedRow.rows[0].is_active === false && revokedRow.rows[0].revoked_at !== null);

  // ── 9. Unauthorized path ────────────────────────────────────────────────
  const anon = await fetch(`${BASE}/api/kas-rt/house-payment-overrides`, { method: "GET" });
  check("anonymous GET rejected 401", anon.status === 401, `status=${anon.status}`);

} catch (e) {
  check("E2E completed without exception", false, e.message);
} finally {
  // ── Cleanup: remove test override rows + temp session ───────────────────
  try {
    const del = await pool.query("delete from house_payment_overrides where notes like 'E2E test override%'");
    if (del.rowCount) log(`cleanup: removed ${del.rowCount} test override row(s)`);
  } catch (e) { log("cleanup override failed:", e.message); }
  if (sessionId) {
    await pool.query("delete from sessions where id = $1", [sessionId]).catch(() => {});
    log("cleanup: temp session deleted");
  }
  await pool.end();
}

const failed = results.filter((r) => !r.pass);
log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  log("FAILURES:");
  for (const f of failed) log(`  - ${f.name} :: ${f.detail ?? ""}`);
  process.exitCode = 1;
}
