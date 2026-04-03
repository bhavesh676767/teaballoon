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


    // 2. Determine if recipient opted for emails. 
    // If empty/null, we just silently return 200 (Success) since the UI expects a clean success 
    // without leaking whether an email was sent or not (Total anonymity!)
    // 3. ALWAYS store the reply as a visual thread!
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(/, /)[0] : "local";
    const userAgent = req.headers.get('user-agent') || "unknown";

    const payloadString = JSON.stringify({
       text: replyMessage.trim(),
       vessel: "balloon",
       doodle: null,
       gif: gifUrl,
       replyTo: secretId
    });

    const { error: insertError } = await supabaseConfigured
      .from("teaballoon app")
      .insert({
        message: payloadString,
        display_name: "Anonymous",
        mood: "neutral",
        email: null,
        has_email: false,
        word_count: replyMessage.trim().split(/\s+/).length || 0,
        buoyancy: 100.0, // Replies start at neutral buoyancy
        is_active: true,
        ip_address: ip,
        user_agent: userAgent
      });

    if (insertError) {
      console.error("Reply Insert Fail:", insertError);
      return NextResponse.json({ error: "Failed to pin reply to the sky." }, { status: 500 });
    }

    // 4. Boost buoyancy for the original secret being good enough to reply to
    const newBuoyancy = Math.min(200, (originalSecret.buoyancy || 0) + 15.0);
    await supabaseConfigured
      .from("teaballoon app")
      .update({ buoyancy: newBuoyancy })
      .eq("id", secretId);

    // 5. Send email if original owner has one
    if (!originalSecret.email) {
      return NextResponse.json({ success: true, emailSent: false });
    }

    const emailSuccess = await sendReplyNotificationEmail({
      originalPosterEmail: originalSecret.email,
      originalMessage: originalSecret.message,
      replyMessage: replyMessage.trim(),
      gifUrl: gifUrl
    });

    return NextResponse.json({ success: true, emailSent: !!emailSuccess });


  } catch (err) {
    console.error("Reply Server Fail:", err);
    return NextResponse.json({ error: "Internal Server Fault" }, { status: 500 });
  }
}
