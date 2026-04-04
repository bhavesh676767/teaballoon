import { createClient } from "@supabase/supabase-js";

// Load environment variables directly if running via node --env-file=.env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const openRouterKey = process.env.OPENROUTER_KEY;

// Reddit API credentials (if using authenticated OAuth)
// If you're just scraping the public .json URL, you don't strictly need these,
// but using them prevents IP rate limits.
const redditClientId = process.env.REDDIT_CLIENT_ID;
const redditClientSecret = process.env.REDDIT_CLIENT_SECRET;
const redditUserAgent = "TeaBalloonBot/1.0.0";

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase env vars.");
  process.exit(1);
}

if (!openRouterKey) {
  console.error("Missing OPENROUTER_KEY in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Subreddits to pull from
const SUBREDDITS = ["confessions", "TrueOffMyChest", "weddingplanning", "bridezillas"];

async function getRedditPosts(limit = 10) {
  // Pick a random subreddit from the list
  const sub = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
  console.log(`Fetching top posts from r/${sub}...`);
  
  try {
    // For simplicity, we use the public JSON endpoint.
    // If you want to use the Reddit API key, we can switch to OAuth.
    const res = await fetch(`https://www.reddit.com/r/${sub}/top.json?t=month&limit=${limit}`, {
      headers: { "User-Agent": redditUserAgent }
    });
    
    if (!res.ok) throw new Error(`Reddit API responded with ${res.status}`);
    
    const data = await res.json();
    const posts = data.data.children
      .map(child => child.data)
      .filter(post => !post.stickied && post.selftext && post.selftext.length > 50 && post.selftext.length < 3000); // Filter out stickies and bad lengths
      
    return posts;
  } catch (err) {
    console.error("Failed to fetch Reddit posts:", err);
    return [];
  }
}

async function rewriteConfession(originalText) {
  console.log("Rewriting confession via OpenRouter...");
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini", // Very fast and cheap, change to preferred model if needed
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

    if (!res.ok) throw new Error(`OpenRouter API responded with ${res.status}`);

    const data = await res.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error("OpenRouter rewrite failed:", err);
    return null;
  }
}

function classifyMoodProxy(text) {
  // Simple proxy for the mood classifier since we aren't loading the React client bundle
  // In a real scenario, you can import your classifyMood function if it's Node-compatible
  const lower = text.toLowerCase();
  if (lower.match(/(happy|joy|love|wedding|excited|glad|best)/)) return "joy";
  if (lower.match(/(sad|cry|depressed|heartbreak|grief|miss)/)) return "sadness";
  if (lower.match(/(angry|mad|furious|hate|rage|annoyed)/)) return "anger";
  if (lower.match(/(anxious|scared|nervous|fear|worry|panic)/)) return "fear";
  if (lower.match(/(guilt|sorry|regret|mistake|apologize)/)) return "guilt";
  return "neutral";
}

async function postToTeaBalloon(messageText) {
  const wordCount = messageText.split(/\s+/).length;
  const payloadString = JSON.stringify({
    text: messageText,
    vessel: "balloon",
    doodle: null,
    audio: null
  });

  const { data, error } = await supabase.from("teaballoon app").insert({
    message: payloadString,
    display_name: "Anonymous",
    mood: classifyMoodProxy(messageText),
    email: null,
    has_email: false,
    word_count: wordCount,
    buoyancy: 100.0,
    is_active: true,
    ip_address: "bot",
    user_agent: "TeaBalloon Content Bot"
  });

  if (error) {
    console.error("Failed to post to Supabase:", error);
  } else {
    console.log("Successfully released a seeded balloon!");
  }
}

async function runSeeder() {
  console.log("Starting TeaBalloon Content Seeder...");
  
  // 1. Get posts from Reddit
  const posts = await getRedditPosts(15);
  
  if (posts.length === 0) {
    console.log("No valid posts found this time.");
    return;
  }

  // 2. Pick top 5
  // Sort by upvotes (score) to get "best performing"
  const topPosts = posts.sort((a, b) => b.score - a.score).slice(0, 5);
  
  console.log(`Found ${topPosts.length} top posts. Processing...`);

  // 3. Process and post each one
  for (const post of topPosts) {
    // Combine title and body for full context
    const fullText = `${post.title}\n\n${post.selftext}`;
    
    // Rewrite it
    const rewritten = await rewriteConfession(fullText);
    
    if (rewritten) {
      // Post it
      await postToTeaBalloon(rewritten);
      
      // Artificial delay so they don't all slam the DB at the exact same millisecond
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log("Seeding round complete.");
}

runSeeder();
