import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing env vars.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function deleteAll() {
  console.log("Removing all balloons...");
  const { data, error } = await supabase.from("teaballoon app").update({ is_active: false }).neq("is_active", false);
  
  if (error) {
    console.error("Failed to remove balloons:", error);
  } else {
    console.log("Successfully removed all balloons from the sky.");
  }
}

deleteAll();
