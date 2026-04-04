import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { classifyMood } from "@/lib/mood";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const validServiceRole = serviceRole && serviceRole !== "your_supabase_service_role_key" ? serviceRole : null;
const supabaseKey = validServiceRole || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const openRouterKey = process.env.OPENROUTER_KEY || "";
const redditUserAgent = "TeaBalloonBot/1.0.0";

const supabase = createClient(supabaseUrl, supabaseKey);

const SUBREDDITS = ["confessions", "TrueOffMyChest", "weddingplanning", "bridezillas", "AmItheAsshole"];

async function getRedditPosts(limit = 15) {
  const sub = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/top.json?t=month&limit=${limit}`, {
      headers: { "User-Agent": redditUserAgent }
    });
    if (!res.ok) return [];
    
    const data = await res.json();
    return data.data.children
      .map((child: any) => child.data)
      .filter((post: any) => !post.stickied && post.selftext && post.selftext.length > 50 && post.selftext.length < 3000);
  } catch (err) {
    return [];
  }
}

async function rewriteConfession(originalText: string) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a human text rewriter. Your job is to take any input text and rewrite it in a natural, human typed style. Like someone actually sitting and typing on their phone or laptop, not a robot trying to sound casual.
Follow these rules strictly:
Voice and tone:
Convert the text into a conversational, emotionally real message. Sound like a real person venting, sharing, explaining or storytelling. Match the emotional energy of the original. If its heavy, keep it heavy. If its funny, make it funnier.
Formatting rules:
No em dashes. No dashes. No bullet points. No lists. Just flowing paragraphs like a human actually types. Length should be anywhere between 20 to 200 words depending on how much the original has to say. Dont pad it. Dont shrink it unnaturally.
Human typing style:
Use capitals for emphasis like THIS or WHAT or NO WAY. Small typos or grammar slips are okay and actually encouraged. Skip apostrophes sometimes like "dont" "cant" "its". Start sentences with And, But, So, Because. Repeat words for effect. Use "like" and "literally" and "honestly" and "idk" naturally. Dont sound edited. Sound typed.
Gen Z flavor:
Sprinkle in gen z slang naturally. Things like "no bc", "fr fr", "its giving", "lowkey", "not me", "rent free", "understood the assignment", "slay", "periodt", "im dead", "bestie" etc. Dont overdo it. Use it where it fits the vibe.
Emojis:
Use emojis like a real person would. Not at the end of every sentence. Just where it actually adds something. 💀😭✨😤🙃 type energy. Again dont overdo it.
What to avoid:
No formal language. No perfect grammar. No em dashes or regular dashes. No "furthermore" or "in conclusion" or any essay brain words. No robotic transitions. No lists. No headers unless the original had them.
Your only job is to make the text feel like a real human sat down and typed it out. Messy, real, and readable.`
          },
          {
            role: "user",
            content: `Rewrite this confession:\n\n${originalText}`
          }
        ]
      })
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    return null;
  }
}

export async function POST(req: Request) {
  // Trigger seeding process (this can take a few seconds, we will run it in the background or await it)
  // Vercel serverless functions might timeout if we await too long. 
  // For a single click, rewriting 5 posts will take ~5-10 seconds. We'll await to ensure success feedback.
  if (!openRouterKey) return NextResponse.json({ error: "Missing API Key" }, { status: 500 });

  const posts = await getRedditPosts(15);
  if (posts.length === 0) return NextResponse.json({ error: "No posts found" }, { status: 404 });

  const topPosts = posts.sort((a: any, b: any) => b.score - a.score).slice(0, 5);
  let seededCount = 0;

  for (const post of topPosts) {
    const fullText = `${post.title}\n\n${post.selftext}`;
    const rewritten = await rewriteConfession(fullText);
    
    if (rewritten) {
      const wordCount = rewritten.split(/\s+/).length;
      const payloadString = JSON.stringify({
        text: rewritten,
        vessel: "balloon",
        doodle: null,
        audio: null
      });

      await supabase.from("teaballoon app").insert({
        message: payloadString,
        display_name: "Anonymous",
        mood: classifyMood(rewritten),
        email: null,
        has_email: false,
        word_count: wordCount,
        buoyancy: 100.0,
        is_active: true,
        ip_address: "bot",
        user_agent: "TeaBalloon Bot triggered via UI"
      });
      seededCount++;
    }
  }

  return NextResponse.json({ success: true, count: seededCount });
}
