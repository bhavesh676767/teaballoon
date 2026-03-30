"use client";

import { useMemo } from "react";
import { Secret } from "@/lib/supabase";
import { getMoodStyle } from "@/lib/moodConfig";
import { DetailedMood } from "@/lib/mood";

// ── More expressive, asymmetric hand-drawn balloon silhouettes ──────────────
// Each path is intentionally slightly squashed, lopsided or puffy for cartoon feel
const PATHS = [
  // Slightly fat & round, wider at the equator
  "M50,10 C76,6 95,28 95,53 C95,78 76,96 50,96 C24,96 5,78 5,53 C5,28 24,6 50,10Z",
  // Taller & slightly pear-shaped (top-heavy)
  "M50,8 C72,5 93,24 94,50 C95,76 78,98 50,98 C22,98 5,76 6,50 C7,24 28,5 50,8Z",
  // Squished horizontally — wide & low
  "M50,16 C78,10 96,30 96,52 C96,74 78,92 50,92 C22,92 4,74 4,52 C4,30 22,10 50,16Z",
  // Lopsided — leans right (organic, hand-drawn feel)
  "M52,8 C78,6 97,26 96,52 C95,78 74,97 50,97 C26,97 4,78 5,55 C6,30 26,10 52,8Z",
  // Lopsided — leans left
  "M48,9 C22,5 3,29 5,54 C7,79 26,97 50,97 C74,97 95,79 95,54 C95,28 74,12 48,9Z",
  // Very round & plump — almost a circle
  "M50,12 C74,9 92,26 92,50 C92,74 74,92 50,92 C26,92 8,74 8,50 C8,26 26,9 50,12Z",
  // Tall — taller than wide
  "M50,6 C70,4 90,22 91,48 C92,74 74,98 50,98 C26,98 8,74 9,48 C10,22 30,4 50,6Z",
  // Wide teardrop-ish
  "M50,14 C80,12 98,32 97,56 C96,80 76,94 50,94 C24,94 4,80 3,56 C2,32 20,12 50,14Z",
];

// ── 4-point star for sparkle ─────────────────────────────────────────────────
// cx=26, cy=21, sized to sit at top-left of balloon
function StarSparkle({ cx, cy, r, className, style }: { cx: number; cy: number; r: number; className: string; style: React.CSSProperties }) {
  const pts = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.42;
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
  }).join(" ");
  return <polygon points={pts} fill="white" className={className} style={style} />;
}

interface Props {
  secret: Secret & { mood?: string };
  parsedMood?: Omit<DetailedMood, 'keywords'|'phrases'>;
  intensity?: number;
  onClick: (secret: Secret) => void;
  laneLeft: number;
  riseDelaySecs: number;
  riseDurationSecs: number;
}

