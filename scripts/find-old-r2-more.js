// Search more tables for old R2 URL
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://gwmxxfqoxjvrfwxhhpin.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bXh4ZnFveGp2cmZ3eGhocGluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM2MTM3NSwiZXhwIjoyMDkyOTM3Mzc1fQ.I_WI5Etz0G3Iu9nhzmTXAU2Kmk0UzsulIL_d20rd2Sw";

const OLD = "pub-e8fb49e00b3148128a9aa5967e921be2.r2.dev";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Additional tables to check
const TABLES = [
  { table: "profiles", cols: ["avatar_url", "avatar_path", "profile_picture"] },
  { table: "communities", cols: ["avatar_url", "cover_image_url", "logo_url"] },
  { table: "tenants", cols: ["avatar_url", "cover_image_url", "logo_url"] },
  { table: "organisations", cols: ["avatar_url", "cover_image_url", "logo_url"] },
  { table: "roles", cols: ["avatar_url", "icon_url"] },
  { table: "user_houses", cols: ["avatar_url"] },
  { table: "tenant_users", cols: ["avatar_url"] },
  { table: "wp_articles", cols: ["featured_image_url", "content"] },
  { table: "wp_posts", cols: ["featured_image_url", "content", "post_content"] },
  { table: "landing_sections", cols: ["content", "config", "image_url"] },
  { table: "cms_articles", cols: ["featured_image_url", "content"] },
];

async function run() {
  for (const { table, cols } of TABLES) {
    for (const col of cols) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("id", col)
          .ilike(col, `%${OLD}%`)
          .limit(10);

        if (error) {
          // Table or column doesn't exist
          continue;
        }

        if (data && data.length > 0) {
          console.log(`\nFOUND in ${table}.${col}: ${data.length} records`);
          for (const row of data) {
            console.log(`  id=${row.id}`);
            console.log(`  ${col}=${row[col]?.substring(0, 150)}`);
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
