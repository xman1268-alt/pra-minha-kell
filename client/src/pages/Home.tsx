import { useState } from "react";
import { useLocation } from "wouter";
import { FloatingNotes } from "@/components/FloatingNotes";
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

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistInput.trim()) return;
    let playlistId = playlistInput.trim();
    try {
      const url = new URL(playlistInput);
      const listParam = url.searchParams.get("list");
      if (listParam) playlistId = listParam;
    } catch { /* already an ID */ }
    setLocation(`/game/${playlistId}?time=${timeLimit}&count=${songCount}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingNotes />
      <div className="absolute inset-0 pointer-events-none">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-24 w-96 h-96 bg-pink-300/20 rounded-full blur-[100px]" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-300/20 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-xl w-full z-10 space-y-5">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center text-xs text-pink-300/70 font-['Playfair_Display'] italic tracking-widest">
          ✦ Para o meu eterno amor Rakell ✦
        </motion.p>

        <div className="text-center space-y-2">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-16 h-16 mx-auto">
            <div className="w-16 h-16 rounded-full shadow-2xl vinyl-spin relative flex items-center justify-center"
              style={{ background: "conic-gradient(from 0deg, #1a0a12, #3d1a2e 20%, #1a0a12 40%, #3d1a2e 60%, #1a0a12)" }}>
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-300 to-pink-600 z-10 relative" />
              <div className="absolute w-2 h-2 rounded-full bg-white" />
            </div>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-['Playfair_Display'] font-bold">
            <span className="gradient-text">Guess the title</span>
          </motion.h1>
          <p className="text-gray-500 text-sm">of your favorite music playlist 🎵✨</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-pink-100 space-y-5">
          <form onSubmit={handleStart} className="space-y-5">

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-pink-500 uppercase tracking-wider ml-1">Playlist URL</label>
              <div className="relative">
                <Disc className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-300 w-4 h-4" />
                <input value={playlistInput} onChange={(e) => setPlaylistInput(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=..."
                  className="w-full pl-9 py-3 pr-4 rounded-2xl border-2 border-pink-100 bg-white/60 text-sm text-gray-700 placeholder:text-pink-200 focus:outline-none focus:border-pink-400 transition-all" />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { label: "💖 Rakell's Favorite", id: "PLhXBj2Th3Eq4xDKmZWTLnCtCJY-iRIWT5" },
                ].map(({ label, id }) => (
                  <button key={id} type="button" onClick={() => setPlaylistInput(id)}
                    className="text-xs px-3 py-1.5 rounded-full bg-pink-50 hover:bg-pink-100 border border-pink-200 hover:border-pink-400 text-pink-500 transition-all">
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-pink-500 uppercase tracking-wider ml-1">Time Limit</label>
              <div className="flex gap-2">
                {TIME_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setTimeLimit(opt.value)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                      timeLimit === opt.value
                        ? "bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-200"
                        : "bg-white text-pink-400 border-pink-100 hover:border-pink-300"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-pink-500 uppercase tracking-wider ml-1">Songs</label>
              <div className="flex gap-2">
                {COUNT_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setSongCount(opt.value)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                      songCount === opt.value
                        ? "bg-pink-500 text-white border-pink-500 shadow-md shadow-pink-200"
                        : "bg-white text-pink-400 border-pink-100 hover:border-pink-300"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

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
              className="w-full py-4 rounded-2xl font-semibold text-white text-base bg-gradient-to-r from-pink-500 to-purple-500 shadow-lg shadow-pink-200 hover:shadow-pink-300 disabled:opacity-40 disabled:cursor-not-allowed transition-shadow flex items-center justify-center gap-2">
              ▶ Start Game
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