export function Balloon({ secret, parsedMood, intensity, onClick, laneLeft, riseDelaySecs, riseDurationSecs }: Props) {
  const p = useMemo(() => {
    const hash = secret.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const msgLen = secret.message.length;

    // Bigger balloons overall — more cartoonish impact
    let size = 96;
    if (msgLen < 30) size = 78;
    else if (msgLen > 150) size = 124;

    const path = PATHS[hash % PATHS.length];
    
    // Safely get the rich mood style, fallback to a standard aesthetic if none provided
    const style = parsedMood && intensity !== undefined ? getMoodStyle(parsedMood as any, intensity) : getMoodStyle(null as any, 1.0);

    // Lean: -9 to +9 degrees — more personality
    const lean = ((hash % 19) - 9) * 1.0;
    // Sway: 4s-7.5s
    const swayDur = 4.0 + (hash % 35) / 10;

    // Buoyancy effects
    const buoyancyScale = Math.max(0.72, Math.min(1.18, secret.buoyancy / 100));
    const buoyancyOpacity = Math.max(0.5, Math.min(1.0, secret.buoyancy / 100));
    const speedFactor = Math.max(0.6, Math.min(1.4, secret.buoyancy / 100));

    // Per-balloon animation phase offsets
    const stringDelay    = ((hash % 9) * 0.35).toFixed(2);
    const stringSwayDelay= ((hash % 7) * 0.45).toFixed(2);
    const highlightDelay = ((hash % 6) * 0.4).toFixed(2);
    const shimmerDelay   = ((hash % 8) * 0.55 + 1.2).toFixed(2);
    const sparkleDelay   = ((hash % 5) * 0.7 + 0.5).toFixed(2);
    const knotDelay      = ((hash % 6) * 0.38).toFixed(2);
    const stringWiggleDur= (3.0 + (hash % 28) / 10).toFixed(1);
    const stringSwayDur  = (3.5 + (hash % 25) / 10).toFixed(1);

    // Unique gradient IDs
    const gradId = `g${hash % 999}`;

    // Shadow direction — alternates slightly per balloon
    const shadowDx = 6 + (hash % 5);
    const shadowDy = 7 + (hash % 4);

    return {
      size, path, style, lean, swayDur,
      buoyancyScale, buoyancyOpacity, speedFactor,
      stringDelay, stringSwayDelay, highlightDelay,
      shimmerDelay, sparkleDelay, knotDelay,
      stringWiggleDur, stringSwayDur,
      gradId, shadowDx, shadowDy,
    };
  }, [secret.id, secret.message, secret.mood, secret.buoyancy]);

  return (
    <div
      className="balloon-wrapper"
      onClick={() => onClick(secret)}
      style={{
        left: `${laneLeft}%`,
        animationDuration: `${riseDurationSecs / p.speedFactor}s`,
        animationDelay: `-${riseDelaySecs}s`,
        opacity: p.buoyancyOpacity,
      }}
    >
      <div
        className="balloon-inner"
        style={{
          ["--lean" as string]: `${p.lean}deg`,
          animationDuration: `${p.swayDur}s`,
          transform: `scale(${p.buoyancyScale})`,
        }}
      >
        {/* ── Balloon SVG ── */}
        <svg
          width={p.size}
          height={p.size}
          viewBox="0 0 100 100"
          className="relative z-10 select-none"
          overflow="visible"
        >
          <defs>
            {/* Body gradient — bright top, slightly dark bottom for roundness */}
            <radialGradient id={`body-${p.gradId}`} cx="42%" cy="35%" r="58%">
              <stop offset="0%"   stopColor="white" stopOpacity="0.45" />
              <stop offset="60%"  stopColor="white" stopOpacity="0.05" />
              <stop offset="100%" stopColor="black" stopOpacity="0.12" />
            </radialGradient>

            {/* Glossy kidney-bean highlight */}
            <radialGradient id={`shine-${p.gradId}`} cx="30%" cy="28%" r="48%">
              <stop offset="0%"   stopColor="white" stopOpacity="0.98" />
              <stop offset="50%"  stopColor="white" stopOpacity="0.55" />
              <stop offset="100%" stopColor="white" stopOpacity="0"    />
            </radialGradient>

            {/* Shimmer diagonal streak */}
            <linearGradient id={`shimmer-${p.gradId}`} x1="0" y1="0" x2="1" y2="0.5">
              <stop offset="0%"   stopColor="white" stopOpacity="0"    />
              <stop offset="45%"  stopColor="white" stopOpacity="0.72" />
              <stop offset="65%"  stopColor="white" stopOpacity="0.55" />
              <stop offset="100%" stopColor="white" stopOpacity="0"    />
            </linearGradient>

            {/* Clip to balloon silhouette */}
            <clipPath id={`clip-${p.gradId}`}>
              <path d={p.path} />
            </clipPath>
          </defs>

          {/* ① Hard comic drop shadow — big & offset */}
          <path
            d={p.path}
            fill="#111"
            opacity="0.22"
            transform={`translate(${p.shadowDx},${p.shadowDy})`}
          />

          {/* ② Main balloon body */}
          <path
            d={p.path}
            fill={p.style.fill}
            stroke="#111"
            strokeWidth="5"
            strokeLinejoin="round"
          />

          {/* ③ Radial body shading for 3D roundness */}
          <path d={p.path} fill={`url(#body-${p.gradId})`} clipPath={`url(#clip-${p.gradId})`} />

          {/* ④ Big kidney-bean gloss highlight — the most "cartoon balloon" thing */}
          <ellipse
            cx="32" cy="30" rx="15" ry="22"
            fill={`url(#shine-${p.gradId})`}
            transform="rotate(-25 32 30)"
            clipPath={`url(#clip-${p.gradId})`}
            className="b-highlight"
            style={{ animationDelay: `${p.highlightDelay}s` }}
          />

          {/* ⑤ Shimmer diagonal sweep */}
          <rect
            x="-10" y="-10" width="120" height="120"
            fill={`url(#shimmer-${p.gradId})`}
            clipPath={`url(#clip-${p.gradId})`}
            className="b-shimmer"
            style={{ animationDelay: `${p.shimmerDelay}s` }}
          />

          {/* ⑥ 4-point star sparkle — top-left */}
          <StarSparkle
            cx={26} cy={20} r={7}
            className="b-sparkle"
            style={{ animationDelay: `${p.sparkleDelay}s` }}
          />

          {/* ⑦ Crisp comic ink outline stroked on top — thicker */}
          <path
            d={p.path}
            fill="none"
            stroke="#111"
            strokeWidth="5"
            strokeLinejoin="round"
          />
        </svg>


        {/* ── Vote Badge ── */}
        {secret.votes > 0 && (
          <div className="absolute -top-4 -right-2 px-2 py-0.5 bg-white border-[3px] border-[#111] rounded-lg font-black text-[11px] z-30 shadow-[3px_3px_0px_#111] pointer-events-none rotate-[6deg]">
            +{secret.votes}
          </div>
        )}
        {secret.votes < 0 && (
          <div className="absolute -top-4 -right-2 px-2 py-0.5 bg-[#ff6b6b] text-white border-[3px] border-[#111] rounded-lg font-black text-[11px] z-30 shadow-[3px_3px_0px_#111] pointer-events-none -rotate-[6deg]">
            {secret.votes}
          </div>
        )}

        {/* ── Knot at bottom of balloon ── */}
        <svg
          width="20" height="16" viewBox="0 0 20 16"
          className="b-knot block mx-auto -mt-[3px] relative z-20"
          style={{ animationDelay: `${p.knotDelay}s`, animationDuration: `${p.swayDur}s` }}
        >
          {/* Knot body */}
          <path
            d="M6,0 Q10,6 3,13 Q10,10 17,13 Q13,6 14,0 Q10,4 6,0Z"
            fill={p.style.fill}
            stroke="#111"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          {/* Knot gloss */}
          <ellipse cx="9" cy="5" rx="2.5" ry="2" fill="white" opacity="0.5" />
        </svg>

        {/* ── Animated String ── */}
        <svg
          width="18"
          height="68"
          viewBox="0 0 18 68"
          className="b-string-wrap block -mt-[2px]"
          style={{
            animationDelay: `${p.stringSwayDelay}s`,
            animationDuration: `${p.stringSwayDur}s`,
          }}
          overflow="visible"
        >
          {/* String drop shadow */}
          <path
            d="M9,0 C13,10 4,20 9,30 C14,40 4,50 9,60 C10,64 9,67 9,68"
            fill="none"
            stroke="rgba(0,0,0,0.18)"
            strokeWidth="4"
            strokeLinecap="round"
            transform="translate(2,2)"
          />
          {/* Main string — thick & wiggly, morphs */}
          <path
            className="b-string-path"
            d="M9,0 C13,10 4,20 9,30 C14,40 4,50 9,60 C10,64 9,67 9,68"
            fill="none"
            stroke="#111"
            strokeWidth="3"
            strokeLinecap="round"
            style={{
              animationDelay: `${p.stringDelay}s`,
              animationDuration: `${p.stringWiggleDur}s`,
            }}
          />
          {/* String gloss shine */}
          <path
            d="M9,0 C13,10 4,20 9,30 C14,40 4,50 9,60 C10,64 9,67 9,68"
            fill="none"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />
        </svg>
      </div>
    </div>
  );
}
