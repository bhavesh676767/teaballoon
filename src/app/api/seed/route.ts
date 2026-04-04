import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { classifyMood } from "@/lib/mood";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const validServiceRole = serviceRole && serviceRole !== "your_supabase_service_role_key" ? serviceRole : null;
const supabaseKey = validServiceRole || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

import fs from "fs";
import path from "path";

let openRouterKey = process.env.OPENROUTER_KEY || "";
if (!openRouterKey) {
  try {
    const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
    const match = envFile.match(/OPENROUTER_KEY=(.*)/);
    if (match) openRouterKey = match[1].trim();
  } catch (e) {}
}

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

function simulateHumanTypos(text: string) {
  // 1. HARD BAN ON DASHES: Forcefully remove all hyphens and em-dashes
  let t = text.replace(/[-—_]/g, ' ');

  // 2. Formatting sloppiness
  if (Math.random() < 0.4) {
    // 40% chance the entire thing is just lowercase
    t = t.toLowerCase();
  } else if (Math.random() < 0.9) {
    // 90% chance of the remainder that the first letter is uncapitalized (very common on phones with auto-cap off)
    t = t.charAt(0).toLowerCase() + t.slice(1);
  }

  // 3. Remove random commas to create run-on type pacing
  t = t.replace(/,/g, () => Math.random() < 0.5 ? "" : ",");

  // 4. Drop trailing periods
  if (t.endsWith('.') && Math.random() < 0.8) {
    t = t.slice(0, -1);
  }

  // 5. Hardcoded common quick-type mistakes
  t = t.replace(/\bthe\b/ig, () => Math.random() < 0.1 ? "teh" : "the");
  t = t.replace(/\breally\b/ig, () => Math.random() < 0.2 ? "realy" : "really");
  t = t.replace(/\bdefinitely\b/ig, () => Math.random() < 0.3 ? "defnitely" : "definitely");
  t = t.replace(/\bbecause\b/ig, () => Math.random() < 0.3 ? "bc" : "because");
  t = t.replace(/\bjust\b/ig, () => Math.random() < 0.2 ? "jst" : "just");
  t = t.replace(/\bpeople\b/ig, () => Math.random() < 0.15 ? "ppl" : "people");
  t = t.replace(/\bsomething\b/ig, () => Math.random() < 0.2 ? "smt" : "something");
  
  // Clean up double spaces from dash removals
  t = t.replace(/\s{2,}/g, ' ');

  return t.trim();
}

async function getRedditComments(subreddit: string, postId: string) {
  try {
    const res = await fetch(`https://www.reddit.com/r/${subreddit}/comments/${postId}.json?sort=top`, {
      headers: { "User-Agent": redditUserAgent }
    });
    if (!res.ok) return [];
    
    const data = await res.json();
    let rawComments = data[1].data.children
      .map((child: any) => child.data)
      .filter((c: any) => c.body && c.body.length > 5 && c.body !== "[deleted]" && c.body !== "[removed]");
      
    if (rawComments.length === 0) return [];

    rawComments = rawComments.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
    const highestScore = rawComments[0].score || 0;

    // A comment is included if it has > 50 upvotes OR has at least 15% of the upvotes of the top reply
    let bestComments = rawComments.filter((c: any) => c.score >= 50 || c.score >= (highestScore * 0.15));

    // Fallback if none passed the threshold, we just take the top 1 or 2
    if (bestComments.length === 0) {
      bestComments = rawComments.slice(0, Math.min(2, rawComments.length));
    }

    // Cap identically at 6 maximum
    return bestComments.slice(0, 6).map((c: any) => c.body);
  } catch (err) {
    return [];
  }
}

