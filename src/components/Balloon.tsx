"use client";

import { useMemo, memo } from "react";
import { Secret } from "@/lib/supabase";
import { getMoodStyle } from "@/lib/moodConfig";
import { DetailedMood } from "@/lib/mood";
import { parseSecretPayload } from "@/lib/parseSecret";

// ── Clean curated balloon silhouettes ────────────────────────────────────────
const PATHS = [
  "M50,8 C73,8 92,27 92,50 C92,74 73,92 50,92 C27,92 8,74 8,50 C8,27 27,8 50,8Z",
  "M50,6 C71,6 90,24 91,49 C92,74 74,95 50,95 C26,95 8,74 9,49 C10,24 29,6 50,6Z",
  "M50,13 C76,11 95,30 95,52 C95,74 77,92 50,92 C23,92 5,74 5,52 C5,30 24,11 50,13Z",
  "M53,8 C76,7 94,27 93,52 C92,77 73,95 50,95 C27,95 7,77 8,54 C9,30 30,9 53,8Z",
  "M50,5 C69,4 88,22 89,47 C90,73 73,97 50,97 C27,97 10,73 11,47 C12,22 31,4 50,5Z",
  "M47,8 C24,7 6,28 7,53 C8,78 27,95 50,95 C73,95 93,78 93,53 C93,28 70,9 47,8Z",
  "M50,11 C73,10 91,27 91,50 C91,73 73,91 50,91 C27,91 9,73 9,50 C9,27 27,10 50,11Z",
];

// ── 4-point comic star sparkle ────────────────────────────────────────────────
function StarSparkle({ cx, cy, r, className, style }: { cx: number; cy: number; r: number; className: string; style: React.CSSProperties }) {
  const pts = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.38;
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
  }).join(" ");
  return <polygon points={pts} fill="white" className={className} style={style} />;
}

interface Props {
  secret: Secret & { mood?: string };
  placement: {
    laneLeft: number;
    riseDelaySecs: number;
    riseDurationSecs: number;
    parsedMood?: Omit<DetailedMood, 'keywords'|'phrases'>;
    intensity?: number;
    replies?: Secret[];
  };
  onClick: (secret: Secret) => void;
}

export const Balloon = memo(function Balloon(props: Props) {
  return <BalloonVessel {...props} />;
}, (prev, next) => {
  return prev.secret.id === next.secret.id &&
         prev.secret.votes === next.secret.votes &&
         prev.placement.laneLeft === next.placement.laneLeft;
});

