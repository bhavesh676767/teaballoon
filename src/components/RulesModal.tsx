"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Info, MessageSquareHeart, ShieldAlert, UserCheck, Ban } from "lucide-react";

export function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
      />

      {/* Rules Card */}
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 50, opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-lg bg-[#fffef5] border-[4px] border-[#111] p-6 sm:p-8 rounded-[2rem] z-10 overflow-y-auto max-h-[90vh] custom-scrollbar"
        style={{ boxShadow: "10px 10px 0 #111" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="rotate-3 bg-red-400 border-[3px] border-[#111] p-2 rounded-xl">
               <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Sky Policies</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-[#ff6b6b] border-[3px] border-[#111] rounded-full text-white font-black hover:rotate-90 transition-transform"
          >
            ×
          </button>
        </div>

        {/* Policy Sections */}
        <div className="flex flex-col gap-6">
          
          <div className="flex gap-4 items-start">
            <div className="bg-[#55efc4] border-[3px] border-[#111] p-2 rounded-lg mt-1"><MessageSquareHeart className="w-5 h-5" /></div>
            <div>
              <h3 className="font-black text-lg uppercase italic">Don't Be a Monster</h3>
              <p className="text-sm font-bold text-gray-600 leading-relaxed font-caveat text-xl">
                No hate speech, bullying, or targeted roasts that make people cry. Treat every stranger like a fragile porcelain doll! (not really we are jokin... but seriously, keep it classy or we'll pop your balloon with a giant comic needle). 💥🔨
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="bg-[#fab1a0] border-[3px] border-[#111] p-2 rounded-lg mt-1"><Ban className="w-5 h-5" /></div>
            <div>
              <h3 className="font-black text-lg uppercase">Zero Personal Info</h3>
              <p className="text-sm font-bold text-gray-600 leading-relaxed font-caveat text-xl">
                Never share phone numbers, addresses, or private credentials. Protecting everyone's privacy is our highest law.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="bg-[#a29bfe] border-[3px] border-[#111] p-2 rounded-lg mt-1"><UserCheck className="w-5 h-5" /></div>
            <div>
              <h3 className="font-black text-lg uppercase">Real Secrets Only</h3>
              <p className="text-sm font-bold text-gray-600 leading-relaxed font-caveat text-xl">
                This sky is for authentic human emotion. No marketing, spam, or bot-generated noise. Keep it real.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="bg-[#74b9ff] border-[3px] border-[#111] p-2 rounded-lg mt-1"><Info className="w-5 h-5" /></div>
            <div>
              <h3 className="font-black text-lg uppercase">Safe Content</h3>
              <p className="text-sm font-bold text-gray-600 leading-relaxed font-caveat text-xl">
                No NSFW or illegal content. We use IP trapping to keep the sky safe. Break the laws, and your balloon will be popped forever.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t-[3px] border-[#111] text-center">
          <p className="font-black text-[10px] uppercase text-gray-400 tracking-[0.2em] px-4">
            Violating policies will result in a permanent network shadow-ban.
          </p>
          <button 
            onClick={onClose}
            className="mt-6 w-full py-4 bg-[#111] text-white font-black uppercase text-sm rounded-2xl hover:bg-gray-800 transition-colors shadow-[4px_4px_0_#999]"
          >
            I Accept the Laws
          </button>
        </div>

      </motion.div>
    </div>
  );
}
