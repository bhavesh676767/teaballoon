import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const validServiceRole = serviceRole && serviceRole !== "your_supabase_service_role_key" ? serviceRole : null;
const supabaseKey = validServiceRole || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { secretId, delta } = await req.json();

    if (!secretId || typeof delta !== "number") {
      return NextResponse.json({ error: "Missing payload details." }, { status: 400 });
    }

    // -- 1. TRAP THE IP & DEVICE ID --
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(/, /)[0] : "local";
    const userAgent = req.headers.get('user-agent') || "unknown";

    // -- 2. CHECK THE VOTE REGISTRY (Double-Layer Lock) --
    // We check if this IP OR this Device Fingerprint has already participated
    const { data: existingVote } = await supabaseAdmin
      .from("teaballoon_votes")
      .select("id")
      .eq("secret_id", secretId)
      .or(`ip_address.eq.${ip},user_agent.eq.${userAgent}`)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json({ 
        error: "Your device or network already participated in this balloon's destiny!" 
      }, { status: 403 });
    }

    // -- 3. RECORD THE VOTE (Prevent Future Floods) --
    const { error: registryError } = await supabaseAdmin
      .from("teaballoon_votes")
      .insert({
        secret_id: secretId,
        ip_address: ip,
        user_agent: userAgent
      });

    if (registryError) {
       // Risk of potential race condition collision
       return NextResponse.json({ error: "Duplicate vote rejected." }, { status: 403 });
    }

    // -- 4. APPLY THE VOTE IMPACT --
    const buoyancyImpact = delta > 0 ? 15.0 : -10.0;
    
    // Using a manual update to apply the impact
    const { data: current, error: fetchError } = await supabaseAdmin
      .from("teaballoon app")
      .select("votes, buoyancy")
      .eq("id", secretId)
      .single();

    if (fetchError || !current) throw new Error("Balloon lost in the sky.");

    const newBuoyancy = Math.max(0, (current.buoyancy || 0) + buoyancyImpact);
    
    const { error: updateError } = await supabaseAdmin
      .from("teaballoon app")
      .update({ 
        votes: (current.votes || 0) + delta,
        buoyancy: newBuoyancy,
        last_engagement: new Date().toISOString()
      })
      .eq("id", secretId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: "Your energy was felt in the sky." });

  } catch (err: any) {
    console.error("Voting Failed:", err);
    return NextResponse.json({ error: "The wind was too strong. Try again." }, { status: 500 });
  }
}
