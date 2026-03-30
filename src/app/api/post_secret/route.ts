import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const validServiceRole = serviceRole && serviceRole !== "your_supabase_service_role_key" ? serviceRole : null;
const supabaseKey = validServiceRole || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { message, displayName, mood, email, has_email, word_count, buoyancy, is_active } = await req.json();

    // -- CAPTURE USER IP & DEVICE --
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(/, /)[0] : "local";
    const userAgent = req.headers.get('user-agent') || "unknown";

    const { data: newSecret, error } = await supabaseAdmin
      .from("teaballoon app")
      .insert({
        message,
        display_name: displayName,
        mood,
        email,
        has_email,
        word_count,
        buoyancy,
        is_active,
        ip_address: ip,
        user_agent: userAgent // Track exact device details
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: newSecret });

  } catch (err: any) {
    console.error("Posting Failed:", err);
    return NextResponse.json({ error: "The wind blew too hard." }, { status: 500 });
  }
}