export function BalloonVessel({ secret, placement, onClick }: Props) {
  const { laneLeft, riseDelaySecs, riseDurationSecs, parsedMood, intensity, replies } = placement;

  const payload = parseSecretPayload(secret.message);
  const hasAudio = !!payload.audio;

  const p = useMemo(() => {
    const innerPayload = parseSecretPayload(secret.message);
    const hash = secret.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const msgLen = innerPayload.text.length;

    let size = 100;
    if (msgLen < 30) size = 82;
    else if (msgLen > 150) size = 118;

    const path  = PATHS[hash % PATHS.length];
    const style = parsedMood && intensity !== undefined
      ? getMoodStyle(parsedMood as any, intensity)
      : getMoodStyle(null as any, 1.0);

    const lean    = ((hash % 13) - 6) * 1.1;
    const swayDur = 4.5 + (hash % 26) / 10;

    const buoyancyScale   = Math.max(0.75, Math.min(1.15, secret.buoyancy / 100));
    const buoyancyOpacity = Math.max(0.55, Math.min(1.0,  secret.buoyancy / 100));
    const speedFactor     = Math.max(0.65, Math.min(1.35, secret.buoyancy / 100));

    const stringDelay     = ((hash % 9) * 0.35).toFixed(2);
    const stringSwayDelay = ((hash % 7) * 0.45).toFixed(2);
    const highlightDelay  = ((hash % 6) * 0.4).toFixed(2);
    const shimmerDelay    = ((hash % 8) * 0.55 + 1.2).toFixed(2);
    const sparkleDelay    = ((hash % 5) * 0.7 + 0.5).toFixed(2);
    const sparkle2Delay   = ((hash % 4) * 0.9 + 1.5).toFixed(2);
    const knotDelay       = ((hash % 6) * 0.38).toFixed(2);
    const stringWiggleDur = (3.2 + (hash % 22) / 10).toFixed(1);
    const stringSwayDur   = (3.8 + (hash % 24) / 10).toFixed(1);

    const gradId   = `g${hash % 999}`;
    const shadowDx = 5 + (hash % 4);
    const shadowDy = 6 + (hash % 3);

    const riseVariant = (hash % 3) + 1; // 1, 2, or 3
    const swayVariant = (hash % 2) === 0 ? "lazy" : "active";

    return {
      size, path, style, lean, swayDur,
      buoyancyScale, buoyancyOpacity, speedFactor,
      stringDelay, stringSwayDelay, highlightDelay,
      shimmerDelay, sparkleDelay, sparkle2Delay, knotDelay,
      stringWiggleDur, stringSwayDur,
      gradId, shadowDx, shadowDy,
      riseVariant, swayVariant
    };
  }, [secret.id, secret.message, secret.mood, secret.buoyancy]);

  return (
    <div
      className="balloon-wrapper"
      onClick={() => onClick(secret)}
      style={{
        left: `${laneLeft}%`,
        transform: 'translateX(-50%)',
        animationName: `balloon-rise-${p.riseVariant}`,
        animationDuration: `${riseDurationSecs / p.speedFactor}s`,
        animationTimingFunction: p.riseVariant === 2 ? 'ease-in-out' : 'linear',
        animationDelay: `${riseDelaySecs}s`,
        animationIterationCount: 'infinite',
        animationFillMode: 'backwards',
        opacity: p.buoyancyOpacity,
      }}
    >
      <div
        className="balloon-inner"
        style={{
          ["--lean" as string]: `${p.lean}deg`,
          animationName: `balloon-sway-${p.swayVariant}`,
          animationDuration: `${p.swayDur}s`,
          animationTimingFunction: 'ease-in-out',
          animationIterationCount: 'infinite',
          transform: `scale(${p.buoyancyScale})`,
        }}
      >
        {/* ── Balloon SVG ── */}
        <svg
          width={p.size}
          height={p.size}
          viewBox="0 0 100 100"
          className="relative z-10 select-none"
          overflow="hidden"
          style={{ filter: "drop-shadow(2px 3px 0px rgba(0,0,0,0.12))", overflow: "hidden" }}
        >
          <defs>
            <radialGradient id={`body-${p.gradId}`} cx="38%" cy="32%" r="60%">
              <stop offset="0%"   stopColor="white" stopOpacity="0.45" />
              <stop offset="55%"  stopColor="white" stopOpacity="0.05" />
              <stop offset="100%" stopColor="black" stopOpacity="0.18" />
            </radialGradient>
          </defs>

          {/* ① Comic ink shadow */}
          <path d={p.path} fill="#111" opacity="0.1" transform={`translate(${p.shadowDx},${p.shadowDy})`} />

          {/* ② Main body */}
          <path d={p.path} fill={p.style.fill} stroke="#111" strokeWidth="5.5" strokeLinejoin="round" />

          {/* ③ 3D radial shading */}
          <path d={p.path} fill={`url(#body-${p.gradId})`} />

          {/* ④ Final crisp ink outline on top */}
          <path d={p.path} fill="none" stroke="#111" strokeWidth="5.5" strokeLinejoin="round" />

          {/* ⑤ Voice note icon — Sleek Audio Waveform */}
          {hasAudio && (
            <g transform="translate(50, 48)" style={{ pointerEvents: 'none' }}>
               <circle cx="0" cy="0" r="14" fill="white" stroke="#111" strokeWidth="4" />
               <rect x="-6.5" y="-4" width="3.5" height="8" rx="1.75" fill="#111" style={{ transformOrigin: "-4.75px 0px", animation: 'wave-bar 0.6s ease-in-out infinite alternate 0s' }} />
               <rect x="-1.75" y="-7" width="3.5" height="14" rx="1.75" fill="#111" style={{ transformOrigin: "0px 0px", animation: 'wave-bar 0.5s ease-in-out infinite alternate 0.2s' }} />
               <rect x="3" y="-5" width="3.5" height="10" rx="1.75" fill="#111" style={{ transformOrigin: "4.75px 0px", animation: 'wave-bar 0.7s ease-in-out infinite alternate 0.4s' }} />
            </g>
          )}
        </svg>



        {/* ── Vote Badge ── */}
        {secret.votes > 0 && (
          <div className="absolute -top-3 -right-3 min-w-[26px] h-[26px] flex items-center justify-center bg-[#ffe66d] border-[3px] border-[#111] rounded-full font-black text-[11px] z-30 shadow-[2px_2px_0px_#111] pointer-events-none rotate-[8deg] px-1">
            +{secret.votes}
          </div>
        )}
        {secret.votes < 0 && (
          <div className="absolute -top-3 -right-3 min-w-[26px] h-[26px] flex items-center justify-center bg-[#ff6b6b] text-white border-[3px] border-[#111] rounded-full font-black text-[11px] z-30 shadow-[2px_2px_0px_#111] pointer-events-none -rotate-[8deg] px-1">
            {secret.votes}
          </div>
        )}

        {/* ── Knot ── */}
        <svg width="22" height="18" viewBox="0 0 22 18" className="b-knot block mx-auto -mt-[3px] relative z-20"
          style={{ animationDelay: `${p.knotDelay}s`, animationDuration: `${p.swayDur}s` }}
        >
          <path d="M7,1 Q12,7 4,14 Q11,11 18,14 Q14,7 15,1 Q11,5 7,1Z" fill="#111" opacity="0.2" transform="translate(2,2)" />
          <path d="M7,1 Q12,7 4,14 Q11,11 18,14 Q14,7 15,1 Q11,5 7,1Z" fill={p.style.fill} stroke="#111" strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="10" cy="6" rx="2.5" ry="2" fill="white" opacity="0.6" />
        </svg>

        {/* ── Animated String ── */}
        <svg width="20" height="72" viewBox="0 0 20 72" className="b-string-wrap block -mt-[2px]" overflow="visible"
          style={{ animationDelay: `${p.stringSwayDelay}s`, animationDuration: `${p.stringSwayDur}s` }}
        >
          <path d="M10,0 C14,11 5,22 10,33 C15,44 4,54 10,65 C11,69 10,71 10,72" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="4.5" strokeLinecap="round" transform="translate(2,2)" />
          <path className="b-string-path" d="M10,0 C14,11 5,22 10,33 C15,44 4,54 10,65 C11,69 10,71 10,72" fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round"
            style={{ animationDelay: `${p.stringDelay}s`, animationDuration: `${p.stringWiggleDur}s` }}
          />
          <path d="M10,0 C14,11 5,22 10,33 C15,44 4,54 10,65 C11,69 10,71 10,72" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.5" />
        </svg>


      </div>
    </div>
  );
}

// Suppress unused import warning — payload is used inside useMemo
void (parseSecretPayload as unknown);
