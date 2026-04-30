// Search entire database for old R2 URL
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://gwmxxfqoxjvrfwxhhpin.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bXh4ZnFveGp2cmZ3eGhocGluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM2MTM3NSwiZXhwIjoyMDkyOTM3Mzc1fQ.I_WI5Etz0G3Iu9nhzmTXAU2Kmk0UzsulIL_d20rd2Sw";

const OLD = "pub-e8fb49e00b3148128a9aa5967e921be2.r2.dev";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Tables to check with their text columns
const TABLE_COLUMNS = [
  { table: "users", cols: ["avatar_path", "name", "email", "phone"] },
  { table: "organisation_members", cols: ["profile_picture_url", "name", "email"] },
  { table: "organisation_member_customs", cols: ["custom_profile_picture_url"] },
  { table: "articles", cols: ["featured_image_url", "title", "content", "excerpt"] },
  { table: "jasa_service_media", cols: ["url", "title", "description"] },
  { table: "jasa_services", cols: ["cover_image_url", "description", "title"] },
  { table: "kas_rt_attachments", cols: ["storage_path", "file_url", "file_name"] },
  { table: "marketplace_listings", cols: ["cover_image_url", "description", "title"] },
  { table: "marketplace_media", cols: ["url", "title"] },
  { table: "communities", cols: ["avatar_url", "cover_image_url", "name", "description"] },
  { table: "tenants", cols: ["avatar_url", "cover_image_url", "name"] },
  { table: "roles", cols: ["avatar_url", "name", "description"] },
];

async function run() {
  for (const { table, cols } of TABLE_COLUMNS) {
    for (const col of cols) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("id", col)
          .ilike(col, `%${OLD}%`);

        if (error) {
          // Column might not exist
          continue;
        }

        if (data && data.length > 0) {
          console.log(`\nFOUND in ${table}.${col}: ${data.length} records`);
          for (const row of data) {
            console.log(`  id=${row.id}`);
            console.log(`  ${col}=${row[col]?.substring(0, 120)}`);
          }
        }
      } catch (e) {
        // skip
      }
    }
  }

  console.log("\nSearch complete.");
}

run().catch(console.error);
