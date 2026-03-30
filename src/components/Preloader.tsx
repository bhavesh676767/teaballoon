"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Preloader({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500);
    }, 1200);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
        >
          {/* Comic stamp-style logo on preloader */}
          <motion.div
            initial={{ scale: 0.7, rotate: -6 }}
            animate={{ scale: 1, rotate: -3 }}
            transition={{ duration: 0.4, ease: "backOut" }}
            className="flex flex-col items-center gap-2"
          >
            <div
              className="px-5 py-2 border-[3px] border-white text-white font-black tracking-widest uppercase text-lg"
              style={{ fontFamily: "var(--font-outfit)", letterSpacing: "0.2em" }}
            >
              TeaBalloon
            </div>
            <div className="text-white/40 text-xs uppercase tracking-[0.3em] font-outfit">
              anonymous sky
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
