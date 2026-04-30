// Quick script to rewrite old R2 dev bucket URLs to custom domain
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://gwmxxfqoxjvrfwxhhpin.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bXh4ZnFveGp2cmZ3eGhocGluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM2MTM3NSwiZXhwIjoyMDkyOTM3Mzc1fQ.I_WI5Etz0G3Iu9nhzmTXAU2Kmk0UzsulIL_d20rd2Sw";

const OLD = "https://pub-e8fb49e00b3148128a9aa5967e921be2.r2.dev/";
const NEW = "https://oo.warga-digital.com/";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TABLES = [
  {
    table: "users",
    col: "avatar_path",
    // users stores relative paths, so strip the old URL prefix entirely
    transform: (val) => val.replace(OLD, ""),
  },
  {
    table: "organisation_members",
    col: "profile_picture_url",
    transform: (val) => val.replace(OLD, NEW),
  },
  {
    table: "organisation_member_customs",
    col: "custom_profile_picture_url",
    transform: (val) => val.replace(OLD, NEW),
  },
  {
    table: "articles",
    col: "featured_image_url",
    transform: (val) => val.replace(OLD, NEW),
  },
  {
    table: "jasa_service_media",
    col: "url",
    transform: (val) => val.replace(OLD, NEW),
  },
];

async function run() {
  let totalUpdated = 0;

  for (const { table, col, transform } of TABLES) {
    console.log(`\nScanning ${table}.${col}...`);

    const { data: rows, error } = await supabase
      .from(table)
      .select("id", col)
      .like(col, `${OLD}%`);

    if (error) {
      console.error(`  Query error: ${error.message}`);
      continue;
    }

    if (!rows || rows.length === 0) {
      console.log(`  No records with old URLs.`);
      continue;
    }

    console.log(`  Found ${rows.length} records to update.`);

    for (const row of rows) {
      const newVal = transform(row[col]);
      const { error: updateErr } = await supabase
        .from(table)
        .update({ [col]: newVal })
        .eq("id", row.id);

      if (updateErr) {
        console.error(`  UPDATE failed for ${table} ${row.id}: ${updateErr.message}`);
      } else {
        totalUpdated++;
        console.log(`  ✓ ${table} ${row.id}`);
      }
    }
  }

  console.log(`\nDone. Total updated: ${totalUpdated}`);
}

run().catch(console.error);
