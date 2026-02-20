import { useState } from "react";
import { useLocation } from "wouter";
import { PinkButton } from "@/components/PinkButton";
import { PinkCard } from "@/components/PinkCard";
import { FloatingNotes } from "@/components/FloatingNotes";
import { Play, Disc } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [playlistInput, setPlaylistInput] = useState("");
  const [, setLocation] = useLocation();

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistInput.trim()) return;

    let playlistId = playlistInput.trim();
    try {
      const url = new URL(playlistInput);
      const listParam = url.searchParams.get("list");
      if (listParam) playlistId = listParam;
    } catch {
      // already an ID
    }

    setLocation(`/game/${playlistId}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingNotes />

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-24 w-96 h-96 bg-pink-300/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-300/20 rounded-full blur-[100px]"
        />
      </div>

      <div className="max-w-2xl w-full z-10 space-y-8">

        {/* Dedication */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center text-xs text-pink-300/70 font-['Playfair_Display'] italic tracking-widest"
        >
          ✦ Para o meu eterno amor Rakell ✦
        </motion.p>

        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-24 h-24 mx-auto flex items-center justify-center mb-4 relative"
          >
            {/* Vinyl disc */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center shadow-2xl vinyl-spin relative">
              <div className="absolute inset-0 rounded-full"
                style={{ background: "conic-gradient(from 0deg, #1a0a12, #3d1a2e 20%, #1a0a12 40%, #3d1a2e 60%, #1a0a12)" }}
              />
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-pink-600 z-10" />
              <div className="absolute w-3 h-3 rounded-full bg-white z-20" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-['Playfair_Display'] font-bold tracking-tight"
          >
            <span className="gradient-text animate-pulse-slow">Music Playlist</span>
            <br />
            <span className="text-gray-700">Quiz</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-pink-400/80 font-light"
          >
            Guess the title of your favorite music playlist 🎵✨💖
          </motion.p>
        </div>

        {/* Input card */}
        <PinkCard delay={0.4} className="border-t-4 border-t-pink-400/50">
          <form onSubmit={handleStart} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-pink-500 uppercase tracking-wider ml-1">
                Enter YouTube Playlist URL
              </label>
              <div className="relative group">
                <Disc className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-300 w-5 h-5 group-focus-within:text-pink-500 transition-colors" />
                <input
                  value={playlistInput}
                  onChange={(e) => setPlaylistInput(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=..."
                  className="w-full pl-12 py-4 pr-4 rounded-2xl border-2 border-pink-100 bg-white/50 text-base text-gray-700 placeholder:text-pink-200 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all"
                />
              </div>
            </div>

            <PinkButton
              type="submit"
              size="lg"
              className="w-full"
              disabled={!playlistInput.trim()}
            >
              Start Game
              <Play className="w-5 h-5 fill-current" />
            </PinkButton>
          </form>

          {/* Sample playlists */}
          <div className="mt-8 pt-6 border-t border-pink-100 text-center">
            <p className="text-sm text-pink-300 mb-4">Or try these popular playlists:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: "🌸 Kpop Girl Groups", id: "PLsZGP5aXGLFSPFJFNe_jmyK7eRl7HHpRO" },
                { label: "💃 Fifth Harmony", id: "PLKAmMfSd7P4lPTG9ZuiI5RgWECl0kMgTZ" },
                { label: "🖤 Billie Eilish", id: "PLop28K3JGxM0XzqRFQ8Zf3MqXm0QN2oYO" },
                { label: "🇧🇷 MPB", id: "PLxOmTyb0FAY9Y_RgjNkHzDrSlKtXKvj4F" },
              ].map(({ label, id }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlaylistInput(id)}
                  className="text-xs px-4 py-2 rounded-full bg-pink-50 hover:bg-pink-100 border border-pink-200 hover:border-pink-400 text-pink-500 transition-all hover:-translate-y-0.5"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </PinkCard>

      </div>
    </div>
  );
}
