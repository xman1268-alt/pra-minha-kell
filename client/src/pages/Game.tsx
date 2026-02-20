import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import confetti from "canvas-confetti";
import { usePlaylist, useSubmitGame, useLeaderboard } from "@/hooks/use-game";
import { FloatingNotes } from "@/components/FloatingNotes";
import { Waveform } from "@/components/Waveform";
import { motion, AnimatePresence } from "framer-motion";
import { Home, SkipForward, Trophy, RotateCcw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Game } from "../../../shared/schema";
import type { PlaylistSong } from "../../../shared/schema";

// ── Fuzzy matching ─────────────────────────
function isCorrectGuess(guess: string, answer: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/officialvideo|lyrics|mv/g, "");
  const g = normalize(guess);
  const a = normalize(answer);
  if (g.length < 2) return false;
  return a.includes(g) || g.includes(a);
}

// ── Build 4 choices from playlist ─────────────────────────
function buildChoices(songs: PlaylistSong[], correctIndex: number): string[] {
  const correct = songs[correctIndex].title;
  const pool = songs.filter((_, i) => i !== correctIndex).map((s) => s.title);
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  const all = [...shuffled, correct].sort(() => Math.random() - 0.5);
  return all;
}

type GameState = "loading" | "loadingScreen" | "playing" | "result" | "gameOver";

