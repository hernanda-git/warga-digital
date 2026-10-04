#!/usr/bin/env node
/**
 * Apply the RT's shadow-month markings WITHOUT adding any money.
 *
 *   O4   -> NOV + DES
 *   O23  -> up to OKTOBER            (house does not exist yet -> create it)
 *   L3   -> up to first paid in system 2026 (first real payment = JUN, so Jan-Mei)
 *   K10  -> up to DESEMBER
 *
 * Every row credits *calendar months* only. No kas_rt_transaction is created, so
 * house totals, kas balance and summary income stay exactly as the real
 * transactions say.
 *
 * Idempotent: an existing ACTIVE override for the same house+year is updated
 * rather than duplicated.
 *
 * Usage: node scripts/apply-shadow-marks.mjs [--dry-run]
 */
import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry-run");

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

const T = process.env.DEFAULT_TENANT_ID, C = process.env.DEFAULT_COMMUNITY_ID;
const YEAR = 2026;
const MONTH = 120000;
const LABELS = ["", "Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

// ── Who is acting (audit trail must name a real RT manager) ─────────────────
const mgr = await pool.query(
  `select u.id, u.full_name from users u
     join tenant_users tu on tu.user_id = u.id
     join tenant_user_roles tur on tur.tenant_user_id = tu.id
    where tur.role_id in (4,8) and tur.revoked_at is null
      and tu.status='ACTIVE' and u.status='ACTIVE'
      and tu.tenant_id=$1
    order by u.full_name limit 1`, [T]);
if (!mgr.rows.length) { console.error("no active RT manager found"); process.exit(1); }
const actor = mgr.rows[0];
console.log(`actor: ${actor.full_name} (${actor.id})`);

// ── Resolve each target's month set from real data ─────────────────────────
const targets = [
  { blok: "O23", create: true,  months: null, pick: "upToOctober" },
  { blok: "O4",  create: false, months: [11, 12], pick: "explicit" },
  { blok: "L3",  create: false, months: null, pick: "upToFirstPaid" },
  { blok: "K10", create: false, months: null, pick: "upToDecember" },
];

const results = [];
for (const t of targets) {
  // ── ensure the house exists ──────────────────────────────────────────────
  let house = (await pool.query(
    `select id, blok_rumah, name from houses
      where tenant_id=$1 and community_id=$2 and blok_rumah=$3`, [T, C, t.blok])).rows[0];

  if (!house && t.create) {
    if (DRY) {
      console.log(`[dry] would create house ${t.blok}`);
      house = { id: "00000000-0000-7000-8000-000000000000", blok_rumah: t.blok, name: t.blok };
    } else {
      house = (await pool.query(
        `insert into houses (tenant_id, community_id, name, blok_rumah, status, is_active, created_by)
         values ($1,$2,$3,$3,'PRIBADI',true,$4)
         on conflict (tenant_id, community_id, blok_rumah) where blok_rumah is not null
         do update set is_active = true
         returning id, blok_rumah, name`, [T, C, t.blok, actor.id])).rows[0];
      console.log(`created house ${t.blok} -> ${house.id}`);
    }
  }
  if (!house) { console.error(`house ${t.blok} missing and not creatable`); continue; }

  // ── real money position (must NOT change; used only to derive months) ────
  const money = (await pool.query(
    `select coalesce(sum(amount),0)::bigint total,
            array_agg(extract(month from date)::int order by date)
              filter (where amount <> 0) as months
       from kas_rt_transactions
      where tenant_id=$1 and community_id=$2 and reference=$3
        and is_shadow=false and deleted_at is null
        and date >= $4 and date < $5`,
    [T, C, t.blok, `${YEAR}-01-01`, `${YEAR + 1}-01-01`])).rows[0];

  const total = Number(money.total);
  const completeMonths = Math.floor(total / MONTH);
  const fromMoney = completeMonths + (total % MONTH > 0 ? 1 : 0);
  const firstPaid = money.months?.length ? Math.min(...money.months) : null;
  const lastPaid = money.months?.length ? Math.max(...money.months) : null;

  let months;
  if (t.pick === "explicit") months = t.months;
  else if (t.pick === "upToOctober") months = [1,2,3,4,5,6,7,8,9,10];
  else if (t.pick === "upToDecember") months = [1,2,3,4,5,6,7,8,9,10,11,12];
  else if (t.pick === "upToFirstPaid") months = firstPaid ? Array.from({length: firstPaid - 1}, (_, i) => i + 1) : [];
  months = [...new Set(months)].sort((a, b) => a - b);

  const notes =
    `Penyesuaian bulan (shadow) — data pembayaran lama belum tercatat sebagai transaksi kas. ` +
    `Bulan nyata tercatat: ${money.months?.join(",") || "-"} (total Rp${total.toLocaleString("id-ID")}).`;

  const existing = (await pool.query(
    `select id from house_payment_overrides
      where tenant_id=$1 and community_id=$2 and house_id=$3 and year=$4 and is_active`,
    [T, C, house.id, YEAR])).rows[0];

  if (!DRY) {
    if (existing) {
      await pool.query(
        `update house_payment_overrides
            set credited_months=$1, credited_month_numbers=$2, reason='KOREKSI',
                notes=$3, marked_by=$4, marked_at=now()
          where id=$5`,
        [months.length, months, notes, actor.id, existing.id]);
    } else {
      await pool.query(
        `insert into house_payment_overrides
           (tenant_id, community_id, house_id, year, credited_months,
            credited_month_numbers, reason, notes, is_active, marked_by)
         values ($1,$2,$3,$4,$5,$6,'KOREKSI',$7,true,$8)`,
        [T, C, house.id, YEAR, months.length, months, notes, actor.id]);
    }
  }

  const union = new Set([...Array.from({length: fromMoney}, (_, i) => i + 1), ...months]);
  results.push({
    blok: t.blok,
    houseId: house.id,
    money: total,
    realMonths: money.months?.join(",") || "-",
    firstPaid: firstPaid ? LABELS[firstPaid] : "-",
    credited: months.map((m) => LABELS[m]).join("+"),
    creditedN: months.length,
    covered: union.size,
    lunas: union.size >= 12,
    action: existing ? "updated" : "inserted",
  });
}

console.log(`\n=== ${DRY ? "DRY RUN" : "APPLIED"} ===`);
console.table(results);

// ── Verify the money invariant: totals must be untouched ───────────────────
const money = await pool.query(
  `select coalesce(sum(amount),0)::bigint tx_total,
          count(*)::int tx_count
     from kas_rt_transactions
    where tenant_id=$1 and community_id=$2 and is_shadow=false and deleted_at is null
      and date >= $3 and date < $4`,
  [T, C, `${YEAR}-01-01`, `${YEAR + 1}-01-01`]);
const ovr = await pool.query(
  `select count(*)::int n, coalesce(sum(credited_months),0)::int months
     from house_payment_overrides
    where tenant_id=$1 and community_id=$2 and year=$3 and is_active`, [T, C, YEAR]);
console.log(`\nMONEY (unchanged): 2026 real total = Rp${Number(money.rows[0].tx_total).toLocaleString("id-ID")} over ${money.rows[0].tx_count} transactions`);
console.log(`OVERRIDES: ${ovr.rows[0].n} active, ${ovr.rows[0].months} months credited, Rp0 added`);

await pool.end();
