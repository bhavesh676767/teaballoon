"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { getRandomName } from "@/lib/utils";
import { classifyMood } from "@/lib/mood";
import { motion, AnimatePresence } from "framer-motion";

export function PostSecretBar({ onPosted }: { onPosted: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Simple real-time email validator
  const isValidEmail = (str: string) => {
    if (!str) return true; // allowed to be empty
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  };
  
  const isEmailValidNow = isValidEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsg = message.trim();
    if (!cleanMsg) {
      setError("Write something first!");
      return;
    }
    if (cleanMsg.length > 280) {
      setError("Max 280 characters.");
      return;
    }
    
    const cleanEmail = email.trim();
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      setError("Double check your email format.");
      return;
    }

    setLoading(true);
    setError("");

    // ── Advanced Classification System ──
    const classifiedMood = classifyMood(cleanMsg);
    const finalName = name.trim() || getRandomName();
    const wordCount = cleanMsg.trim().split(/\s+/).length || 0;

    try {
      const res = await fetch("/api/post_secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: cleanMsg,
          displayName: finalName,
          mood: classifiedMood, 
          email: cleanEmail || null,
          has_email: !!cleanEmail,
          word_count: wordCount,
          buoyancy: 100.0,
          is_active: true
        })
      });

      if (!res.ok) throw new Error("API Choked.");
    } catch (err) {
      setError("Couldn't release the balloon. Try again.");
      console.error(err);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setMessage("");
    setName("");
    setEmail("");
    setLoading(false);
    onPosted();

    setTimeout(() => {
      setSuccess(false);
      setOpen(false);
    }, 1200);
  };

  return (
    <div className="fixed bottom-5 left-0 right-0 flex flex-col items-center z-[200] px-4 pointer-events-none">
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ scale: 0.7, rotate: -5 }}
            animate={{ scale: 1, rotate: 3 }}
            exit={{ scale: 0.7, opacity: 0 }}
            className="px-6 py-3 font-black text-lg border-[4px] border-[#111] rounded-2xl text-[#111] pointer-events-auto shadow-[6px_6px_0px_#111]"
            style={{ background: "#55efc4" }}
          >
            🎈 Balloon released!
          </motion.div>
        ) : open ? (
          <motion.form
            key="form"
            initial={{ y: 80, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onSubmit={handleSubmit}
            className="w-full max-w-md c-card-lg p-5 flex flex-col gap-3 pointer-events-auto relative"
            style={{ background: "#fffef5" }}
          >
            {/* Header row */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-black uppercase tracking-widest text-[#111]">
                🎈 Release a secret
              </span>
              <button
                type="button"
                onClick={() => { setOpen(false); setError(""); }}
                className="w-8 h-8 flex items-center justify-center bg-[#ff6b6b] border-[3px] border-[#111] shadow-[3px_3px_0px_#111] rounded-full text-white font-black hover:translate-y-px hover:translate-x-px hover:shadow-[2px_2px_0px_#111] transition-all"
              >
                ×
              </button>
            </div>

            {/* Name input */}
            <input
              type="text"
              placeholder="Your name (optional — we'll make one up)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              maxLength={40}
              className="c-input text-sm"
            />

            {/* Message input */}
            <textarea
              placeholder="What's your secret? ✍️"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              maxLength={280}
              rows={3}
              className="c-input resize-none text-base font-caveat font-bold leading-tight"
              style={{ fontSize: "1.25rem" }}
              required
            />
            
            {/* Email input (Optional for receiving replies) */}
            <div className="relative">
              <input
                type="email"
                placeholder="Email (Optional — to receive replies anonymously)"
                value={email}
                title="If you want someone to be able to talk back to your balloon, put an email here. It will never be shown to anyone."
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="c-input text-sm pr-8 transition-colors duration-200"
                style={{
                  borderColor: email && isEmailValidNow ? '#00b894' : email && !isEmailValidNow ? '#ff7675' : '#111'
                }}
              />
              {email && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 font-black pointer-events-none">
                  {isEmailValidNow ? <span className="text-[#00b894]">✔</span> : <span className="text-[#ff7675]">?</span>}
                </div>
              )}
            </div>
            
            <p className="text-[11px] font-bold text-gray-400 leading-tight uppercase px-1 -mt-1 tracking-wide">
              * Add email to hear back. We hide it from everyone (even repliers).
            </p>

            {error && (
              <p className="text-sm font-black text-white bg-red-500 border-[3px] border-[#111] px-3 py-1 rounded-lg mt-1 inline-block self-start shadow-[3px_3px_0px_#111]">
                {error}
              </p>
            )}

            {/* Footer row */}
            <div className="flex items-center justify-between gap-3 mt-1">
              <span className="text-xs font-black text-gray-400 bg-gray-100 border-[3px] border-[#111] px-3 py-1 rounded-xl">
                {message.length}/280
              </span>
              <button
                type="submit"
                disabled={loading || !message.trim() || (!isEmailValidNow && email.length > 0)}
                className="c-btn px-6 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#ffe66d" }}
              >
                {loading ? "Blowing..." : "RELEASE 🎈"}
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.button
            key="trigger"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            whileHover={{ rotate: 2, scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="c-btn px-8 py-4 text-[1.1rem] pointer-events-auto relative overflow-hidden group"
            style={{ background: "#4ecdc4", boxShadow: "6px 6px 0 #111" }}
          >
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-xl">✍️</span> RELEASE A SECRET
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
