import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing env vars.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testDelete() {
  console.log("Fetching one secret...");
  const { data: first } = await supabase.from("teaballoon app").select("id, is_active").limit(1).single();
  
  if (!first) {
    console.log("No secrets found.");
    return;
  }

  console.log(`Found: ${first.id}, is_active: ${first.is_active}`);
  
  console.log("Attempting to set is_active = false...");
  const { error } = await supabase.from("teaballoon app").update({ is_active: false }).eq("id", first.id);
  
  if (error) {
    console.error("Update Error:", error);
  } else {
    console.log("Update Success!");
    
    const { data: verified } = await supabase.from("teaballoon app").select("is_active").eq("id", first.id).single();
    console.log(`New is_active status: ${verified?.is_active}`);
  }
}

testDelete();
