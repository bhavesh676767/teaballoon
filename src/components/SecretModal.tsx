"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Secret } from "@/lib/supabase";
import { getMoodStyle } from "@/lib/moodConfig";
import { analyzeMood } from "@/lib/mood";
import { parseSecretPayload } from "@/lib/parseSecret";
import { ArrowBigUp, ArrowBigDown, MessageCircle, Send, Image as ImageIcon, Search, X, Radio } from "lucide-react";

const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "";

const UPVOTE_MSGS = [
  "I found that interesting!",
  "This resonated with me!",
  "Exactly how I feel!",
  "Sending good vibes back!",
  "I hear you, stranger!",
  "That's deep.",
  "Beautifully said."
];

const DOWNVOTE_MSGS = [
  "Maybe that was so boring...",
  "A bit dark for me.",
  "Not my cup of tea.",
  "Moved on to better clouds.",
  "This balloon is a bit deflated.",
  "Needs more tea.",
  "Just floating by..."
];

// Voting is now unlimited per session!
export function SecretModal({ 
  secret, 
  onClose, 
  onBalloonPopped,
  onVoteSuccess
}: { 
  secret: Secret; 
  onClose: () => void;
  onBalloonPopped?: () => void;
  onVoteSuccess?: () => void;
}) {
  const payload = parseSecretPayload(secret.message);
  const { parsedMood, intensity } = analyzeMood(payload.text);
  const moodStyle = getMoodStyle(parsedMood as any, intensity);

  // -- Tracking Refs
  const startTimeRef = useRef(Date.now());
  const maxScrollRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // -- States
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySuccess, setReplySuccess] = useState(false);

  // -- GIF States
  const [gifOpen, setGifOpen] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifResults, setGifResults] = useState<any[]>([]);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [gifLoading, setGifLoading] = useState(false);

  // -- Vote States
  const [voteCount, setVoteCount] = useState(secret.votes || 0);
  
  // Realtime Sync: If someone else votes, or the DB updates, sync the local count
  useEffect(() => {
    setVoteCount(secret.votes || 0);
  }, [secret.votes]);

  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [isPopping, setIsPopping] = useState(false);

  // -- Admin states
  const [adminStep, setAdminStep] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const ADMIN_SEQUENCE = ["mood", "name", "name", "name"];

  const triggerAdminStep = (stepTag: string) => {
    if (isAdmin) return;
    if (stepTag === ADMIN_SEQUENCE[adminStep]) {
      const next = adminStep + 1;
      if (next === ADMIN_SEQUENCE.length) {
         setIsAdmin(true);
         setTooltip("⚠️ ADMIN CONTROL ACTIVATED");
         setTimeout(() => setTooltip(null), 3000);
      } else {
         setAdminStep(next);
      }
    } else {
      setAdminStep(0);
    }
  };

  const handleAdminDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretId: secret.id }),
      });
      if (res.ok) {
        onBalloonPopped?.(); // Refetch the sky instantly
        onClose();
      }
    } catch (err) {
      console.error("Admin Fail:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Engagement Life-cycle ──
  useEffect(() => {
    // We send engagement data when the modal is closed (unmounted)
    return () => {
      const msSpent = Date.now() - startTimeRef.current;
      const scrollDepth = maxScrollRef.current;

      // Use point-and-shoot fetch for the engagement "heartbeat"
      fetch("/api/engage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          secretId: secret.id, 
          msSpent, 
          scrollDepth 
        }),
      }).catch(err => console.error("Engagement signal lost in sky:", err));
    };
  }, [secret.id]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const progress = scrollTop / (scrollHeight - clientHeight);
    if (!isNaN(progress)) {
      maxScrollRef.current = Math.max(maxScrollRef.current, progress);
    }
  };

  const searchGifs = async () => {
    if (!gifSearch.trim() || !GIPHY_API_KEY) return;
    setGifLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(gifSearch)}&limit=10&rating=g`);
      const { data } = await res.json();
      setGifResults(data || []);
    } catch (err) {
      console.error("Giphy Search Fail:", err);
    } finally {
      setGifLoading(false);
    }
  };

  const handleVote = async (type: "up" | "down") => {
    // Pick random message
    const msgs = type === "up" ? UPVOTE_MSGS : DOWNVOTE_MSGS;
    setTooltip(msgs[Math.floor(Math.random() * msgs.length)]);
    
    // -- Unlimited logic: each click is a new vote request --
    const delta = type === "up" ? 1 : -1;
    setVoteCount(prev => prev + delta);
    setVoted(type);
    
    setTimeout(() => setTooltip(null), 2500);

    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretId: secret.id, delta }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        // Fallback for failed vote
        setVoteCount(prev => prev - delta);
        setVoted(null);
        setTooltip(errorData.error || "The sky rejected your vote.");
        setTimeout(() => setTooltip(null), 3000);
      } else {
        onVoteSuccess?.();
      }
    } catch (err) {
      console.error("Vote failed:", err);
      // Rollback
      setVoteCount(prev => prev - delta);
      setVoted(null);
      setTooltip("The wind was too strong. Vote lost.");
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setReplyLoading(true);
    setReplyError("");

    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          secretId: secret.id, 
          replyMessage: replyText.trim(),
          gifUrl: selectedGif 
        }),
      });

      if (!res.ok) throw new Error("Delivery failed.");

      setReplySuccess(true);
      setReplyText("");
      setSelectedGif(null);
      setTimeout(() => {
        setReplySuccess(false);
        setReplyOpen(false);
      }, 2000);
    } catch (err: any) {
      setReplyError("The wind blew it away. Try again.");
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px] pointer-events-auto"
      />

      {/* Tooltip Popup */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="absolute top-24 z-[100] px-6 py-3 bg-[#111] text-white font-black text-sm rounded-full border-[3px] border-white shadow-[4px_4px_0px_#111]"
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comic speech card */}
      <AnimatePresence>
        {!isPopping ? (
          <motion.div
            key="modal-card"
            initial={{ y: 100, opacity: 0, rotate: -3, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
            exit={{ y: 100, opacity: 0, rotate: 3, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="relative w-full max-w-sm flex flex-col z-10 pointer-events-auto max-h-[92vh] mb-4 sm:mb-0"
          >
            <div 
              className="c-card-lg p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 overflow-y-auto custom-scrollbar"
              style={{ background: "#fffef5" }}
            >
          <div 
            onClick={() => triggerAdminStep("mood")}
            className="absolute -top-5 left-8 px-4 py-1.5 border-[3px] rounded-2xl font-black text-sm uppercase flex items-center gap-2 transform -rotate-2 z-20"
            style={{ 
              background: moodStyle.fill, 
              color: moodStyle.fontColor || '#111',
              borderColor: moodStyle.fontColor || '#111',
              boxShadow: `4px 4px 0 ${moodStyle.fontColor || '#111'}` 
            }}
          >
            <moodStyle.Icon className="w-5 h-5" style={{ color: moodStyle.fontColor || '#111' }} />
            {moodStyle.label}
          </div>

          {/* Close X button */}
          <button
            onClick={onClose}
            className="c-btn absolute -top-4 -right-2 w-10 h-10 bg-[#ff6b6b] border-[3px] border-[#111] text-white text-xl font-black transition-transform hover:rotate-90 z-20"
            style={{ borderRadius: "50%" }}
          >
            ×
          </button>

          {/* Header Row */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">balloon author</span>
            <div className="h-[2px] flex-grow bg-gray-100" />
            <span
              onClick={() => triggerAdminStep("name")}
              className="text-xs font-black px-3 py-1 rounded-full border-[2px] border-[#111]"
              style={{ background: "#ffe66d", boxShadow: "2px 2px 0 #111" }}
            >
              {secret.display_name}
            </span>
          </div>

          {/* Secret Message Box - Fixed Height & Scrollable */}
          <div className="relative mt-2">
            <div className="absolute -top-[12px] left-6 w-5 h-5 bg-white border-l-[3px] border-t-[3px] border-[#111] transform rotate-45 z-10" />
            
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="bg-white border-[3px] border-[#111] p-5 rounded-3xl relative z-0 overflow-y-auto custom-scrollbar"
              style={{ 
                boxShadow: "inset 4px 4px 0 rgba(0,0,0,0.05)",
                maxHeight: "30vh", // Prevents overlapping with buttons
                minHeight: "100px"
              }}
            >
              <p
                className="text-[1.8rem] leading-[1.3] font-bold break-words text-[#111]"
                style={{ fontFamily: "var(--font-caveat)" }}
              >
                "{payload.text}"
              </p>
              
              {payload.doodle && (
                <div className="flex justify-center mt-4">
                  <img src={payload.doodle} className="max-h-[150px] w-auto border-[3px] border-[#111] rounded-xl bg-white shadow-[4px_4px_0_#111]" alt="Secret Doodle" />
                </div>
              )}

              {payload.audio && (
                <div className="flex flex-col items-center justify-center mt-4 p-3 bg-[#111] rounded-xl text-white shadow-[4px_4px_0_#55efc4]">
                  <span className="font-black text-xs tracking-widest uppercase mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-[#55efc4] text-[#111] rounded-lg">
                      <Radio className="w-3.5 h-3.5" strokeWidth={3} />
                    </span>
                    Intercepted Transmission
                  </span>
                  <audio controls src={payload.audio} className="w-full h-8" style={{ filter: 'invert(1)' }} />
                </div>
              )}
            </div>
          </div>

          {/* Lower Interaction Section */}
          <div className="flex flex-col gap-4 mt-2">
            
            {/* Voting Bar */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVote("up")}
                  className={`c-btn p-2 rounded-xl transition-all ${voted === 'up' ? 'bg-[#ff9f43] scale-110 shadow-none' : 'bg-white hover:bg-orange-50'}`}
                  style={{ border: "3px solid #111", boxShadow: voted === 'up' ? "none" : "3px 3px 0 #111" }}
                >
                  <ArrowBigUp className={`w-7 h-7 ${voted === 'up' ? 'fill-[#111]' : ''}`} />
                </button>
                
                <div className="px-3 py-1 font-black text-lg border-[3px] border-[#111] rounded-xl bg-white min-w-[3rem] text-center">
                  {voteCount}
                </div>

                <button
                  onClick={() => handleVote("down")}
                  className={`c-btn p-2 rounded-xl transition-all ${voted === 'down' ? 'bg-[#54a0ff] scale-90 shadow-none' : 'bg-white hover:bg-blue-50'}`}
                  style={{ border: "3px solid #111", boxShadow: voted === 'down' ? "none" : "3px 3px 0 #111" }}
                >
                  <ArrowBigDown className={`w-7 h-7 ${voted === 'down' ? 'fill-[#111]' : ''}`} />
                </button>
              </div>

              {secret.has_email && (
                <button
                  onClick={() => setReplyOpen(!replyOpen)}
                  className={`flex items-center gap-2 font-black text-xs uppercase px-4 py-3 rounded-xl border-[3px] border-[#111] transition-all transform ${replyOpen ? 'bg-[#111] text-white scale-95' : 'bg-[#fff] hover:-translate-y-1'}`}
                  style={{ boxShadow: replyOpen ? "none" : "4px 4px 0 #111" }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Reply
                </button>
              )}
            </div>

            {/* Reply Input Form */}
            <AnimatePresence>
              {replyOpen && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex flex-col gap-2"
                  onSubmit={handleReplySubmit}
                >
                  {replySuccess ? (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#55efc4] p-3 rounded-xl border-[3px] border-[#111] text-center font-black text-sm">
                      ✉️ FLYING TO THE SKY!
                    </motion.div>
                  ) : (
                    <>
                      <div className="relative">
                        <textarea
                          placeholder="Say something gentle..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="c-input text-base font-caveat font-bold p-3 bg-[#f8f9fa] border-[#ddd]"
                          style={{ fontSize: "1.25rem", minHeight: "80px" }}
                          rows={2}
                        />
                        {/* Selected GIF Preview */}
                        {selectedGif && (
                          <div className="absolute right-2 bottom-2 relative group">
                            <img src={selectedGif} className="h-20 w-auto rounded-lg border-[2px] border-[#111] shadow-[2px_2px_0_#111]" alt="gif preview" />
                            <button 
                              type="button"
                              onClick={() => setSelectedGif(null)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 border-[2px] border-[#111] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setGifOpen(!gifOpen)}
                          className={`c-btn p-2 rounded-xl transition-all ${gifOpen ? 'bg-[#111] text-white' : 'bg-white hover:bg-gray-100'}`}
                        >
                          <ImageIcon className="w-5 h-5" />
                        </button>
                        <button 
                          type="submit" 
                          disabled={replyLoading || !replyText.trim()}
                          className="c-btn flex-grow py-2 text-sm uppercase font-black bg-[#ffe66d] flex items-center justify-center gap-2"
                        >
                          {replyLoading ? "..." : <><Send className="w-4 h-4" /> Send</>}
                        </button>
                      </div>

                      {/* GIF Search Section */}
                      <AnimatePresence>
                        {gifOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-white border-[3px] border-[#111] rounded-2xl p-3 flex flex-col gap-2 shadow-[inset_4px_4px_0_rgba(0,0,0,0.05)]"
                          >
                            <div className="flex gap-2">
                              <input 
                                placeholder="Search GIFs..."
                                value={gifSearch}
                                onChange={(e) => setGifSearch(e.target.value)}
                                className="c-input text-xs py-1.5 h-auto flex-grow"
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchGifs())}
                              />
                              <button 
                                type="button" 
                                onClick={searchGifs}
                                className="c-btn p-2 bg-yellow-400"
                              >
                                <Search className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                              {gifLoading ? (
                                <div className="col-span-2 text-center py-4 font-black text-xs text-gray-400">Loading magic...</div>
                              ) : gifResults.map((gif: any) => (
                                <img 
                                  key={gif.id}
                                  src={gif.images.fixed_height_small.url}
                                  onClick={() => { setSelectedGif(gif.images.fixed_height.url); setGifOpen(false); }}
                                  className="h-20 w-full object-cover rounded-lg border-[2px] border-transparent hover:border-[#111] cursor-pointer"
                                  alt="gif"
                                />
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {replyError && <span className="text-[10px] font-black text-red-500 uppercase px-1">{replyError}</span>}
                    </>
                  )}
                </motion.form>
              )}
            </AnimatePresence>

          </div>
          {/* Admin Panel */}
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 border-[4px] border-red-500 bg-red-50 p-4 rounded-3xl flex flex-col items-center gap-3 relative overflow-hidden"
              style={{ boxShadow: "6px 6px 0 #ef4444" }}
            >
               <p className="text-red-600 font-black text-sm uppercase flex items-center gap-2">
                 ⚠️ Admin Dangerous Power
               </p>
               <button
                 onClick={handleAdminDelete}
                 disabled={isDeleting}
                 className="c-btn w-full bg-red-500 text-white font-black py-3 uppercase text-lg hover:bg-red-600 transition-colors"
               >
                 {isDeleting ? "POPPING..." : "DELETE THIS BALLOON"}
               </button>
            </motion.div>
          )}

        </div>
          </motion.div>
        ) : (
          <motion.div
            key="explosion"
            initial={{ scale: 0.2, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0, rotate: [0, -15, 15, -10] }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute z-50 pointer-events-none"
          >
             <svg width="200" height="200" viewBox="0 0 200 200">
                <path d="M100,10 L120,70 L190,40 L140,90 L190,140 L120,120 L100,190 L80,120 L10,140 L60,90 L10,40 L80,70 Z" fill="#ff6b6b" stroke="#111" strokeWidth="6" strokeLinejoin="round" />
                <text x="100" y="115" textAnchor="middle" fill="#fff" fontSize="48" fontWeight="900" style={{fontFamily: 'sans-serif'}} stroke="#111" strokeWidth="3">POP!</text>
             </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
