// Dump all user records with any URL-like avatar_path values
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://gwmxxfqoxjvrfwxhhpin.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bXh4ZnFveGp2cmZ3eGhocGluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM2MTM3NSwiZXhwIjoyMDkyOTM3Mzc1fQ.I_WI5Etz0G3Iu9nhzmTXAU2Kmk0UzsulIL_d20rd2Sw";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Check users table - get all avatar_path values that contain http
  const { data: users, error } = await supabase
    .from("users")
    .select("id, full_name, avatar_path")
    .not("avatar_path", "is", null)
    .limit(100);

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log(`Found ${users?.length || 0} users with avatar_path:`);
  for (const u of users || []) {
    const isUrl = u.avatar_path?.startsWith("http");
    console.log(`  id=${u.id} | avatar_path=${u.avatar_path?.substring(0, 120)} | isUrl=${isUrl}`);
  }

  // Check articles table - get all featured_image_url values
  const { data: articles, error: artErr } = await supabase
    .from("articles")
    .select("id, title, featured_image_url")
    .not("featured_image_url", "is", null)
    .limit(100);

  if (artErr) {
    console.error("Articles error:", artErr.message);
  } else {
    console.log(`\nFound ${articles?.length || 0} articles with featured_image_url:`);
    for (const a of articles || []) {
      console.log(`  id=${a.id} | featured_image_url=${a.featured_image_url?.substring(0, 120)}`);
    }
  }

  // Check jasa_service_media
  const { data: jasaMedia, error: jasaErr } = await supabase
    .from("jasa_service_media")
    .select("id, service_id, url")
    .not("url", "is", null)
    .limit(100);

  if (jasaErr) {
    console.error("Jasa media error:", jasaErr.message);
  } else {
    console.log(`\nFound ${jasaMedia?.length || 0} jasa media with url:`);
    for (const m of jasaMedia || []) {
      console.log(`  id=${m.id} | url=${m.url?.substring(0, 120)}`);
    }
  }

  // Check jualan_item_media
  const { data: jualanMedia, error: jualanErr } = await supabase
    .from("jualan_item_media")
    .select("id, item_id, url")
    .not("url", "is", null)
    .limit(100);

  if (jualanErr) {
    console.error("Jualan media error:", jualanErr.message);
  } else {
    console.log(`\nFound ${jualanMedia?.length || 0} jualan media with url:`);
    for (const m of jualanMedia || []) {
      console.log(`  id=${m.id} | url=${m.url?.substring(0, 120)}`);
    }
  }
}

run().catch(console.error);
