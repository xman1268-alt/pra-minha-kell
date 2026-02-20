import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import confetti from "canvas-confetti";
import { usePlaylist, useSubmitGame, useLeaderboard } from "@/hooks/use-game";
import { PinkButton } from "@/components/PinkButton";
import { PinkCard } from "@/components/PinkCard";
import { Waveform } from "@/components/Waveform";
import { FloatingNotes } from "@/components/FloatingNotes";
import { Play, Pause, SkipForward, Trophy, RotateCcw, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Game } from "../../../shared/schema";

// ── Fuzzy matching (from Replit) ─────────────────────────
function isCorrectGuess(guess: string, answer: string): boolean {
  const normalize = (str: string) =>
    str.toLowerCase()
       .replace(/[^a-z0-9]/g, "")
       .replace(/officialvideo/g, "")
       .replace(/lyrics/g, "")
       .replace(/mv/g, "");
  const normGuess = normalize(guess);
  const normAnswer = normalize(answer);
  if (normGuess.length < 3) return false;
  return normAnswer.includes(normGuess);
}

const TOTAL_ROUNDS = 5;

// ── Main Game Component ───────────────────────────────────
export default function Game() {
  const [match, params] = useRoute("/game/:id");
  const playlistId = params?.id || null;
  const [, setLocation] = useLocation();

  const { data: playlist, isLoading, error } = usePlaylist(playlistId);
  const submitGame = useSubmitGame();

  const [gameState, setGameState] = useState<"loading" | "playing" | "roundEnd" | "gameOver">("loading");
  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(0);
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
  const [userGuess, setUserGuess] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playedSongIndices, setPlayedSongIndices] = useState<Set<number>>(new Set());

  const playerRef = useRef<YouTubePlayer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (playlist && gameState === "loading") {
      startRound();
    }
  }, [playlist, gameState]);

  const startRound = () => {
    if (!playlist) return;
    let nextIndex: number;
    let attempts = 0;
    do {
      nextIndex = Math.floor(Math.random() * playlist.songs.length);
      attempts++;
    } while (playedSongIndices.has(nextIndex) && attempts < 100);

    setCurrentSongIndex(nextIndex);
    setPlayedSongIndices(prev => new Set(prev).add(nextIndex));
    setGameState("playing");
    setUserGuess("");
    setIsPlaying(true);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handlePlayerReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    playerRef.current.setVolume(60);
    if (gameState === "playing") playerRef.current.playVideo();
  };

  const handleStateChange = (event: YouTubeEvent) => {
    setIsPlaying(event.data === YouTube.PlayerState.PLAYING);
  };

  const submitGuess = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!playlist || currentSongIndex === null) return;
    const currentSong = playlist.songs[currentSongIndex];
    const isCorrect = isCorrectGuess(userGuess, currentSong.title);
    if (isCorrect) {
      setScore(prev => prev + 100);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#e91e8c", "#9c27b0", "#f8bbd9", "#ff80ab"],
      });
    }
    setGameState("roundEnd");
  };

  const nextRound = () => {
    if (currentRound >= TOTAL_ROUNDS) {
      setGameState("gameOver");
    } else {
      setCurrentRound(prev => prev + 1);
      startRound();
    }
  };

  const handleGameOverSubmit = () => {
    if (!playlistId || !playerName.trim()) return;
    submitGame.mutate({
      playerName: playerName.trim(),
      playlistId,
      score,
      totalQuestions: TOTAL_ROUNDS,
    });
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FloatingNotes />
        <div className="flex flex-col items-center gap-6 z-10">
          {/* Spinning vinyl */}
          <div className="w-28 h-28 rounded-full relative vinyl-spin shadow-2xl shadow-pink-400/40"
            style={{ background: "conic-gradient(from 0deg, #1a0a12, #3d1a2e 25%, #1a0a12 50%, #3d1a2e 75%, #1a0a12)" }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-200 to-pink-500" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-white" />
            </div>
          </div>
          <p className="text-pink-400 font-['Playfair_Display'] text-xl animate-pulse">
            Loading your playlist...
          </p>
          <p className="text-pink-300/60 text-sm">Preparing the music 💖</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !playlist) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <FloatingNotes />
        <PinkCard className="max-w-md w-full text-center z-10">
          <h2 className="text-2xl font-['Playfair_Display'] font-bold text-pink-500 mb-2">
            Oops! 💔
          </h2>
          <p className="text-gray-500 mb-6">
            {(error as Error)?.message || "Could not load playlist. Make sure it's public."}
          </p>
          <PinkButton onClick={() => setLocation("/")} variant="outline">
            <Home className="w-4 h-4" /> Back Home
          </PinkButton>
        </PinkCard>
      </div>
    );
  }

  const currentSong = currentSongIndex !== null ? playlist.songs[currentSongIndex] : null;

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 relative overflow-hidden">
      <FloatingNotes />

      {/* Top bar */}
      <div className="flex justify-between items-center max-w-3xl mx-auto w-full z-10 mb-8">
        <button
          onClick={() => setLocation("/")}
          className="p-2 hover:bg-pink-100 rounded-full transition-colors text-pink-400"
        >
          <Home className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-pink-300 uppercase tracking-widest font-semibold">Score</p>
            <p className="text-2xl font-['Playfair_Display'] font-bold gradient-text">{score}</p>
          </div>
          <div className="w-px h-10 bg-pink-200" />
          <div className="text-center">
            <p className="text-xs text-pink-300 uppercase tracking-widest font-semibold">Round</p>
            <p className="text-2xl font-['Playfair_Display'] font-bold text-purple-500">
              {currentRound}/{TOTAL_ROUNDS}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center z-10 gap-6">

        {/* ── Playing State ── */}
        <AnimatePresence mode="wait">
          {gameState === "playing" && currentSong && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PinkCard>
                <div className="flex flex-col items-center gap-6 py-4">

                  {/* Hidden YouTube player */}
                  <div className="w-0 h-0 overflow-hidden opacity-0 pointer-events-none absolute">
                    <YouTube
                      videoId={currentSong.id}
                      opts={{ height: "0", width: "0", playerVars: { autoplay: 1, controls: 0, disablekb: 1 } }}
                      onReady={handlePlayerReady}
                      onStateChange={handleStateChange}
                    />
                  </div>

                  {/* Vinyl + waveform */}
                  <div className="w-full max-w-sm aspect-video bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl flex flex-col items-center justify-center border border-pink-100 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-200/20 to-purple-200/20" />

                    {/* Vinyl record */}
                    <div
                      className={cn(
                        "w-32 h-32 rounded-full shadow-2xl shadow-pink-300/40 relative mb-4",
                        isPlaying ? "vinyl-spin" : "vinyl-spin-paused"
                      )}
                      style={{ background: "conic-gradient(from 0deg, #1a0a12, #3d1a2e 20%, #1a0a12 40%, #3d1a2e 60%, #1a0a12)" }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-300 to-purple-500" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-white" />
                      </div>
                    </div>

                    <div className="absolute bottom-4 w-full flex justify-center">
                      <Waveform isPlaying={isPlaying} />
                    </div>
                  </div>

                  {/* Play/Pause */}
                  <div className="flex items-center gap-3">
                    <PinkButton
                      variant="outline"
                      size="sm"
                      onClick={() => isPlaying ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo()}
                      className="rounded-full w-12 h-12 p-0"
                    >
                      {isPlaying
                        ? <Pause className="w-5 h-5" />
                        : <Play className="w-5 h-5 ml-0.5" />}
                    </PinkButton>
                  </div>

                  <p className="text-pink-400/70 font-['Playfair_Display'] italic text-sm">
                    Listen carefully and guess the song title... 🎵
                  </p>

                  {/* Guess form */}
                  <form onSubmit={submitGuess} className="w-full max-w-lg space-y-4">
                    <input
                      ref={inputRef}
                      value={userGuess}
                      onChange={(e) => setUserGuess(e.target.value)}
                      placeholder="Type the song title..."
                      className="w-full h-14 px-6 text-center text-lg rounded-2xl border-2 border-pink-200 bg-white/60 text-gray-700 placeholder:text-pink-200 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all"
                      autoComplete="off"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <PinkButton
                        type="button"
                        variant="outline"
                        onClick={() => setGameState("roundEnd")}
                      >
                        Skip
                      </PinkButton>
                      <PinkButton type="submit" disabled={!userGuess.trim()}>
                        Submit Guess
                      </PinkButton>
                    </div>
                  </form>
                </div>
              </PinkCard>
            </motion.div>
          )}

          {/* ── Round End ── */}
          {gameState === "roundEnd" && currentSong && (
            <motion.div
              key="roundEnd"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <PinkCard className="text-center py-8">
                {/* Album art */}
                <div className="w-full max-w-md mx-auto aspect-video rounded-2xl overflow-hidden shadow-xl border border-pink-100 relative mb-6">
                  <img
                    src={currentSong.thumbnail}
                    alt="Album thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-5">
                    <h3 className="text-lg font-bold text-white text-left line-clamp-2">
                      {currentSong.title}
                    </h3>
                  </div>
                </div>

                {/* Result */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="text-5xl mb-3"
                >
                  {isCorrectGuess(userGuess, currentSong.title) ? "🎉" : "💔"}
                </motion.div>

                <h2 className={cn(
                  "text-3xl font-['Playfair_Display'] font-bold mb-2",
                  isCorrectGuess(userGuess, currentSong.title)
                    ? "gradient-text"
                    : "text-gray-400"
                )}>
                  {isCorrectGuess(userGuess, currentSong.title) ? "Correct! 🌸" : "Not quite... 💕"}
                </h2>

                {isCorrectGuess(userGuess, currentSong.title) && (
                  <p className="text-purple-400 font-semibold mb-4">+100 Points</p>
                )}

                <PinkButton onClick={nextRound} size="lg" className="mx-auto mt-4">
                  {currentRound >= TOTAL_ROUNDS ? "Finish Game" : "Next Round"}
                  <SkipForward className="w-5 h-5" />
                </PinkButton>
              </PinkCard>
            </motion.div>
          )}

          {/* ── Game Over ── */}
          {gameState === "gameOver" && (
            <motion.div
              key="gameOver"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GameOverView
                score={score}
                totalRounds={TOTAL_ROUNDS}
                playlistId={playlistId}
                playerName={playerName}
                setPlayerName={setPlayerName}
                onSubmit={handleGameOverSubmit}
                isSubmitting={submitGame.isPending}
                isSubmitted={submitGame.isSuccess}
                onReplay={() => window.location.reload()}
                onHome={() => setLocation("/")}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

// ── Game Over View ────────────────────────────────────────
function GameOverView({
  score, totalRounds, playlistId, playerName, setPlayerName,
  onSubmit, isSubmitting, isSubmitted, onReplay, onHome
}: {
  score: number;
  totalRounds: number;
  playlistId: string | null;
  playerName: string;
  setPlayerName: (v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isSubmitted: boolean;
  onReplay: () => void;
  onHome: () => void;
}) {
  const { data: leaderboard } = useLeaderboard(playlistId);
  const pct = Math.round((score / (totalRounds * 100)) * 100);

  const getMessage = () => {
    if (pct >= 80) return { title: "Music Maestro! 🏆", msg: "You know your music inside out!" };
    if (pct >= 60) return { title: "Playlist Pro! 🌟", msg: "Great ear for music — impressive!" };
    if (pct >= 40) return { title: "Getting There! 🎵", msg: "Keep listening and you'll ace it!" };
    return { title: "Keep Discovering! 🌱", msg: "Music is a journey — keep exploring!" };
  };
  const { title, msg } = getMessage();

  return (
    <PinkCard className="max-w-2xl mx-auto">
      <div className="text-center space-y-6">

        {/* Score circle */}
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 150 }}
          className="w-40 h-40 rounded-full mx-auto flex flex-col items-center justify-center
            bg-gradient-to-br from-[#e91e8c] to-[#9c27b0]
            shadow-[0_12px_40px_rgba(233,30,140,0.4)]"
        >
          <span className="text-4xl font-['Playfair_Display'] font-black text-white">{score}</span>
          <span className="text-xs text-white/70 uppercase tracking-widest">points</span>
        </motion.div>

        <div>
          <h2 className="text-3xl font-['Playfair_Display'] font-bold gradient-text">{title}</h2>
          <p className="text-gray-400 mt-1">{msg}</p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-4">
          {[
            { label: "Score", value: score },
            { label: "Rounds", value: totalRounds },
            { label: "Accuracy", value: `${pct}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-pink-50 rounded-2xl px-6 py-4 min-w-[90px]">
              <span className="block text-2xl font-['Playfair_Display'] font-bold text-pink-500">{value}</span>
              <span className="text-xs text-pink-300 uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>

        {/* Save to leaderboard */}
        {!isSubmitted ? (
          <div className="max-w-sm mx-auto space-y-3 p-6 bg-pink-50 rounded-2xl border border-pink-100">
            <h3 className="font-semibold text-pink-500">Save to Leaderboard</h3>
            <input
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={15}
              className="w-full px-4 py-3 rounded-xl border-2 border-pink-200 bg-white text-center text-gray-700 focus:outline-none focus:border-pink-400 transition-all"
            />
            <PinkButton
              onClick={onSubmit}
              isLoading={isSubmitting}
              disabled={!playerName.trim()}
              className="w-full"
            >
              Submit Score
            </PinkButton>
          </div>
        ) : (
          <div className="py-3 px-6 bg-green-50 border border-green-200 rounded-xl text-green-600 font-medium">
            ✅ Score submitted successfully!
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard && leaderboard.length > 0 && (
          <div className="text-left">
            <h3 className="text-lg font-['Playfair_Display'] font-bold text-pink-500 mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" /> Leaderboard
            </h3>
            <div className="rounded-2xl overflow-hidden border border-pink-100 bg-pink-50/50">
              {leaderboard.slice(0, 5).map((entry: Game, i: number) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center px-4 py-3 border-b border-pink-100 last:border-0 hover:bg-pink-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold",
                      i === 0 ? "bg-yellow-100 text-yellow-600" :
                      i === 1 ? "bg-gray-100 text-gray-500" :
                      i === 2 ? "bg-orange-100 text-orange-600" : "bg-pink-100 text-pink-400"
                    )}>
                      {i + 1}
                    </span>
                    <span className="font-medium text-gray-700">{entry.playerName}</span>
                  </div>
                  <span className="font-mono font-bold text-pink-500">{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-center gap-4 pt-2">
          <PinkButton variant="outline" onClick={onHome}>
            <Home className="w-4 h-4" /> Home
          </PinkButton>
          <PinkButton onClick={onReplay}>
            <RotateCcw className="w-4 h-4" /> Play Again
          </PinkButton>
        </div>

      </div>
    </PinkCard>
  );
}
