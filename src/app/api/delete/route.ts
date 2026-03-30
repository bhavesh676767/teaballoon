import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const validServiceRole = serviceRole && serviceRole !== "your_supabase_service_role_key" ? serviceRole : null;
const supabaseKey = validServiceRole || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { secretId } = await req.json();

    if (!secretId) {
      return NextResponse.json({ error: "No target for deletion." }, { status: 400 });
    }

    // HARD DELETE from the database forever
    const { error } = await supabaseAdmin
      .from("teaballoon app")
      .delete()
      .eq("id", secretId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Balloon popped forever." });

  } catch (err) {
    console.error("Deletion Failed:", err);
    return NextResponse.json({ error: "The wind resisted your power." }, { status: 500 });
  }
}