async function rewriteConfession(originalText: string, lengthInstruction: string) {
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
Gen Z flavor & Spice:
Sprinkle in gen z slang naturally. Swearing and adult language is fully allowed and encouraged. If the post is angry or spicy, use swear words naturally like a real person venting (e.g. "wtf", "fucking", "shit", etc). Keep it spicy but in control, don't overdo it. 
Use emojis like a real person would. You MUST include at least 1-3 emojis in this text. Emojis are MANDATORY. 💀😭✨😤🙃 type energy. Again dont overdo it but they must be present.
What to avoid:
No formal language. No perfect grammar. ABSOLUTELY NO EM DASHES OR HYPHENS. Replace dashes with periods or commas. No "furthermore" or "in conclusion" or any essay brain words. No robotic transitions. No lists. No headers unless the original had them.
CRITICAL IMMERSION RULE:
This app is ONLY for anonymous secrets floating in the sky. NEVER break the 4th wall. NEVER mention Reddit, subreddits, upvotes, downvotes, threads, forums, edits, or karma. If the original text mentions those things, REMOVE THEM completely or adapt them cleanly so it sounds like someone just whispering their raw secret into the void. Stay fully in character.
OBFUSCATION RULE:
You MUST actively change specific facts, ages, times, numbers, names, and locations. Modify the details enough so that no one can recognize this story from its original source, but KEEP the core emotional plot intact. Make it untraceable.
Your only job is to make the text feel like a real human sat down and typed it out. Messy, real, and readable.`
          },
          {
            role: "user",
            content: `Rewrite this confession:\n\n${originalText}\n\n${lengthInstruction}\n\nIMPORTANT FINAL REMINDER: You MUST include at least one emoji, and you MUST NOT use any em-dashes (—) or hyphens (-).`
          }
        ]
      })
    });

    if (!res.ok) return null;

    const data = await res.json();
    let txt = data.choices[0].message.content.trim();
    return simulateHumanTypos(txt);
  } catch (err) {
    return null;
  }
}

async function rewriteReply(originalText: string) {
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
            content: `You are a human text rewriter. Convert the text into a conversational, emotionally real reply.
Formatting rules: No em dashes. No dashes. Just flowing paragraphs like a human actually types. No robotic transitions.
Human typing style: Small typos are okay. Sound typed.
Gen Z flavor & Spice: Sprinkle in gen z slang naturally. Swearing and adult language is fully allowed and encouraged. Keep it spicy but controlled. 
OBFUSCATION RULE: Change specific facts, numbers, ages, and details if mentioned so it's impossible to trace back to the original post.
CRITICAL IMMERSION RULE: NEVER mention Reddit, "OP", upvotes, threads, or forums. This is an anonymous venting app. Drop all 4th wall breaks and meta-references.
CRITICAL INSTRUCTION: NO EMOJIS ALLOWED. EXACTLY ZERO EMOJIS.
Length MUST be strictly under 20 words. Preferably under 10 words. Extremely short and punchy.`
          },
          {
            role: "user",
            content: `Rewrite this reply:\n\n${originalText}\n\nIMPORTANT: ZERO EMOJIS, UNDER 20 WORDS.`
          }
        ]
      })
    });

    if (!res.ok) return null;

    const data = await res.json();
    let txt = data.choices[0].message.content.trim();
    if (txt.startsWith('"') && txt.endsWith('"')) txt = txt.slice(1, -1);
    
    return simulateHumanTypos(txt);
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
    
    // Determine the length constraint for this specific balloon:
    const rand = Math.random();
    let lengthInstruction = "";
    if (rand < 0.30) {
      lengthInstruction = "CRITICAL LENGTH INSTRUCTION: You must make this rewrite very short, strictly between 20 to 50 words maximum.";
    } else if (rand < 0.80) {
      lengthInstruction = "CRITICAL LENGTH INSTRUCTION: You must make this rewrite medium length, strictly around 90 to 110 words.";
    } else {
      lengthInstruction = "CRITICAL LENGTH INSTRUCTION: You must make this rewrite long, strictly more than 130 words.";
    }

    const rewritten = await rewriteConfession(fullText, lengthInstruction);
    
    if (rewritten) {
      const wordCount = rewritten.split(/\s+/).length;
      const payloadString = JSON.stringify({
        text: rewritten,
        vessel: "balloon",
        doodle: null,
        audio: null
      });

      const { data: insertedBalloon, error } = await supabase.from("teaballoon app").insert({
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
      }).select("id").single();
      
      console.log("Supabase Parent Insert:", { data: insertedBalloon, error });

      if (!error && insertedBalloon) {
        seededCount++;

        // Process comments for this post dynamically based on their popularity
        const comments = await getRedditComments(post.subreddit, post.id);
        console.log("Fetched comments length:", comments.length);
        
        for (const comment of comments) {
          const rewrittenReply = await rewriteReply(comment);
          if (rewrittenReply) {
            const replyPayload = JSON.stringify({
              text: rewrittenReply,
              vessel: "balloon",
              doodle: null,
              gif: null,
              replyTo: String(insertedBalloon.id)
            });

            const { error: replyError } = await supabase.from("teaballoon app").insert({
              message: replyPayload,
              display_name: "Anonymous",
              mood: "neutral",
              email: null,
              has_email: false,
              word_count: rewrittenReply.split(/\s+/).length || 0,
              buoyancy: 100.0,
              is_active: true,
              ip_address: "bot",
              user_agent: "TeaBalloon Bot triggered via UI"
            });
            if (replyError) console.error("Reply Insert Error:", replyError);
            else console.log("Reply inserted for balloon", insertedBalloon.id);
          } else {
            console.error("rewrittenReply was null");
          }
        }
      } else {
         console.error("Failed or no insertedBalloon returned:", error);
      }
    }
  }

  return NextResponse.json({ success: true, count: seededCount });
}
