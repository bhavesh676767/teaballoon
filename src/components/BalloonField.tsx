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
import { Preloader } from "./Preloader";

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
        (payload) => {
          setSecrets((prev) => {
            if (payload.eventType === 'INSERT' && payload.new.is_active) {
              // Add new secret and sort
              const updated = [payload.new as Secret, ...prev];
              return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            }
            if (payload.eventType === 'UPDATE') {
              if (payload.new.is_active) {
                // Update existing or add if it wasn't there but became active
                const exists = prev.some(s => s.id === payload.new.id);
                if (exists) {
                   return prev.map(s => s.id === payload.new.id ? payload.new as Secret : s);
                } else {
                   const updated = [payload.new as Secret, ...prev];
                   return updated.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                }
              } else {
                // Was deactivated
                return prev.filter(s => s.id !== payload.new.id);
              }
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter(s => s.id !== payload.old?.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSecrets]);

  // ── Non-Overlapping Balloon Placement ─────────────────────────────────────
  // Design principles:
  //   1. Horizontal: 3 lanes on mobile (125px apart) with ZERO jitter → no cross-lane clash
  //   2. Duration:   All mobile balloons share one fixed CSS duration → lane-mates never drift
  //   3. Phase:      Lane-mates get evenly-spaced start offsets (0/K, 1/K, 2/K …) → no vertical clash
  const balloonPlacements = useMemo(() => {
    if (secrets.length === 0) return [];

    const width = typeof window !== 'undefined' ? window.innerWidth : 1000;

    // Mobile: 3 columns → center-to-center ≈ 125px > max balloon diameter → safe
    // Desktop: dynamic column count based on viewport width
    const COLS      = isMobile ? 3 : Math.max(5, Math.floor(width / 180));
    const maxBalloons = isMobile
      ? Math.min(12, secrets.length)
      : Math.min(COLS * 5, secrets.length);

    // ── Pass 1: Split ALL secrets into mains vs replies BEFORE slicing ──
    // (secrets are newest-first; many recent entries are replies — slicing first starves mains)
    const allMains: Secret[] = [];
    const repliesMap = new Map<string, Secret[]>();

    secrets.forEach((s_original: Secret) => {
      const s       = { ...s_original };
      const payload = parseSecretPayload(s.message);
      payload.text  = censorMessage(payload.text, censorEnabled);
      s.message     = JSON.stringify(payload);

      if (payload.replyTo) {
        if (!repliesMap.has(payload.replyTo)) repliesMap.set(payload.replyTo, []);
        repliesMap.get(payload.replyTo)!.push(s);
      } else {
        allMains.push(s);
      }
    });

    const mains = allMains.slice(0, maxBalloons);
    const n     = mains.length;
    if (n === 0) return [];

    // ── Pass 2: Stable per-secret hash + speed factor ──
    const MOBILE_CSS_DURATION = 24; // seconds — identical for all balloons on mobile
    const mainsWithMeta = mains.map(s => {
      const uhash       = Math.abs(s.id.split("").reduce((a, c) => (a * 29 + c.charCodeAt(0)) | 0, 0));
      const speedFactor = Math.max(0.65, Math.min(1.35, s.buoyancy / 100));
      return { s, uhash, speedFactor };
    });

    // ── Pass 3: Assign lanes (round-robin + hash offset for variety) ──
    const laneAssignments: number[]  = [];
    const laneCounts      = new Array<number>(COLS).fill(0);
    for (let i = 0; i < n; i++) {
      const lane = (i + (mainsWithMeta[i].uhash % COLS)) % COLS;
      laneAssignments.push(lane);
      laneCounts[lane]++;
    }

    // ── Pass 4: Place balloons ──
    // Horizontal bands (in % of viewport width)
    const minX    = isMobile ? 18 : 5;
    const maxX    = isMobile ? 82 : 95;
    const spacing = (maxX - minX) / Math.max(1, COLS - 1);

    const lanePhaseCounters = new Array<number>(COLS).fill(0);
    const placements = [];

    for (let i = 0; i < n; i++) {
      const { s, uhash, speedFactor } = mainsWithMeta[i];
      const laneIdx      = laneAssignments[i];
      const posInLane    = lanePhaseCounters[laneIdx]++;
      const totalInLane  = laneCounts[laneIdx];

      // ── Horizontal ──
      // Mobile: ZERO jitter — lane centres are already safely spaced
      // Desktop: organic jitter up to 45% of inter-lane gap
      const jitter   = isMobile ? 0 : ((uhash % 100) / 100 - 0.5) * spacing * 0.45;
      const finalLeft = minX + laneIdx * spacing + jitter;

      // ── Duration ──
      // Mobile: riseDurationSecs is set so that Balloon.tsx's division by speedFactor
      //         always yields MOBILE_CSS_DURATION → all balloons loop in perfect sync.
      //         ( Balloon.tsx: actualCss = riseDurationSecs / speedFactor )
      //         ( So: riseDurationSecs = MOBILE_CSS_DURATION * speedFactor )
      const riseDurationSecs = isMobile
        ? MOBILE_CSS_DURATION * speedFactor
        : (18 + (uhash % 15)) / speedFactor; // desktop keeps organic variance

      const actualCssDuration = isMobile ? MOBILE_CSS_DURATION : riseDurationSecs / speedFactor;

      // ── Phase within lane (evenly distributed → never vertically aligned) ──
      // posInLane / totalInLane spreads balloons evenly across the cycle.
      // Extra per-lane offset desynchronises adjacent lanes from each other.
      const inLanePhase  = totalInLane > 1 ? posInLane / totalInLane : 0;
      const laneOffset   = (laneIdx / COLS) * (1 / COLS); // small shift between lanes
      const finalPhase   = (inLanePhase + laneOffset) % 1.0;

      // Negative delay = animation is already mid-cycle on mount → instant full sky
      const riseDelaySecs = -(finalPhase * actualCssDuration);

      const payload      = parseSecretPayload(s.message);
      const { parsedMood, intensity } = analyzeMood(payload.text);
      const threadReplies = repliesMap.get(s.id) || [];

      placements.push({
        secret: s,
        replies: threadReplies,
        laneLeft: finalLeft,
        riseDelaySecs,
        riseDurationSecs,
        parsedMood,
        intensity,
      });
    }

    return placements;
  }, [secrets, isMobile, censorEnabled]);




  // ── Open balloon ──────────────────────────────────────
  const handleClick = useCallback((secret: Secret, replies: Secret[] = []) => {
    // We pass the secret object which might already be censored in placement
    setSelected(secret);
    setSelectedReplies(replies);
  }, []);

  // ── Close modal + increment view_count ────────────────
  const handleClose = async () => {
    setSelected(null);
    setSelectedReplies([]);
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <AnimatePresence>
        {loading && <Preloader key="sky-loader" onComplete={() => setLoading(false)} />}
      </AnimatePresence>

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
          if (!selected) return null;
          // Find the LATEST version of the selected secret to ensure voting counts stay fresh
          const activeSecret = secrets.find(s => s.id === selected.id) || selected;
          
          return (
            <div className="absolute inset-0 z-[300]">
              <SecretModal 
                secret={activeSecret as Secret} 
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
