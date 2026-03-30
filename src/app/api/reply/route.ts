import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendReplyNotificationEmail } from "@/lib/brevo";

// Important: This route hits Supabase privately. 
// It requires access to read the 'email' column, which the frontend API doesn't.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

// Ideally, a SUPABASE_SERVICE_ROLE_KEY should be passed strictly for server contexts
// which circumvents RLS limits to fetch 'email' if you locked it down.
// Ensure a dummy placeholder doesn't accidentally break the JWT auth format.
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const validServiceRole = serviceRole && serviceRole !== "your_supabase_service_role_key" ? serviceRole : null;

const supabaseKey = validServiceRole || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseConfigured = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { secretId, replyMessage, gifUrl } = await req.json();

    if (!secretId || !replyMessage || replyMessage.trim().length === 0) {
      return NextResponse.json({ error: "Missing identity or message payload." }, { status: 400 });
    }

    // 1. Fetch original secret purely to grab their hidden email and content
    // We explicitly select 'email' which the frontend CANNOT see.
    const { data: originalSecret, error } = await supabaseConfigured
      .from("teaballoon app")
      .select("email, message, buoyancy")
      .eq("id", secretId)
      .single();

    if (error || !originalSecret) {
      console.error("API DB Error:", error);
      return NextResponse.json({ error: "Balloon could not be found." }, { status: 404 });
    }

    // Boost buoyancy for being good enough to reply to
    const newBuoyancy = Math.min(150, (originalSecret.buoyancy || 0) + 35.0);
    await supabaseConfigured
      .from("teaballoon app")
      .update({ buoyancy: newBuoyancy, is_active: true })
      .eq("id", secretId);

    // 2. Determine if recipient opted for emails. 
    // If empty/null, we just silently return 200 (Success) since the UI expects a clean success 
    // without leaking whether an email was sent or not (Total anonymity!)
    if (!originalSecret.email) {
      return NextResponse.json({ success: true, emailSent: false });
    }

    // 3. Hand off securely to Brevo API completely detached from the user's browser
    const emailSuccess = await sendReplyNotificationEmail({
      originalPosterEmail: originalSecret.email,
      originalMessage: originalSecret.message,
      replyMessage: replyMessage.trim(),
      gifUrl: gifUrl
    });

    if (!emailSuccess) {
      // Return 500 so client knows sending failed, but we still never expose WHO failed.
      return NextResponse.json({ error: "Email delivery choked upstream." }, { status: 500 });
    }

    // 4. Send success back safely
    return NextResponse.json({ success: true, emailSent: true });

  } catch (err) {
    console.error("Reply Server Fail:", err);
    return NextResponse.json({ error: "Internal Server Fault" }, { status: 500 });
  }
}