export default function Game() {
  const [, params] = useRoute("/game/:id");
  const search = useSearch();
  const playlistId = params?.id || null;
  const [, setLocation] = useLocation();

  const searchParams = new URLSearchParams(search);
  const timeLimit = parseInt(searchParams.get("time") || "30");
  const songCount = parseInt(searchParams.get("count") || "15");
  const isUnlimitedTime = timeLimit === 0;

  const { data: playlist, isLoading, error } = usePlaylist(playlistId);
  const submitGame = useSubmitGame();

  const [gameState, setGameState] = useState<GameState>("loading");
  const [round, setRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(15);
  const [score, setScore] = useState(0);
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
  const [playedIndices, setPlayedIndices] = useState<Set<number>>(new Set());
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [autoNextTimer, setAutoNextTimer] = useState<NodeJS.Timeout | null>(null);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // When playlist loaded → show loadingScreen briefly then start
  useEffect(() => {
    if (playlist && gameState === "loading") {
      const rounds = songCount === 9999 ? playlist.songs.length : Math.min(songCount, playlist.songs.length);
      setTotalRounds(rounds);
      setGameState("loadingScreen");
      setTimeout(() => startRound(new Set(), 1, rounds, playlist.songs), 1500);
    }
  }, [playlist]);

  // Countdown timer (skipped if unlimited)
  useEffect(() => {
    if (gameState !== "playing") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (isUnlimitedTime) return;
    setTimeLeft(timeLimit);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [gameState, currentSongIndex]);

  const handleTimeUp = () => {
    if (selected !== null) return; // already answered
    setSelected("");
    setIsCorrect(false);
    setGameState("result");
    scheduleAutoNext();
  };

  const scheduleAutoNext = () => {
    // 5 seconds on result screen then auto advance
    const t = setTimeout(() => {
      goNext();
    }, 6000);
    setAutoNextTimer(t);
  };

  const startRound = (
    played: Set<number>,
    currentRound: number,
    total: number,
    songs: PlaylistSong[]
  ) => {
    if (currentRound > total) { setGameState("gameOver"); return; }
    let idx: number;
    let attempts = 0;
    do { idx = Math.floor(Math.random() * songs.length); attempts++; }
    while (played.has(idx) && attempts < 200);

    const newPlayed = new Set(played).add(idx);
    setPlayedIndices(newPlayed);
    setCurrentSongIndex(idx);
    setChoices(buildChoices(songs, idx));
    setSelected(null);
    setIsCorrect(null);
    setIsPlaying(true);
    setGameState("playing");
  };

  const handleChoice = (choice: string) => {
    if (selected !== null || !playlist || currentSongIndex === null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoNextTimer) clearTimeout(autoNextTimer);

    const correct = playlist.songs[currentSongIndex].title;
    const ok = choice === correct;
    setSelected(choice);
    setIsCorrect(ok);
    if (ok) {
      setScore((s) => s + 100);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#e91e8c", "#9c27b0", "#f8bbd9"] });
    }
    setGameState("result");
    scheduleAutoNext();
  };

  const goNext = () => {
    if (autoNextTimer) clearTimeout(autoNextTimer);
    playerRef.current?.stopVideo();
    if (!playlist) return;
    const nextRound = round + 1;
    if (nextRound > totalRounds) {
      setGameState("gameOver");
    } else {
      setRound(nextRound);
      startRound(playedIndices, nextRound, totalRounds, playlist.songs);
    }
  };

  const goHome = () => {
    if (window.confirm("Are you sure you want to quit the game?")) {
      playerRef.current?.stopVideo();
      setLocation("/");
    }
  };

  // YouTube handlers
  const handlePlayerReady = (e: YouTubeEvent) => {
    playerRef.current = e.target;
    playerRef.current.setVolume(70);
    if (gameState === "playing") playerRef.current.playVideo();
  };
  const handleStateChange = (e: YouTubeEvent) => {
    setIsPlaying(e.data === YouTube.PlayerState.PLAYING);
  };

  const currentSong = currentSongIndex !== null && playlist ? playlist.songs[currentSongIndex] : null;

  // ── Loading (API fetch) ──
  if (isLoading || gameState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FloatingNotes />
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="w-24 h-24 rounded-full vinyl-spin shadow-2xl shadow-pink-400/40"
            style={{ background: "conic-gradient(from 0deg, #1a0a12, #3d1a2e 25%, #1a0a12 50%, #3d1a2e 75%, #1a0a12)" }}>
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-200 to-pink-500" />
            </div>
          </div>
          <p className="text-pink-400 font-['Playfair_Display'] text-lg animate-pulse">Loading your playlist...</p>
        </div>
      </div>
    );
  }

  // ── Loading Screen (1.5s transition) ──
  if (gameState === "loadingScreen") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FloatingNotes />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 z-10">
          <div className="w-28 h-28 rounded-full vinyl-spin shadow-2xl shadow-pink-400/40 flex items-center justify-center"
            style={{ background: "conic-gradient(from 0deg, #1a0a12, #3d1a2e 25%, #1a0a12 50%, #3d1a2e 75%, #1a0a12)" }}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-200 to-pink-500" />
          </div>
          <p className="text-pink-400 font-['Playfair_Display'] text-xl animate-pulse">Loading your playlist...</p>
          <p className="text-pink-300/60 text-sm">{playlist?.title} 💖</p>
        </motion.div>
      </div>
    );
  }

  // ── Error ──
  if (error || !playlist) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <FloatingNotes />
        <div className="bg-white/80 rounded-3xl p-8 max-w-md w-full text-center shadow-xl z-10">
          <h2 className="text-2xl font-['Playfair_Display'] font-bold text-pink-500 mb-2">Oops! 💔</h2>
          <p className="text-gray-500 mb-6">{(error as Error)?.message || "Could not load playlist."}</p>
          <button onClick={() => setLocation("/")}
            className="px-6 py-3 rounded-2xl bg-pink-500 text-white font-semibold">Back Home</button>
        </div>
      </div>
    );
  }

  // ── Game Over ──
  if (gameState === "gameOver") {
    const allSongsCompleted = songCount === 9999 || totalRounds === playlist?.songs.length;
    return <GameOverView score={score} totalRounds={totalRounds} playlistId={playlistId}
      playerName={playerName} setPlayerName={setPlayerName}
      allSongsCompleted={allSongsCompleted}
      onSubmit={() => {
        if (!playlistId || !playerName.trim()) return;
        submitGame.mutate({ playerName: playerName.trim(), playlistId, score, totalQuestions: totalRounds });
      }}
      isSubmitting={submitGame.isPending} isSubmitted={submitGame.isSuccess}
      onReplay={() => window.location.reload()} onHome={() => setLocation("/")} />;
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 relative overflow-hidden">
      <FloatingNotes />

      {/* Hidden YouTube player - single reused instance */}
      {currentSong && (
        <div className="w-0 h-0 overflow-hidden opacity-0 pointer-events-none absolute">
          <YouTube
            key={currentSong.id}
            videoId={currentSong.id}
            opts={{ height: "0", width: "0", playerVars: { autoplay: 1, controls: 0, disablekb: 1, start: 0 } }}
            onReady={handlePlayerReady}
            onStateChange={handleStateChange}
          />
        </div>
      )}

      {/* Top bar */}
      <div className="flex justify-between items-center max-w-2xl mx-auto w-full z-10 mb-4">
        <button onClick={goHome}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 hover:bg-pink-50 border border-pink-100 text-pink-400 text-sm font-medium transition-all">
          <Home className="w-4 h-4" /> Home
        </button>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs text-pink-300 uppercase tracking-widest">Score</p>
            <p className="text-xl font-['Playfair_Display'] font-bold gradient-text">{score}</p>
          </div>
          <div className="w-px h-8 bg-pink-200" />
          <div className="text-center">
            <p className="text-xs text-pink-300 uppercase tracking-widest">Round</p>
            <p className="text-xl font-['Playfair_Display'] font-bold text-purple-500">{round}/{totalRounds}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center z-10 gap-4">
        <AnimatePresence mode="wait">

          {/* ── Playing ── */}
          {gameState === "playing" && currentSong && (
            <motion.div key={`play-${round}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-pink-100 space-y-5">
                {/* Vinyl + waveform */}
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className={cn("w-24 h-24 rounded-full shadow-xl relative flex items-center justify-center",
                      isPlaying ? "vinyl-spin" : "vinyl-spin-paused")}
                    style={{ background: "conic-gradient(from 0deg, #1a0a12, #3d1a2e 20%, #1a0a12 40%, #3d1a2e 60%, #1a0a12)" }}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-purple-500 z-10 relative" />
                    <div className="absolute w-3 h-3 rounded-full bg-white" />
                  </div>
                  <Waveform isPlaying={isPlaying} />
                  <p className="text-pink-400/70 font-['Playfair_Display'] italic text-sm">
                    Song {round} of {totalRounds} — listen and choose! 🎵
                  </p>
                </div>

                {/* Timer bar (hidden when unlimited) */}
                {!isUnlimitedTime && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-pink-300">
                      <span>Time</span>
                      <span className={cn("font-bold", timeLeft <= 5 ? "text-red-400 animate-pulse" : "text-pink-400")}>
                        {timeLeft}s
                      </span>
                    </div>
                    <div className="h-2 bg-pink-100 rounded-full overflow-hidden">
                      <motion.div
                        className={cn("h-full rounded-full", timeLeft <= 5 ? "bg-red-400" : "bg-gradient-to-r from-pink-500 to-purple-500")}
                        style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
                        transition={{ duration: 1, ease: "linear" }}
                      />
                    </div>
                  </div>
                )}

                {/* 4 choices */}
                <div className="grid grid-cols-2 gap-3">
                  {choices.map((choice, i) => (
                    <motion.button
                      key={i}
                      onClick={() => handleChoice(choice)}
                      whileTap={{ scale: 0.97 }}
                      className="py-4 px-3 rounded-2xl border-2 border-pink-100 bg-white hover:bg-pink-50 hover:border-pink-300 text-sm font-medium text-gray-700 text-left transition-all leading-snug">
                      <span className="text-pink-400 font-bold mr-1.5">{String.fromCharCode(65 + i)}.</span>
                      {choice}
                    </motion.button>
                  ))}
                </div>

                {/* Skip */}
                <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); handleTimeUp(); }}
                  className="w-full py-2 text-xs text-pink-300 hover:text-pink-400 flex items-center justify-center gap-1 transition-colors">
                  <SkipForward className="w-3 h-3" /> Skip this song
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Result ── */}
          {gameState === "result" && currentSong && (
            <motion.div key={`result-${round}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-pink-100 space-y-5 text-center">
                {/* Album art */}
                <div className="relative mx-auto w-48 h-48 rounded-2xl overflow-hidden shadow-xl">
                  <img src={currentSong.thumbnail} alt={currentSong.title} className="w-full h-full object-cover" />
                </div>

                {/* Result emoji */}
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}
                  className="text-4xl">{isCorrect ? "🎉" : "💔"}</motion.div>

                <div>
                  <h2 className={cn("text-2xl font-['Playfair_Display'] font-bold mb-1",
                    isCorrect ? "gradient-text" : "text-gray-400")}>
                    {isCorrect ? "Correct! 🌸" : "Not quite... 💕"}
                  </h2>
                  <p className="text-sm text-gray-500 font-medium">"{currentSong.title}"</p>
                  {isCorrect && <p className="text-purple-400 text-sm font-semibold mt-1">+100 Points</p>}
                </div>

                {/* Choices result */}
                <div className="grid grid-cols-2 gap-2 text-left">
                  {choices.map((choice, i) => {
                    const isRight = choice === currentSong.title;
                    const isPicked = choice === selected;
                    return (
                      <div key={i} className={cn("py-3 px-3 rounded-2xl border-2 text-sm font-medium leading-snug",
                        isRight ? "border-green-400 bg-green-50 text-green-700"
                          : isPicked ? "border-red-300 bg-red-50 text-red-500"
                          : "border-pink-100 bg-white text-gray-400")}>
                        <span className={cn("font-bold mr-1.5", isRight ? "text-green-500" : isPicked ? "text-red-400" : "text-pink-300")}>
                          {String.fromCharCode(65 + i)}.
                        </span>
                        {choice}
                        {isRight && " ✓"}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 justify-center pt-1">
                  <a href={`https://www.youtube.com/watch?v=${currentSong.id}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-pink-200 text-pink-500 text-sm font-medium hover:bg-pink-50 transition-all">
                    <ExternalLink className="w-3.5 h-3.5" /> Listen More
                  </a>
                  <motion.button onClick={goNext} whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-semibold shadow-md shadow-pink-200 hover:shadow-pink-300 transition-all">
                    {round >= totalRounds ? "Finish" : "Next"} <SkipForward className="w-4 h-4" />
                  </motion.button>
                </div>

                <p className="text-xs text-pink-200 animate-pulse">Auto-advancing in a few seconds...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Game Over ─────────────────────────────────────────────
function GameOverView({ score, totalRounds, playlistId, playerName, setPlayerName, onSubmit, isSubmitting, isSubmitted, onReplay, onHome, allSongsCompleted }: {
  score: number; totalRounds: number; playlistId: string | null;
  playerName: string; setPlayerName: (v: string) => void;
  onSubmit: () => void; isSubmitting: boolean; isSubmitted: boolean;
  onReplay: () => void; onHome: () => void; allSongsCompleted?: boolean;
}) {
  const { data: leaderboard } = useLeaderboard(playlistId);
  const pct = Math.round((score / (totalRounds * 100)) * 100);

  // 전곡 완료 축하 화면
  if (allSongsCompleted) {
    confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors: ["#e91e8c", "#9c27b0", "#f8bbd9", "#ffd700"] });
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <FloatingNotes />
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 150 }}
          className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-pink-100 max-w-sm w-full z-10 text-center space-y-6">
          <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0] }} transition={{ delay: 0.3, duration: 0.6 }}
            className="text-6xl">🎊</motion.div>
          <div>
            <h2 className="text-3xl font-['Playfair_Display'] font-bold gradient-text mb-1">축하합니다!</h2>
            <p className="text-gray-500 text-sm">플레이리스트의 모든 곡을 완주했어요! 🎵</p>
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-5 space-y-1">
            <p className="text-xs text-pink-400 uppercase tracking-widest font-semibold">Total Score</p>
            <p className="text-5xl font-['Playfair_Display'] font-black gradient-text">{score}</p>
            <p className="text-sm text-gray-400">{totalRounds}곡 중 정답률 {pct}%</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={onHome}
              className="flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold shadow-lg shadow-pink-200 hover:shadow-pink-300 transition-all">
              <Home className="w-4 h-4" /> 홈으로
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const msg = pct >= 80 ? { title: "Music Maestro! 🏆", sub: "You know your music inside out!" }
    : pct >= 60 ? { title: "Playlist Pro! 🌟", sub: "Great ear for music!" }
    : pct >= 40 ? { title: "Getting There! 🎵", sub: "Keep listening!" }
    : { title: "Keep Discovering! 🌱", sub: "Music is a journey!" };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <FloatingNotes />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-xl border border-pink-100 max-w-md w-full z-10 space-y-5">
        <div className="text-center space-y-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 150 }}
            className="w-32 h-32 rounded-full mx-auto flex flex-col items-center justify-center bg-gradient-to-br from-[#e91e8c] to-[#9c27b0] shadow-[0_12px_40px_rgba(233,30,140,0.4)]">
            <span className="text-3xl font-['Playfair_Display'] font-black text-white">{score}</span>
            <span className="text-xs text-white/70 uppercase tracking-widest">points</span>
          </motion.div>
          <div>
            <h2 className="text-2xl font-['Playfair_Display'] font-bold gradient-text">{msg.title}</h2>
            <p className="text-gray-400 text-sm">{msg.sub}</p>
          </div>
          <div className="flex justify-center gap-3">
            {[{ l: "Score", v: score }, { l: "Songs", v: totalRounds }, { l: "Accuracy", v: `${pct}%` }].map(({ l, v }) => (
              <div key={l} className="bg-pink-50 rounded-2xl px-4 py-3 min-w-[80px]">
                <span className="block text-xl font-['Playfair_Display'] font-bold text-pink-500">{v}</span>
                <span className="text-xs text-pink-300 uppercase tracking-wider">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {!isSubmitted ? (
          <div className="space-y-2 p-4 bg-pink-50 rounded-2xl border border-pink-100">
            <h3 className="font-semibold text-pink-500 text-sm text-center">Save to Leaderboard</h3>
            <input placeholder="Your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={15}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-pink-200 bg-white text-center text-sm text-gray-700 focus:outline-none focus:border-pink-400 transition-all" />
            <button onClick={onSubmit} disabled={!playerName.trim() || isSubmitting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-semibold disabled:opacity-40">
              {isSubmitting ? "Saving..." : "Submit Score"}
            </button>
          </div>
        ) : (
          <div className="py-3 px-6 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm font-medium text-center">
            ✅ Score saved!
          </div>
        )}

        {leaderboard && leaderboard.length > 0 && (
          <div>
            <h3 className="text-base font-['Playfair_Display'] font-bold text-pink-500 mb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Leaderboard
            </h3>
            <div className="rounded-2xl overflow-hidden border border-pink-100 bg-pink-50/50">
              {leaderboard.slice(0, 5).map((entry: Game, i: number) => (
                <div key={entry.id} className="flex justify-between items-center px-4 py-2.5 border-b border-pink-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                      i === 0 ? "bg-yellow-100 text-yellow-600" : i === 1 ? "bg-gray-100 text-gray-500" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-pink-100 text-pink-400")}>
                      {i + 1}
                    </span>
                    <span className="font-medium text-gray-700 text-sm">{entry.playerName}</span>
                  </div>
                  <span className="font-mono font-bold text-pink-500 text-sm">{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-3 pt-1">
          <button onClick={onHome}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-pink-200 text-pink-500 text-sm font-medium hover:bg-pink-50 transition-all">
            <Home className="w-4 h-4" /> Home
          </button>
          <button onClick={onReplay}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-semibold shadow-md">
            <RotateCcw className="w-4 h-4" /> Play Again
          </button>
        </div>
      </motion.div>
    </div>
  );
}
