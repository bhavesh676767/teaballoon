require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const secrets = [
  "I once timed my replies perfectly so someone would think we had “chemistry”",
  "I’ve changed how I text depending on who I want to be for that person",
  "I once acted distant for days just so my “normal” self would feel special again",
  "I’ve had full conversations where every response was calculated, not genuine",
  "I’ve told someone exactly what they needed to hear… just to keep them attached",
  "I’ve watched someone fall for a version of me that doesn’t even exist",
  "I once gave someone just enough closure so they wouldn’t hate me… but not enough to move on",
  "I’ve entered someone’s life at their lowest just so I’d mean more to them",
  "I’ve made someone feel like they were the problem until they actually believed it",
  "I’ve pretended to be “bad at texting” just so I could reply whenever I wanted",
  "I once made someone jealous, then acted confused about why they were upset",
  "I’ve studied what makes someone feel special… and reused it on someone else",
  "I’ve stayed quiet in moments where honesty would’ve ended everything",
  "I’ve made someone think they were slowly losing me when I was already gone",
  "I’ve been the reason someone couldn’t trust properly again",
  "I once created a whole “we almost had something” story that only existed in my control",
  "I’ve kept people in different versions of me so no one knows the real one",
  "I’ve let someone believe they figured me out… when I was still hiding everything",
  "I’ve left things unsaid on purpose so they’d keep thinking about me",
  "I’ve made sure I was unforgettable… not necessarily good, just unforgettable"
];

const ALIASES = ["Ghost", "Shadow", "Mirror", "Echo", "Mask", "Phantom", "Whisper", "Stranger"];

async function addBalloons() {
  console.log(`Starting bulk injection of ${secrets.length} balloons...`);
  
  const payload = secrets.map(msg => ({
    message: JSON.stringify({
      text: msg,
      vessel: "balloon",
      doodle: null,
      replyTo: null
    }),
    display_name: ALIASES[Math.floor(Math.random() * ALIASES.length)],
    mood: "Confessional",
    buoyancy: 100.0,
    is_active: true,
    word_count: msg.split(' ').length,
    ip_address: "bulk-injection",
    user_agent: "antigravity-script"
  }));

  const { data, error } = await supabase
    .from('teaballoon app')
    .insert(payload);

  if (error) {
    console.error("Error inserting balloons:", error);
  } else {
    console.log("Successfully released the balloons into the sky!");
  }
}

addBalloons();
