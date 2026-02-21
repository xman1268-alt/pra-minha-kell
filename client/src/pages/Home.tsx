import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Disc } from "lucide-react";

const TIME_OPTIONS = [
  { label: "15 seconds", value: 15 },
  { label: "30 seconds", value: 30 },
  { label: "1 minute", value: 60 },
  { label: "∞", value: 0 },
];

const COUNT_OPTIONS = [
  { label: "15", value: 15 },
  { label: "30", value: 30 },
  { label: "60", value: 60 },
  { label: "∞", value: 9999 },
];

export default function Home() {
  const [playlistInput, setPlaylistInput] = useState("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [songCount, setSongCount] = useState(15);
  const [pressing, setPressing] = useState(false);
  const [, setLocation] = useLocation();

  const unlockAudioContext = () => {
    // Safari requires user gesture to unlock AudioContext before any audio can play
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        ctx.resume().then(() => ctx.close());
      }
    } catch (_) {}
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistInput.trim()) return;
    unlockAudioContext();
    let playlistId = playlistInput.trim();
    try {
      const url = new URL(playlistInput);
      const listParam = url.searchParams.get("list");
      if (listParam) playlistId = listParam;
    } catch { /* already an ID */ }
    setLocation(`/game/${playlistId}?time=${timeLimit}&count=${songCount}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #fff 0%, #fff0f7 100%)" }}>

      {/* Blobs */}
      <motion.div
        animate={{ x: [0, 20, 0], y: [0, 15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-24 -left-20 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,182,213,0.38) 0%, transparent 70%)" }}
      />
      <motion.div
        animate={{ x: [0, -20, 0], y: [0, -15, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-20 -right-16 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(216,180,254,0.28) 0%, transparent 70%)" }}
      />

      {/* 상단 장식선 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-12"
        style={{ background: "linear-gradient(to bottom, transparent, #f9a8cc)" }} />

      <div className="max-w-xl w-full z-10 space-y-6">

        {/* ── 헤더 ── */}
        <div className="text-center flex flex-col items-center gap-4">

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs tracking-[4px] uppercase"
            style={{ color: "#d48fb0", fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
            ♪ playlist quiz ♪
          </motion.p>

          {/* 바이닐 */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="w-28 h-28 rounded-full relative flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #b06ce0 0%, #e040a0 40%, #7c3aed 75%, #c026a0 100%)",
                boxShadow: "0 8px 32px rgba(180,100,220,0.30), 0 2px 8px rgba(233,30,140,0.15)",
              }}>
              {/* 홈 패턴 */}
              <div className="absolute inset-0 rounded-full"
                style={{
                  background: "repeating-radial-gradient(circle at 50%, transparent 0px, transparent 6px, rgba(255,255,255,0.06) 6px, rgba(255,255,255,0.06) 7px)"
                }} />
              {/* 하이라이트 */}
              <div className="absolute rounded-full"
                style={{
                  width: 44, height: 44, top: 14, left: 16,
                  background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.38) 0%, transparent 60%)"
                }} />
              {/* 센터 */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center z-10 relative"
                style={{ background: "#fff5f9", boxShadow: "0 0 0 2px rgba(255,255,255,0.5)" }}>
                <div className="w-2 h-2 rounded-full"
                  style={{ background: "linear-gradient(135deg, #e040a0, #7c3aed)" }} />
              </div>
            </motion.div>
          </motion.div>

          {/* 제목 */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-5xl font-black whitespace-nowrap"
            style={{
              fontFamily: "'Playfair Display', serif",
              background: "linear-gradient(135deg, #b5395f 0%, #7c3aed 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
            Guess the Music
          </motion.h1>

          {/* 뱃지 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs tracking-widest uppercase font-medium"
            style={{
              background: "rgba(255,182,213,0.22)",
              border: "1px solid rgba(244,143,177,0.35)",
              color: "#c2185b",
            }}>
            🎵 choose · listen · score
          </motion.div>

          {/* 헌정 문구 */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs italic tracking-[3px] whitespace-nowrap"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "#d4a0bc",
              borderTop: "1px solid #fce4f0",
              paddingTop: 10,
              textAlign: "center",
            }}>
            ✦ Para o meu eterno amor Rakell ✦
          </motion.p>
        </div>

        {/* ── 설정 카드 ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl p-6 shadow-xl space-y-5"
          style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", border: "1px solid #fce4f0" }}>
          <form onSubmit={handleStart} className="space-y-5">

            {/* Playlist URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: "#e91e8c" }}>
                Playlist URL
              </label>
              <div className="relative">
                <Disc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#f9a8cc" }} />
                <input
                  value={playlistInput}
                  onChange={(e) => setPlaylistInput(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=..."
                  className="w-full pl-9 py-3 pr-4 rounded-2xl text-sm text-gray-700 focus:outline-none transition-all"
                  style={{
                    border: "2px solid #fce4f0",
                    background: "rgba(255,255,255,0.7)",
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = "#f48fb1"}
                  onBlur={e => e.currentTarget.style.borderColor = "#fce4f0"}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: "💖 Rakell's Favorite", id: "PLhXBj2Th3Eq4xDKmZWTLnCtCJY-iRIWT5" },
                  { label: "🖤 Billie Eilish", id: "PL7LcngJfCRUE37E25pKTSPvVDYYvES3N9" },
                  { label: "🎤 Fifth Harmony", id: "PLxsMKpWb6s1Gx3VScWjLXp1UFEQug7rvz" },
                  { label: "🎸 Cazuza", id: "PLvgcQr40gK92Xtz-Tfkl9HJwKHU6UW4wF" },
                  { label: "🌟 Ana Vitória", id: "PLN34cZGhF86aSwZqHlVw7lOCLCiEwgmPv" },
                  { label: "🎶 Djavan", id: "PL-jLSD1zyBYt7ykqJIHwxnG6A20IWeHW3" },
                ].map(({ label, id }) => (
                  <button key={id} type="button" onClick={() => setPlaylistInput(id)}
                    className="text-xs px-3 py-1.5 rounded-full transition-all"
                    style={{ background: "#fff0f6", border: "1px solid #f9c5d9", color: "#c2185b" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Limit */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: "#e91e8c" }}>
                Time Limit
              </label>
              <div className="flex gap-2">
                {TIME_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setTimeLimit(opt.value)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={timeLimit === opt.value
                      ? { background: "linear-gradient(135deg, #e91e8c, #9c27b0)", color: "white", border: "2px solid transparent", boxShadow: "0 4px 12px rgba(233,30,140,0.25)" }
                      : { background: "white", color: "#d48fb0", border: "2px solid #fce4f0" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Songs */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider ml-1" style={{ color: "#e91e8c" }}>
                Songs
              </label>
              <div className="flex gap-2">
                {COUNT_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setSongCount(opt.value)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={songCount === opt.value
                      ? { background: "linear-gradient(135deg, #e91e8c, #9c27b0)", color: "white", border: "2px solid transparent", boxShadow: "0 4px 12px rgba(233,30,140,0.25)" }
                      : { background: "white", color: "#d48fb0", border: "2px solid #fce4f0" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Start button */}
            <motion.button
              type="submit"
              disabled={!playlistInput.trim()}
              onMouseDown={() => setPressing(true)}
              onMouseUp={() => setPressing(false)}
              onMouseLeave={() => setPressing(false)}
              onTouchStart={() => setPressing(true)}
              onTouchEnd={() => setPressing(false)}
              animate={{ scale: pressing ? 0.95 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="w-full py-4 rounded-2xl font-semibold text-white text-base disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #e91e8c, #7c3aed)",
                boxShadow: "0 8px 24px rgba(233,30,140,0.28)",
              }}>
              ▶ Start Game
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
