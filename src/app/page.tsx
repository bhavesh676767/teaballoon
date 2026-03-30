"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";
import { BalloonField } from "@/components/BalloonField";
import { Preloader } from "@/components/Preloader";
import { RulesModal } from "@/components/RulesModal";

function getBackground() {
  const h = new Date().getHours();
  if (h >= 6 && h < 17) return "url('/day_bg.png')";
  if (h >= 17 && h < 20) return "url('/evening_bg.png')";
  return "url('/night_bg.png')";
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [bg, setBg] = useState("");

  useEffect(() => {
    setBg(getBackground());
  }, []);

  return (
    <>
      {/* Full-screen sky background — bg-left keeps left focal point on small screens */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-left bg-no-repeat"
        style={{ backgroundImage: bg, backgroundColor: "#87ceeb" }}
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
