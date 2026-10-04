#!/usr/bin/env node
/**
 * Confirm the DEPLOYED client bundle carries the new labels.
 * The adjust dialog renders only after a click, so it never appears in SSR
 * HTML — the bundle is the right place to assert its strings.
 *
 * The page is auth-gated, so a real session is minted first; otherwise this
 * scans the login page and finds nothing.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { SignJWT } from "jose";
import { createHash, randomBytes } from "crypto";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || "https://www.warga-digital.com";

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
const mgr = (await pool.query(
  `select u.id from users u join tenant_users tu on tu.user_id=u.id
     join tenant_user_roles tur on tur.tenant_user_id=tu.id
    where tur.role_id in (4,8) and tur.revoked_at is null
      and tu.status='ACTIVE' and u.status='ACTIVE' limit 1`)).rows[0];
const token = randomBytes(32).toString("hex");
const sid = (await import("uuidv7")).uuidv7();
await pool.query(`insert into sessions (id,user_id,token_hash,expires_at,created_at)
  values ($1,$2,$3, now()+interval '20 min', now())`,
  [sid, mgr.id, createHash("sha256").update(token).digest("hex")]);
const jwt = await new SignJWT({ sessionId: sid, userId: mgr.id, appr: 1 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("365d")
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));
const cookie = `wd_session=${jwt}`;

const pageRes = await fetch(`${BASE}/kas-rt/house-status`, {
  headers: { Cookie: cookie }, redirect: "follow",
});
const pageHtml = await pageRes.text();
const fromHtml = [...pageHtml.matchAll(/\/_next\/static\/[A-Za-z0-9._\/-]+\.js/g)].map((m) => m[0]);
const unique = [...new Set(fromHtml)];
console.log(`page HTTP ${pageRes.status} | ${unique.length} script paths`);

let pass = 0, fail = 0;
const check = (n, ok, d = "") => { ok ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n}${d ? " — " + d : ""}`)); };

let sawAdjust = false;
let sawOldRevoke = false;
let sawOldMark = false;
let fetched = 0;
for (const c of unique) {
  const r = await fetch(`${BASE}${c}`);
  if (!r.ok) continue;
  fetched++;
  const txt = await r.text();
  if (txt.includes('"Adjust"')) sawAdjust = true;
  if (txt.includes("Batalkan penyesuaian")) sawOldRevoke = true;
  if (txt.includes("Tandai lunas tanpa transaksi")) sawOldMark = true;
}
console.log(`fetched ${fetched} scripts`);

check('bundle contains "Adjust"', sawAdjust);
check('bundle free of "Batalkan penyesuaian"', !sawOldRevoke);
check('bundle free of "Tandai lunas tanpa transaksi"', !sawOldMark);

await pool.query("delete from sessions where id=$1", [sid]);
await pool.end();
console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);
