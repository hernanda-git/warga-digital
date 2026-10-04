#!/usr/bin/env node
/**
 * Verify the rendered house-status page HTML:
 *   - the card exposes ONE action button labelled "Adjust"
 *   - no "Tandai lunas tanpa transaksi" / "Batalkan penyesuaian" buttons
 *   - no credited-months badge and no override-notes paragraph
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { SignJWT } from "jose";
import { createHash, randomBytes } from "crypto";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || "http://localhost:3137";

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
  values ($1,$2,$3, now()+interval '30 min', now())`,
  [sid, mgr.id, createHash("sha256").update(token).digest("hex")]);
const jwt = await new SignJWT({ sessionId: sid, userId: mgr.id, appr: 1 })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("365d")
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));

const res = await fetch(`${BASE}/kas-rt/house-status`, {
  headers: { Cookie: `wd_session=${jwt}` }, redirect: "follow",
});
const html = await res.text();
console.log("HTTP", res.status, "| bytes:", html.length);

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
};

const adjustCount = (html.match(/>\s*Adjust\s*</g) ?? []).length;
check('button "Adjust" present', adjustCount > 0, `${adjustCount} occurrence(s)`);
check('no "Tandai lunas tanpa transaksi"', !html.includes("Tandai lunas tanpa transaksi"));
check('no "Batalkan penyesuaian" button', !html.includes(">Batalkan penyesuaian<"));
check("no credited-months badge", !html.includes("penyesuaian</span>"));
check("no 'bln penyesuaian' badge text", !/\d+ bln penyesuaian/.test(html));

// The override notes must not be a DOM element. The string legitimately remains
// in the RSC flight payload (the dialog prefills notes when updating), so assert
// on markup, not on the raw response.
const notesNeedle = "data pembayaran lama belum tercatat";
const inMarkup = new RegExp(`<p[^>]*>[^<]*${notesNeedle}`).test(html);
check("no override notes paragraph in DOM", !inMarkup);

// The month grid must still be there (the feature itself is untouched), and the
// credited months must now share the paid fill with only a dashed border.
const creditedCells = (html.match(/bg-app-primary text-white border-2 border-dashed border-white/g) ?? []).length;
console.log(`\ncredited month cells (paid fill + dashed border) rendered: ${creditedCells}`);
check("credited months use the paid fill with a dashed border", creditedCells > 0);
check("no amber credited styling remains", !html.includes("border-dashed border-amber-400"));

await pool.query("delete from sessions where id=$1", [sid]);
await pool.end();
console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);
