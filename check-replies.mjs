import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qsexeucumdtjumsuttyh.supabase.co";

let openRouterKey = "";
try {
  const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
  const match = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
  if (match) openRouterKey = match[1].trim();
} catch (e) {}

const supabase = createClient(supabaseUrl, openRouterKey);

async function check() {
  const { data, error } = await supabase.from("teaballoon app").select("message").limit(50).order("created_at", { ascending: false });
  if (error) { console.error(error); return; }
  let repliesCount = 0;
  for (const row of data) {
      if (row.message.includes("replyTo")) {
          // let parsed = JSON.parse(row.message);
          repliesCount++;
      }
  }
  console.log(`Found ${repliesCount} replies out of 50 total records.`);
}

check();
