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
    
    // 1. Filter out how many to show based on screen size
    const maxBalloons = isMobile ? 18 : 60;
    const visibleSecrets = secrets.slice(0, maxBalloons);
    const mains: Secret[] = [];
    const repliesMap = new Map<string, Secret[]>();

    visibleSecrets.forEach((s: Secret) => {
       const payload = parseSecretPayload(s.message);
       if (payload.replyTo) {
          if (!repliesMap.has(payload.replyTo)) repliesMap.set(payload.replyTo, []);
          repliesMap.get(payload.replyTo)!.push(s);
       } else {
          mains.push(s);
       }
    });

    const n = mains.length;

    // Use a grid system
    const COLS = isMobile ? 4 : 10;
    const ROWS = Math.ceil(n / COLS);
    
    const placements = [];
    
    // Bounds to prevent falling off the edges
    const minX = isMobile ? 12 : 8;
    const maxX = isMobile ? 85 : 92;
    const usableWidth = maxX - minX;
    
    // Shuffle the index so older/newer secrets interleave over the screen visually
    const shuffledSecrets = [...mains].sort((a,b) => {
        const hA = a.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const hB = b.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        return hA - hB;
    });

    // Build a per-session seed to scramble the layout so refreshing moves them around
    const sessionSeed = mains.reduce((acc, s) =>
      acc ^ s.id.split("").reduce((a: number, c: string) => (a * 31 + c.charCodeAt(0)) | 0, 0), 0
    );

    for (let i = 0; i < n; i++) {
        // Deep copy secret to alter the message text safely
        const s = { ...shuffledSecrets[i] };
        
        // Parse payload
        const payload = parseSecretPayload(s.message);
        payload.text = censorMessage(payload.text, censorEnabled);
        
        // Repackage it so child components receive the structured JSON as a string
        s.message = JSON.stringify(payload);
        
        const hash = s.id.split("").reduce((a: number, c: string) => (a * 31 + c.charCodeAt(0)) | 0, 0);
        const uhash = Math.abs(hash);

        // Assign to a grid cell. Use a prime-stride to spread small clusters
        // across the entire width of the screen instead of cramming them into col 0, 1, 2
        const col = (i * 7 + (sessionSeed % COLS) + (uhash % 3)) % COLS;
        const row = Math.floor(i / COLS);
        
        // Base X in the column
        const slotWidth = usableWidth / COLS;
        const baseLeft = minX + (col * slotWidth) + (slotWidth / 2);
        
        // Jitter within the column (±40%)
        const jitter = ((uhash % 100) / 100 - 0.5) * slotWidth * 0.8;
        const finalLeft = baseLeft + jitter;
        
        // Base rise duration (slow and floating)
        const buoyancySlowdown = Math.max(0.7, Math.min(1.4, s.buoyancy / 100));
        const riseDurationSecs = (35 + (uhash % 20)) / buoyancySlowdown;
        
        // Spread vertically evenly across the animation timeline
        const rowPhase = row / Math.max(1, ROWS - 1); 
        const verticalJitter = (((uhash >> 8) % 100) / 100 - 0.5) * 0.5; // -0.25 to 0.25 of a tier
        
        const phaseOffset = (rowPhase + verticalJitter / Math.max(1, ROWS)) * riseDurationSecs;
        const riseDelaySecs = Math.max(0, phaseOffset % riseDurationSecs);
        
        // Fully analyze mood semantics (matches 100+ categories)
        const { parsedMood, intensity } = analyzeMood(payload.text);

        const threadReplies = repliesMap.get(s.id) || [];

        placements.push({
            secret: s,
            replies: threadReplies,
            laneLeft: finalLeft,
            riseDelaySecs,
            riseDurationSecs,
            parsedMood,
            intensity
        });
    }
    
    return placements;
  }, [secrets, isMobile, censorEnabled]);


  // ── Open balloon ──────────────────────────────────────
  const handleClick = (secret: Secret) => setSelected(secret);

  // ── Close modal + increment view_count ────────────────
  const handleClose = async () => {
    setSelected(null);
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
              replies={p.replies}
              parsedMood={p.parsedMood}
              intensity={p.intensity}
              onClick={handleClick}
              laneLeft={p.laneLeft}
              riseDelaySecs={p.riseDelaySecs}
              riseDurationSecs={p.riseDurationSecs}
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
                onClose={handleClose} 
                onBalloonPopped={fetchSecrets}
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
