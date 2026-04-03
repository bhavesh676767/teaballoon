"use client";

import { useMemo } from "react";
import { Secret } from "@/lib/supabase";
import { getMoodStyle } from "@/lib/moodConfig";
import { DetailedMood } from "@/lib/mood";
import { parseSecretPayload } from "@/lib/parseSecret";

interface Props {
  secret: Secret & { mood?: string };
  parsedMood?: Omit<DetailedMood, 'keywords'|'phrases'>;
  intensity?: number;
  onClick: (secret: Secret) => void;
  replies?: Secret[];
  laneLeft: number;
  riseDelaySecs: number;
  riseDurationSecs: number;
}

export function AnvilVessel({ secret, parsedMood, intensity, onClick, replies, laneLeft, riseDelaySecs }: Props) {
  const p = useMemo(() => {
    const style = parsedMood && intensity !== undefined ? getMoodStyle(parsedMood as any, intensity) : getMoodStyle(null as any, 1.0);
    // Anvils don't scale up much, they stay heavy
    const scale = Math.max(0.8, Math.min(1.1, secret.buoyancy / 100));
    return { style, scale };
  }, [secret.id, secret.buoyancy, parsedMood, intensity]);

  const payload = parseSecretPayload(secret.message);

  return (
    <div
      className="absolute cursor-pointer will-change-transform z-10 group"
      onClick={() => onClick(secret)}
      style={{
        left: `${laneLeft}%`,
        animation: `anvil-drop 18s cubic-bezier(1,-0.01,1,-0.01) infinite`,
        animationDelay: `-${riseDelaySecs}s`,
        transform: `scale(${p.scale})`
      }}
    >
      <div className="relative group-hover:brightness-110 group-active:scale-95 transition-all w-[100px] h-[80px]">
        <svg viewBox="0 0 100 80" className="w-full h-full drop-shadow-xl" overflow="visible">
          {/* Shadow */}
          <path d="M15,20 L85,20 L95,40 L95,70 L5,70 L5,40 Z" fill="#111" transform="translate(6,6)" opacity="0.3"/>
          {/* Anvil Base */}
          <path d="M15,20 L85,20 L95,40 L95,70 L5,70 L5,40 Z" fill="#576574" stroke="#111" strokeWidth="5" strokeLinejoin="round"/>
          {/* Anvil Horn */}
          <path d="M5,40 Q-15,40 -10,30 Q0,20 15,20" fill="#8395a7" stroke="#111" strokeWidth="4" strokeLinejoin="round"/>
          {/* Anvil Top Surface */}
          <path d="M15,20 L85,20 L75,25 L25,25 Z" fill="#c8d6e5" stroke="#111" strokeWidth="3" strokeLinejoin="round"/>
          
          {/* Mood Stripe */}
          <rect x="25" y="45" width="50" height="8" rx="4" fill={p.style.fill} stroke="#111" strokeWidth="3" />
        </svg>

        {/* Vote pill */}
        {secret.votes !== 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-white border-[3px] border-[#111] rounded-lg font-black text-[11px] shadow-[2px_2px_0px_#111] z-30">
            {secret.votes > 0 ? '+' : ''}{secret.votes}
          </div>
        )}

        {/* ── Threaded Replies Chain ── */}
        {replies && replies.length > 0 && (
          <div className="flex flex-col items-center mt-[-10px] space-y-[-15px]">
             {replies.map((reply, idx) => {
                const repPayload = parseSecretPayload(reply.message);
                return (
                  <div key={reply.id} className="relative z-10 hover:brightness-110 active:scale-95 transition-all text-center" style={{ transform: `scale(${Math.max(0.6, 0.9 - idx*0.05)})`, animation: `balloon-sway 5s ease-in-out infinite` }} onClick={(e) => { e.stopPropagation(); onClick(reply); }}>
                      <svg width="4" height="25" className="mx-auto block"><line x1="2" y1="0" x2="2" y2="25" stroke="#111" strokeWidth="2" strokeDasharray="4 2"/></svg>
                      <div className="bg-white border-[3px] border-[#111] rounded-[20px] px-3 py-2 max-w-[120px] shadow-[4px_4px_0_#111] bg-opacity-90">
                         <span className="font-bold text-xs truncate max-w-[100px] inline-block font-caveat">{repPayload.text}</span>
                      </div>
                  </div>
                );
             })}
          </div>
        )}
      </div>
    </div>
  );
}
