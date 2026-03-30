import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const validServiceRole = serviceRole && serviceRole !== "your_supabase_service_role_key" ? serviceRole : null;
const supabaseKey = validServiceRole || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { secretId, msSpent, scrollDepth } = await req.json();

    if (!secretId || typeof msSpent !== "number") {
      return NextResponse.json({ error: "Invalid health payload." }, { status: 400 });
    }

    // 1. Fetch current status
    const { data: current, error: fetchErr } = await supabaseAdmin
      .from("teaballoon app")
      .select("*")
      .eq("id", secretId)
      .single();

    if (fetchErr || !current) return NextResponse.json({ error: "Missing Balloon." }, { status: 404 });

    // ── THE BUOYANCY ALGORITHM ──
    const now = new Date();
    const lastEngaged = new Date(current.last_engagement || current.created_at);
    const hoursSinceLast = (now.getTime() - lastEngaged.getTime()) / (1000 * 60 * 60);
    
    // Constant decay (e.g., 4 points per hour)
    const decay = Math.min(hoursSinceLast * 4.0, 50); // limit decay to 50 pts at once to prevent massive drops

    let delta = 0;
    
    // Read Time Bonus
    // We give points for actual engagement time. 
    // Normalized to word count: rewarding reading at least 50% of expected speed (200 wpm)
    const expectedMs = current.word_count * 300; // 300ms per word (approx 200wpm)
    const readEfficiency = Math.min(msSpent / (expectedMs || 1000), 1.0);
    
    if (msSpent > 2000) { // Only count if > 2 seconds spent
       delta += 2.5; // Base engagement point
       delta += readEfficiency * 7.5; // Up to 10 points total for a "good read"
    }

    // Scroll Depth Bonus
    if (current.word_count > 30 && scrollDepth > 0.8) {
       delta += 10.0; // High quality reward for finishing long text
    }

    // Update the record
    const newBuoyancy = Math.min(150, (current.buoyancy - decay) + delta);
    const active = newBuoyancy > 0;

    const { error: updateErr } = await supabaseAdmin
      .from("teaballoon app")
      .update({
        buoyancy: newBuoyancy,
        total_read_time: (current.total_read_time || 0) + msSpent,
        impressions: (current.impressions || 0) + 1,
        scroll_max: Math.max(current.scroll_max || 0, scrollDepth || 0),
        last_engagement: now.toISOString(),
        is_active: active
      })
      .eq("id", secretId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, buoyancy: newBuoyancy, popped: !active });

  } catch (err) {
    console.error("Engagement Server Failure:", err);
    return NextResponse.json({ error: "Internal fault." }, { status: 500 });
  }
}
