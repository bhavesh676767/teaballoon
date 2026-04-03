"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";
import { BalloonField } from "@/components/BalloonField";
import { Preloader } from "@/components/Preloader";
import { RulesModal } from "@/components/RulesModal";

function getBackground() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const time = h + m / 60.0; // Decimal representation of current hour

  if (time >= 5 && time < 7.5) return { img: 'url("/5-7.png")', hex: '#f6e5c0' }; 
  if (time >= 7.5 && time < 10) return { img: 'url("/7_30 to 8_30.png")', hex: '#b5d5e5' };
  if (time >= 10 && time < 17) return { img: 'url("/10 -11.png")', hex: '#87ceeb' }; 
  if (time >= 17 && time < 20) return { img: 'url("/after 5 or 6.png")', hex: '#e69074' }; 
  if (time >= 20 && time < 22) return { img: 'url("/night.png")', hex: '#1c1b33' }; 
  return { img: 'url("/midnight ( after 10 or 11).png")', hex: '#0a0a14' }; 
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [bgInfo, setBgInfo] = useState({ img: "", hex: "#87ceeb" });

  useEffect(() => {
    setBgInfo(getBackground());
  }, []);

  return (
    <>
      {/* Full-screen sky background — bg-left keeps left focal point on small screens */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-left bg-no-repeat transform scale-[1.15] origin-center"
        style={{ backgroundImage: bgInfo.img, backgroundColor: bgInfo.hex }}
      />

      {/* Preloader */}
      <Preloader onComplete={() => setReady(true)} />

      {/* App */}
      {ready && (
        <div className="fixed inset-0 z-10">
          {/* Main Top Logo & Rules Control */}
          <div className="absolute top-4 left-4 z-50 flex flex-col items-start gap-2">
            <div
              className="inline-block border-[3px] border-[#111] px-4 py-1.5 font-black text-sm uppercase tracking-[0.2em] bg-white transform -rotate-1"
              style={{ boxShadow: "3px 3px 0 #111", borderRadius: "10px" }}
            >
              TeaBalloon
            </div>
            
            <button
              onClick={() => setShowRules(true)}
              className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest px-3 py-1 bg-[#ffe66d] border-[2.5px] border-[#111] hover:translate-y-[-2px] hover:translate-x-[2px] transition-all"
              style={{ boxShadow: "2px 2px 0 #111", borderRadius: "8px" }}
            >
              <Info className="w-3.5 h-3.5" />
              Rules
            </button>
          </div>

          {/* Main balloon field */}
          <BalloonField />

          {/* Rules Modal */}
          <AnimatePresence>
            {showRules && (
              <RulesModal onClose={() => setShowRules(false)} />
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
