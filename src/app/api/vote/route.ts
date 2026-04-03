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

    // -- PARTICIPATION CHECKS REMOVED AS PER USER REQUEST --

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
