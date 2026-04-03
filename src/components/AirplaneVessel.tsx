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

export function AirplaneVessel({ secret, parsedMood, intensity, onClick, replies, laneLeft, riseDelaySecs }: Props) {
  const p = useMemo(() => {
    const style = parsedMood && intensity !== undefined ? getMoodStyle(parsedMood as any, intensity) : getMoodStyle(null as any, 1.0);
    const scale = Math.max(0.7, Math.min(1.2, secret.buoyancy / 100));
    return { style, scale };
  }, [secret.id, secret.buoyancy, parsedMood, intensity]);

  const payload = parseSecretPayload(secret.message);

  return (
    <div
      className="absolute cursor-pointer will-change-transform z-20 group"
      onClick={() => onClick(secret)}
      style={{
        left: `${laneLeft}%`,
        animation: `airplane-fly 15s linear infinite`,
        animationDelay: `-${riseDelaySecs}s`,
        transform: `scale(${p.scale})`
      }}
    >
      <div className="relative group-hover:-translate-y-1 group-active:translate-y-1 transition-transform filter drop-shadow-xl w-[90px] h-[60px]">
        <svg viewBox="0 0 100 80" className="w-full h-full drop-shadow-md">
          {/* Main Body */}
          <polygon points="10,50 90,20 40,70" fill="#fff" stroke="#111" strokeWidth="4" strokeLinejoin="round" />
          {/* Fold */}
          <polygon points="10,50 40,70 50,45" fill="#f0f0f0" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
          {/* Small wing */}
          <polygon points="90,20 50,45 80,60" fill={p.style.fill} stroke="#111" strokeWidth="3" strokeLinejoin="round" opacity="0.9" />
          {/* Mood strip */}
          <path d="M45,60 L70,45" stroke={p.style.fill} strokeWidth="5" strokeLinecap="round" opacity="0.6"/>
        </svg>
        
        {/* Vote pill */}
        {secret.votes !== 0 && (
          <div className="absolute top-0 right-0 px-2 py-0.5 bg-white border-[3px] border-[#111] rounded-lg font-black text-[11px] shadow-[2px_2px_0px_#111] z-30">
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
