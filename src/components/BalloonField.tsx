"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Secret, supabase } from "@/lib/supabase";
import { Balloon } from "./Balloon";
import { SecretModal } from "./SecretModal";
import { PostSecretBar } from "./PostSecretBar";
import { AnimatePresence } from "framer-motion";
import { analyzeMood, censorMessage } from "@/lib/mood";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { parseSecretPayload } from "@/lib/parseSecret";

export function BalloonField() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");
  const [selected, setSelected] = useState<Secret | null>(null);
  const [selectedReplies, setSelectedReplies] = useState<Secret[]>([]);
  const [censorEnabled, setCensorEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Fetch active secrets ──────────────────────────────
  const fetchSecrets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("teaballoon app")
        .select("id, display_name, created_at, message, votes, is_active, mood, buoyancy, word_count, scroll_max, has_email")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetch error:", error);
        setDbError("Couldn't connect to the sky. Check your Supabase keys.");
        return;
      }

      // Filter active
      const valid = (data as Secret[]).map(s => ({ ...s }));

      setSecrets(valid);
      setDbError("");
    } catch (e) {
      console.error(e);
      setDbError("Something went wrong connecting to Supabase.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Subscribe to Realtime Changes ──────────────────
  useEffect(() => {
    fetchSecrets();

    const channel = supabase
      .channel("balloon_sky_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teaballoon app" },
        () => {
          fetchSecrets(); // Re-fetch the whole active set for consistency
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSecrets]);

  // ── Spread Layout: Deep Guaranteed Grid ─────
  // Limits total balloons depending on device so mobile isn't overwhelmed.
  // Constrains minimum and maximum Left positions to prevent edge cutoff.
  const balloonPlacements = useMemo(() => {
    if (secrets.length === 0) return [];
    
    // 1. Calculate capacity based on screen width
    // We aim for roughly 1 lane every 180px for a clean look
    const width = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const COLS = Math.max(isMobile ? 3 : 5, Math.floor(width / 180));
    const maxBalloons = Math.min(secrets.length, COLS * 4); // Max 4 balloons per lane depth
    
    const visibleSecrets = secrets.slice(0, maxBalloons);
    const mains: Secret[] = [];
    const repliesMap = new Map<string, Secret[]>();

    visibleSecrets.forEach((s_original: Secret) => {
       const s = { ...s_original };
       const payload = parseSecretPayload(s.message);
       
       // Global Censorship check
       payload.text = censorMessage(payload.text, censorEnabled);
       s.message = JSON.stringify(payload);

       if (payload.replyTo) {
          if (!repliesMap.has(payload.replyTo)) repliesMap.set(payload.replyTo, []);
          repliesMap.get(payload.replyTo)!.push(s);
       } else {
          mains.push(s);
       }
    });

    const n = mains.length;
    if (n === 0) return [];

    // LAME-BASED PACKING SYSTEM (Guarantees NO Overlap)
    // We divide the screen into vertical "lanes" and stack balloons in them with timing offsets.
    const lanes: any[][] = Array.from({ length: COLS }, () => []);
    
    // Bounds to prevent falling off the edges
    const minX = isMobile ? 8 : 5;
    const maxX = isMobile ? 92 : 95;
    const laneWidth = (maxX - minX) / COLS;

    const placements = [];

    for (let i = 0; i < n; i++) {
        const s = mains[i];
        const payload = parseSecretPayload(s.message);
        
        const uhash = Math.abs(s.id.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0));

        // Assign to a lane (distribute evenly)
        const laneIdx = i % COLS;
        const lane = lanes[laneIdx];
        
        // Horizontal: Tighter jitter on mobile/tablet to keep balloons firmly in their lane.
        // Desktop gets more freedom since lanes are wider.
        const jitterFactor = isMobile ? 0.15 : 0.45;
        const jitter = ((uhash % 100) / 100 - 0.5) * laneWidth * jitterFactor;
        const finalLeft = minX + (laneIdx * laneWidth) + (laneWidth / 2) + jitter;

        const buoyancyFactor = Math.max(0.6, Math.min(1.4, s.buoyancy / 100));
        const baseDuration = isMobile ? 22 : 32;
        const riseDurationSecs = (baseDuration + (uhash % 12)) / buoyancyFactor;

        // Staggered launch: each balloon waits its turn then loops forever.
        // animationFillMode:'backwards' keeps balloon off-screen below during its delay.
        //
        // Safe depth stagger = (balloon_height / screen_height) * rise_duration.
        // Balloon is ~200px tall; mobile screen ~700px, desktop ~900px.
        // We use a generous multiplier to guarantee no vertical overlap within a lane.
        const safeDepthStagger = isMobile
          ? riseDurationSecs * (200 / 700)  // ~8s on mobile
          : riseDurationSecs * (200 / 900); // ~7s on desktop, balloons spread more visually
        const laneStagger = laneIdx * 1.8;                  // spread first balloon per lane
        const depthStagger = lane.length * safeDepthStagger; // space subsequent balloons in lane
        const riseDelaySecs = laneStagger + depthStagger + (uhash % 2);

        // Analyze mood
        const { parsedMood, intensity } = analyzeMood(payload.text);
        const threadReplies = repliesMap.get(s.id) || [];

        const p = {
            secret: s,
            replies: threadReplies,
            laneLeft: finalLeft,
            riseDelaySecs,
            riseDurationSecs,
            parsedMood,
            intensity
        };
        
        lane.push(p);
        placements.push(p);
    }
    
    return placements;
  }, [secrets, isMobile, censorEnabled]);


  // ── Open balloon ──────────────────────────────────────
  const handleClick = (secret: Secret, replies: Secret[] = []) => {
    // We pass the secret object which might already be censored in placement
    setSelected(secret);
    setSelectedReplies(replies);
  };

  // ── Close modal + increment view_count ────────────────
  const handleClose = async () => {
    setSelected(null);
    setSelectedReplies([]);
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Halftone overlay — comic printing feel */}
      <div className="halftone absolute inset-0 z-0 pointer-events-none" />

      {/* Censor Toggle UI */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[200]">
        <button 
          onClick={() => setCensorEnabled(!censorEnabled)}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border-[3px] border-[#111] rounded-xl font-bold text-sm shadow-[4px_4px_0px_#111] hover:mt-[2px] hover:shadow-[2px_2px_0px_#111] hover:bg-gray-50 active:mt-[4px] active:shadow-[0px_0px_0px_#111] transition-all"
        >
          {censorEnabled
            ? <><ShieldCheck className="w-4 h-4" strokeWidth={3} /> Censor: ON</>
            : <><ShieldOff className="w-4 h-4" strokeWidth={3} /> Censor: OFF</>}
        </button>
      </div>

      {/* Main balloon canvas */}
      <div className="absolute inset-0 z-10 w-full h-[100dvh] overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="px-6 py-3 border-[4px] border-[#111] font-black uppercase tracking-widest text-[#111] rounded-2xl rotate-1 shadow-[6px_6px_0px_#111]"
              style={{ background: "#ffe66d" }}
            >
              Catching balloons...
            </div>
          </div>
        )}

        {!loading && dbError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="px-6 py-4 border-[4px] border-[#111] font-black text-white text-lg rounded-2xl -rotate-2 text-center max-w-sm"
              style={{ background: "#ff6b6b", boxShadow: "6px 6px 0 #111" }}
            >
              ⚠️ {dbError}
            </div>
          </div>
        )}

        {!loading && !dbError && secrets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="px-8 py-5 border-[4px] border-[#111] font-black text-2xl rounded-[2rem] -rotate-[3deg] text-center"
              style={{ background: "#fff", boxShadow: "8px 8px 0 #111" }}
            >
              The sky is empty!<br />
              <span className="font-bold text-lg text-gray-500 mt-2 block tracking-wide">
                Be the first to release a secret ↓
              </span>
            </div>
          </div>
        )}

        {/* The Balloons Layer — full screen, no overlap tracking */}
        <AnimatePresence>
          {balloonPlacements.map((p) => (
            <Balloon
              key={p.secret.id}
              secret={p.secret}
              placement={p}
              onClick={() => handleClick(p.secret, p.replies)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Modal overlay */}
      <AnimatePresence>
        {(() => {
          // Find the LATEST version of the selected secret to ensure voting counts stay fresh
          const activeSecret = selected ? secrets.find(s => s.id === selected.id) || selected : null;
          
          return activeSecret && (
            <div className="absolute inset-0 z-[300]">
              <SecretModal 
                secret={activeSecret} 
                replies={selectedReplies}
                onClose={handleClose} 
                onBalloonPopped={fetchSecrets} 
                onVoteSuccess={fetchSecrets}
              />
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Bottom input bar */}
      <PostSecretBar onPosted={fetchSecrets} />
    </div>
  );
}
