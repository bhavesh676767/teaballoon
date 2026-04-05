"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getRandomName } from "@/lib/utils";
import { classifyMood } from "@/lib/mood";
import { motion, AnimatePresence } from "framer-motion";
import { Type, Mic, Square, Trash2, Wind, Send, Play } from "lucide-react";

// -- Lo-Fi Audio Filter logic: Smoothes instead of distorts --

export function PostSecretBar({ onPosted }: { onPosted: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<"text" | "voice">("text");
  
  // Voice state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Clear data when opened
  useEffect(() => {
    if (open) {
      setMode("text");
      setAudioDataUrl(null);
      setIsRecording(false);
      setCountdown(null);
    }
  }, [open]);

  // -- Walkie-Talkie Audio Filter Logic --
  const isRecordingRef = useRef(false);
  
  const startRecording = async () => {
    try {
      setAudioDataUrl(null);
      isRecordingRef.current = true;
      setIsRecording(true);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isRecordingRef.current) {
        // User stopped before we even got the mic
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);

      // Lo-Fi Soothing profile: High-shelf cut + Low-shelf boost + Compression
      // Warm mid-focus (700Hz - 2500Hz)
      const lpFilter = audioCtx.createBiquadFilter();
      lpFilter.type = "lowpass";
      lpFilter.frequency.value = 2500;
      lpFilter.Q.value = 0.7;

      const hpFilter = audioCtx.createBiquadFilter();
      hpFilter.type = "highpass";
      hpFilter.frequency.value = 200;

      // Smoothe out the peaks for "ear soothing" feel
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      const destination = audioCtx.createMediaStreamDestination();

      // Chain: Source -> HP -> LP -> Compressor -> Destination
      source.connect(hpFilter);
      hpFilter.connect(lpFilter);
      lpFilter.connect(compressor);
      compressor.connect(destination);

      // Use a common fallback mime type if webm isn't available
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(destination.stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          if (reader.result) setAudioDataUrl(reader.result as string);
        };
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
        audioCtx.close();
      };

      mediaRecorderRef.current = recorder;
      
      let count = 3;
      setCountdown(count);
      
      const int = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
        } else {
          clearInterval(int);
          setCountdown(null);
          recorder.start(200); // Actually start recording only after countdown
          setIsRecording(true);
        }
      }, 850); // Snappy countdown

    } catch (err) {
      console.error("Mic error:", err);
      setError("Please allow microphone access to record.");
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setCountdown(null);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const deleteRecording = () => {
    setAudioDataUrl(null);
    audioChunksRef.current = [];
    if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
    }
    setIsPlayingPreview(false);
  };

  const playPreview = () => {
    if (!audioDataUrl) return;
    if (isPlayingPreview && audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
      return;
    }
    const audio = new Audio(audioDataUrl);
    audioPreviewRef.current = audio;
    audio.onended = () => setIsPlayingPreview(false);
    audio.play();
    setIsPlayingPreview(true);
  };

  // Simple real-time email validator
  const isValidEmail = (str: string) => {
    if (!str) return true; // allowed to be empty
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  };
  
  const isEmailValidNow = isValidEmail(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsg = message.trim();
    
    // We allow submission if they have typed text OR recorded audio.
    const hasContent = cleanMsg || audioDataUrl;
    
    if (!hasContent) {
      setError("Please write or record something first!");
      return;
    }
    const currentWordCount = cleanMsg ? cleanMsg.split(/\s+/).length : 0;
    
    if (currentWordCount > 1000) {
      setError("Max limit is 1000 words.");
      return;
    }
    
    const cleanEmail = email.trim();
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      setError("Double check your email format.");
      return;
    }

    setLoading(true);
    setError("");

    const classifiedMood = classifyMood(cleanMsg);
    const finalName = name.trim() || getRandomName();
    const wordCount = currentWordCount;

    try {
      const isVoice = !!audioDataUrl; // if we have audio, it's a voice balloon
      // Use clean message if available, otherwise voice fallback
      const displayText = cleanMsg || (isVoice ? "📻 [Voice Transmission]" : "🎈 [Empty Balloon]");

      const payloadString = JSON.stringify({
         text: displayText,
         vessel: "balloon",
         doodle: null,
         audio: audioDataUrl
      });

      const res = await fetch("/api/post_secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: payloadString,
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
    setMode("text");
    setAudioDataUrl(null);
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
            <span className="flex items-center gap-2"><Wind className="w-5 h-5" /> Balloon released!</span>
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
              <span className="font-black uppercase tracking-widest text-[#111]">Release a Secret</span>
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

            <div className="flex gap-2">
              {/* Text Mode */}
              <button
                type="button"
                onClick={() => setMode("text")}
                className={`flex-1 c-btn flex items-center justify-center gap-2 py-2.5 transition-all text-sm font-black ${
                  mode === 'text'
                    ? 'bg-[#ffe66d] text-[#111] scale-[1.03]'
                    : 'bg-white text-gray-400 hover:text-[#111]'
                }`}
                title="Write Text"
              >
                <Type className="w-5 h-5" strokeWidth={2.8} />
                <span className="uppercase tracking-wide text-xs">Write</span>
                {audioDataUrl && (
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#ff6b6b] border-[2px] border-[#111] rounded-full" />
                )}
              </button>
              
              {/* Voice Mode */}
              <button
                type="button"
                onClick={() => setMode("voice")}
                className={`flex-1 c-btn flex items-center justify-center gap-2 py-2.5 transition-all text-sm font-black ${
                  mode === 'voice'
                    ? 'bg-[#ff6b6b] text-white scale-[1.03]'
                    : 'bg-white text-gray-400 hover:text-[#111]'
                }`}
                title="Voice Whisper"
              >
                <Mic className="w-5 h-5" strokeWidth={2.8} />
                <span className="uppercase tracking-wide text-xs">Voice</span>
              </button>
            </div>

            {/* Input Areas */}
            <div className="flex flex-col gap-3">
              {/* Always show text area */}
              <textarea
                placeholder="What's your secret? ✍️"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
                maxLength={20000}
                rows={3}
                className="c-input resize-none text-base font-caveat font-bold leading-tight w-full block"
                style={{ fontSize: "1.25rem" }}
              />
            
              {/* Show Voice Recorder in Voice Mode */}
              <div className={`w-full h-[100px] flex flex-col items-center justify-center border-[3px] border-[#111] rounded-xl bg-[#fffef5] relative overflow-hidden ${mode === "voice" ? "block" : "hidden"}`}>
                 {!audioDataUrl ? (
                   <button
                     type="button"
                     onClick={toggleRecording}
                     disabled={countdown !== null}
                     className={`flex flex-col items-center justify-center w-full h-full select-none touch-none transition-all ${countdown !== null ? 'bg-orange-400 text-white shadow-inner scale-95 cursor-not-allowed' : isRecording ? 'bg-[#ff6b6b] text-white shadow-inner scale-95' : 'hover:bg-gray-100 text-[#111]'}`}
                   >
                     {countdown !== null ? (
                       <span className="font-black text-4xl mb-1">{countdown}</span>
                     ) : isRecording ? (
                       <Square className="w-8 h-8 mb-1 animate-pulse" />
                     ) : (
                       <Mic className="w-8 h-8 mb-1" />
                     )}
                     <span className="font-black tracking-widest text-xs uppercase">{countdown !== null ? "Starting..." : isRecording ? "Recording... (Tap to Stop)" : "Tap to Record (Lo-Fi Whisper)"}</span>
                   </button>
                 ) : (
                   <div className="flex flex-col items-center justify-center w-full h-full bg-[#55efc4] text-[#111] overflow-hidden">
                     <button
                       type="button"
                       onClick={playPreview}
                       className="flex flex-col items-center justify-center w-full h-full hover:bg-[#48d8b0] transition-colors"
                     >
                       {isPlayingPreview ? (
                         <Square className="w-8 h-8 mb-1 fill-[#111]" />
                       ) : (
                         <Play className="w-8 h-8 mb-1 fill-[#111]" />
                       )}
                       <span className="font-black tracking-widest text-[10px] uppercase">
                         {isPlayingPreview ? "Playing..." : "Tap to Preview"}
                       </span>
                     </button>
                     <button type="button" onClick={deleteRecording} className="absolute top-2 right-2 bg-white p-1 border-[2px] border-[#111] rounded-lg hover:bg-red-500 hover:text-white transition-all z-10">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 )}
               </div>
            </div>
            
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
                {mode === "text" ? `${message.trim() ? message.trim().split(/\s+/).length : 0}/1000 words` : "Voice"}
              </span>
              <button
                type="submit"
                disabled={loading || (!message.trim() && !audioDataUrl) || (!isEmailValidNow && email.length > 0)}
                className="c-btn px-6 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#ffe66d" }}
              >
                {loading ? (
                  <span className="flex items-center gap-2"><Mic className="w-4 h-4 animate-pulse" /> Sending...</span>
                ) : (
                  <span className="flex items-center gap-2 font-black text-sm"><Send className="w-4 h-4" strokeWidth={3} /> RELEASE</span>
                )}
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
            <span className="relative z-10 flex items-center gap-3 font-black text-base">
              <span className="w-8 h-8 flex items-center justify-center bg-[#111] text-[#4ecdc4] rounded-xl border-[2.5px] border-[#111]">
                <Type className="w-4 h-4" strokeWidth={3} />
              </span>
              RELEASE A SECRET
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
