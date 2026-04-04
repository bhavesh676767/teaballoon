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

  // 1. Deep Night (Crescent Moon, dark sky): 10:00 PM to 5:00 AM
  if (time < 5 || time >= 22) return { img: 'url("/night.png")', hex: '#16193b' }; 

  // 2. Sunrise (Fiery orange/pink): 5:00 AM to 6:30 AM
  if (time >= 5 && time < 6.5) return { img: 'url("/5-7.png")', hex: '#d96c4a' }; 

  // 3. Early Morning (Deep blue, fading faint moon): 6:30 AM to 8:30 AM
  if (time >= 6.5 && time < 8.5) return { img: 'url("/7_30 to 8_30.png")', hex: '#204074' };

  // 4. Full Day (Bright sun, fluffy clouds): 8:30 AM to 5:00 PM
  if (time >= 8.5 && time < 17) return { img: 'url("/10 -11.png")', hex: '#87ceeb' }; 

  // 5. Sunset (Teal top, pink/purple bottom): 5:00 PM to 7:30 PM
  if (time >= 17 && time < 19.5) return { img: 'url("/after 5 or 6.png")', hex: '#bd6a8b' }; 

  // 6. Dusk / Twilight (Teal horizon, single bright star): 7:30 PM to 10:00 PM
  if (time >= 19.5 && time < 22) return { img: 'url("/midnight ( after 10 or 11).png")', hex: '#162e44' }; 
  
  return { img: 'url("/night.png")', hex: '#16193b' }; // Fallback
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [bgInfo, setBgInfo] = useState({ img: "", hex: "#87ceeb" });
  const [logoClicks, setLogoClicks] = useState(0);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    // Initial set
    setBgInfo(getBackground());

    // Live update check every 60 seconds so the sky changes without refreshing
    const interval = setInterval(() => {
      setBgInfo(getBackground());
    }, 60000);

    return () => clearInterval(interval);
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
            <button
              onClick={async () => {
                const newCount = logoClicks + 1;
                setLogoClicks(newCount);
                if (newCount === 5 && !isSeeding) {
                  setLogoClicks(0);
                  setIsSeeding(true);
                  try {
                    await fetch('/api/seed', { method: 'POST' });
                  } catch (e) {
                    console.error("Seed failed", e);
                  } finally {
                    setIsSeeding(false);
                  }
                }
              }}
              className="inline-block border-[3px] border-[#111] px-4 py-1.5 font-black text-sm uppercase tracking-[0.2em] bg-white transform -rotate-1 cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ boxShadow: "3px 3px 0 #111", borderRadius: "10px" }}
            >
              {isSeeding ? "Seeding..." : "TeaBalloon"}
            </button>
            
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
