// Search ALL tables for old R2 URL using Supabase REST API
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://gwmxxfqoxjvrfwxhhpin.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bXh4ZnFveGp2cmZ3eGhocGluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM2MTM3NSwiZXhwIjoyMDkyOTM3Mzc1fQ.I_WI5Etz0G3Iu9nhzmTXAU2Kmk0UzsulIL_d20rd2Sw";

const OLD = "pub-e8fb49e00b3148128a9aa5967e921be2.r2.dev";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Get all tables from information_schema
  const { data: tables, error } = await supabase
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public");

  if (error) {
    console.error("Failed to list tables:", error.message);
    return;
  }

  console.log(`Found ${tables.length} tables. Searching each one...`);

  for (const { table_name: table } of tables) {
    // Skip known system/audit tables
    if (
      table.startsWith("_") ||
      table.includes("audit") ||
      table.includes("migrations") ||
      table === "schema_migrations" ||
      table === "supabase_migrations"
    ) {
      continue;
    }

    // Get columns for this table
    const { data: columns } = await supabase
      .from("information_schema.columns")
      .select("column_name", "data_type")
      .eq("table_schema", "public")
      .eq("table_name", table)
      .in("data_type", ["text", "character varying", "varchar"]);

    if (!columns || columns.length === 0) continue;

    for (const { column_name: col } of columns) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("id", col)
          .ilike(col, `%${OLD}%`)
          .limit(5);

        if (error) continue;

        if (data && data.length > 0) {
          console.log(`\nFOUND in ${table}.${col}: ${data.length} records`);
          for (const row of data) {
            const val = row[col];
            console.log(`  id=${row.id}`);
            console.log(`  val=${val?.substring(0, 150)}`);
          }
        }
      } catch {
        // skip
      }
    }
  }

  console.log("\nSearch complete.");
}

run().catch(console.error);
