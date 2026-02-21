import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import confetti from "canvas-confetti";
import { usePlaylist, useSubmitGame, useLeaderboard } from "@/hooks/use-game";
import { FloatingNotes } from "@/components/FloatingNotes";
import { Waveform } from "@/components/Waveform";
import { motion, AnimatePresence } from "framer-motion";
import { Home, SkipForward, Trophy, RotateCcw, ExternalLink, RefreshCw, Shuffle } from "lucide-react";
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

// ── Build 4 choices ─────────────────────────
function buildChoices(songs: PlaylistSong[], correctIndex: number): string[] {
  const correct = songs[correctIndex].title;
  const pool = songs.filter((_, i) => i !== correctIndex).map((s) => s.title);
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  return [...shuffled, correct].sort(() => Math.random() - 0.5);
}

// ── Random start time (0~60% of video) ─────
function getRandomStart() {
  return Math.floor(Math.random() * 60);
}

type GameState = "loading" | "loadingScreen" | "playing" | "result" | "gameOver";

// ── Love Message Component ──
const LOVE_MESSAGES = ["Don't forget, I love you", "Te amo, meu girasol"];

function LoveMessage() {
  const [msg, setMsg] = useState(LOVE_MESSAGES[Math.floor(Math.random() * LOVE_MESSAGES.length)]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsg(LOVE_MESSAGES[Math.floor(Math.random() * LOVE_MESSAGES.length)]);
        setVisible(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.p
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 11,
        color: "#e0a0c0",
        letterSpacing: "0.05em",
        fontStyle: "italic",
        marginTop: 4,
      }}>
      {msg}
    </motion.p>
  );
}

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
  const [randomStart, setRandomStart] = useState(0);
  // 5초 듣기 남은 횟수 (라운드당 1회)
  const [snippetUsed, setSnippetUsed] = useState(false);
  // 다시 듣기: 처음부터 재생
  const [replayCount, setReplayCount] = useState(0);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const snippetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 플레이리스트 로드 → 로딩 화면 → 게임 시작
  useEffect(() => {
    if (playlist && gameState === "loading") {
      const rounds = songCount === 9999
        ? playlist.songs.length
        : Math.min(songCount, playlist.songs.length);
      setTotalRounds(rounds);
      setGameState("loadingScreen");
      setTimeout(() => startRound(new Set(), 1, rounds, playlist.songs), 1500);
    }
  }, [playlist]);

  // 카운트다운 타이머 (무제한이면 스킵)
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
    if (selected !== null) return;
    setSelected("");
    setIsCorrect(false);
    setGameState("result");
    scheduleAutoNext();
  };

  const scheduleAutoNext = () => {
    const t = setTimeout(() => goNext(), 6000);
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
    const start = getRandomStart();
    setPlayedIndices(newPlayed);
    setCurrentSongIndex(idx);
    setChoices(buildChoices(songs, idx));
    setSelected(null);
    setIsCorrect(null);
    setIsPlaying(true);
    setSnippetUsed(false);
    setReplayCount(0);
    setRandomStart(start);
    setGameState("playing");
  };

  const handleChoice = (choice: string) => {
    if (selected !== null || !playlist || currentSongIndex === null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoNextTimer) clearTimeout(autoNextTimer);
    if (snippetTimerRef.current) clearTimeout(snippetTimerRef.current);

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
    if (snippetTimerRef.current) clearTimeout(snippetTimerRef.current);
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

  // ── 다시 듣기: 현재 랜덤 구간부터 다시 재생
  const handleReplay = () => {
    if (!playerRef.current) return;
    setReplayCount((c) => c + 1);
    playerRef.current.mute();
    playerRef.current.seekTo(randomStart, true);
    playerRef.current.playVideo();
    setTimeout(() => {
      playerRef.current?.unMute();
      playerRef.current?.setVolume(70);
    }, 300);
  };

  // ── 랜덤 5초 듣기: 다른 랜덤 구간 5초만 재생
  const handleSnippet = () => {
    if (!playerRef.current || snippetUsed) return;
    setSnippetUsed(true);
    const newStart = getRandomStart();
    playerRef.current.mute();
    playerRef.current.seekTo(newStart, true);
    playerRef.current.playVideo();
    setTimeout(() => {
      playerRef.current?.unMute();
      playerRef.current?.setVolume(70);
    }, 300);
    if (snippetTimerRef.current) clearTimeout(snippetTimerRef.current);
    snippetTimerRef.current = setTimeout(() => {
      playerRef.current?.pauseVideo();
    }, 5000);
  };

  // ── 스킵
  const handleSkip = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (snippetTimerRef.current) clearTimeout(snippetTimerRef.current);
    handleTimeUp();
  };

  // YouTube handlers
  const handlePlayerReady = (e: YouTubeEvent) => {
    playerRef.current = e.target;
    playerRef.current.seekTo(randomStart, true);
    if (gameState === "playing") {
      // Safari autoplay policy: start muted, then unmute after a short delay.
      // Safari blocks unmuted autoplay even with a prior user gesture,
      // but allows muted autoplay. We unmute quickly so the user won't notice.
      playerRef.current.mute();
      playerRef.current.playVideo();
      setTimeout(() => {
        playerRef.current?.unMute();
        playerRef.current?.setVolume(70);
      }, 500);
    }
  };
  const handleStateChange = (e: YouTubeEvent) => {
    setIsPlaying(e.data === YouTube.PlayerState.PLAYING);
  };

  const currentSong = currentSongIndex !== null && playlist
    ? playlist.songs[currentSongIndex] : null;

  // ── Loading (API fetch) ──
  if (isLoading || gameState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(180deg, #fff 0%, #fff0f7 100%)" }}>
        <div className="flex flex-col items-center gap-4 z-10">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #b06ce0 0%, #e040a0 40%, #7c3aed 75%, #c026a0 100%)",
              boxShadow: "0 8px 32px rgba(180,100,220,0.3)"
            }}>
            <div className="w-8 h-8 rounded-full" style={{ background: "#fff5f9" }} />
          </motion.div>
          <p className="text-pink-400 font-['Playfair_Display'] text-lg animate-pulse">Loading your playlist...</p>
          <LoveMessage />
        </div>
      </div>
    );
  }

  // ── Loading Screen (1.5s) ──
  if (gameState === "loadingScreen") {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(180deg, #fff 0%, #fff0f7 100%)" }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-5 z-10">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #b06ce0 0%, #e040a0 40%, #7c3aed 75%, #c026a0 100%)",
              boxShadow: "0 12px 40px rgba(180,100,220,0.35)"
            }}>
            <div className="w-10 h-10 rounded-full" style={{ background: "#fff5f9" }} />
          </motion.div>
          <p className="text-pink-400 font-['Playfair_Display'] text-xl animate-pulse">Loading your playlist...</p>
          <p style={{ color: "#d4a0bc", fontSize: 13 }}>{playlist?.title} 💖</p>
          <LoveMessage />
        </motion.div>
      </div>
    );
  }

  // ── Error ──
  if (error || !playlist) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(180deg, #fff 0%, #fff0f7 100%)" }}>
        <div className="bg-white/80 rounded-3xl p-8 max-w-md w-full text-center shadow-xl">
          <h2 className="text-2xl font-['Playfair_Display'] font-bold text-pink-500 mb-2">Oops! 💔</h2>
          <p className="text-gray-500 mb-6">{(error as Error)?.message || "Could not load playlist."}</p>
          <button onClick={() => setLocation("/")}
            className="px-6 py-3 rounded-2xl text-white font-semibold"
            style={{ background: "linear-gradient(135deg, #e91e8c, #7c3aed)" }}>
            Back Home
          </button>
        </div>
      </div>
    );
  }

  // ── Game Over ──
  if (gameState === "gameOver") {
    const allSongsCompleted = songCount === 9999 || totalRounds === playlist?.songs.length;
    return (
      <GameOverView
        score={score} totalRounds={totalRounds} playlistId={playlistId}
        playerName={playerName} setPlayerName={setPlayerName}
        allSongsCompleted={allSongsCompleted}
        onSubmit={() => {
          if (!playlistId || !playerName.trim()) return;
          submitGame.mutate({ playerName: playerName.trim(), playlistId, score, totalQuestions: totalRounds });
        }}
        isSubmitting={submitGame.isPending} isSubmitted={submitGame.isSuccess}
        onReplay={() => window.location.reload()} onHome={() => setLocation("/")}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #fff 0%, #fff0f7 100%)" }}>

      {/* Hidden YouTube player — single instance, reused */}
      {currentSong && (
        <div className="w-0 h-0 overflow-hidden opacity-0 pointer-events-none absolute">
          <YouTube
            key={currentSong.id}
            videoId={currentSong.id}
            // mute:1 is required for Safari autoplay policy; we unMute() in onReady after playback starts
            opts={{ height: "0", width: "0", playerVars: { autoplay: 1, controls: 0, disablekb: 1, start: randomStart, shuffle: 1, mute: 1 } }}
            onReady={handlePlayerReady}
            onStateChange={handleStateChange}
          />
        </div>
      )}

      {/* Top bar */}
      <div className="flex justify-between items-center max-w-2xl mx-auto w-full z-10 mb-4">
        <button onClick={goHome}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: "rgba(255,255,255,0.8)", border: "1px solid #fce4f0", color: "#d48fb0" }}>
          <Home className="w-4 h-4" /> Home
        </button>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest" style={{ color: "#d48fb0" }}>Score</p>
            <p className="text-xl font-['Playfair_Display'] font-bold"
              style={{ background: "linear-gradient(135deg, #b5395f, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {score}
            </p>
          </div>
          <div className="w-px h-8 bg-pink-100" />
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest" style={{ color: "#d48fb0" }}>Round</p>
            <p className="text-xl font-['Playfair_Display'] font-bold text-purple-400">{round}/{totalRounds}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center z-10 gap-4">
        <AnimatePresence mode="wait">

          {/* ── Playing ── */}
          {gameState === "playing" && currentSong && (
            <motion.div key={`play-${round}`}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="rounded-3xl p-6 shadow-xl space-y-5"
                style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", border: "1px solid #fce4f0" }}>

                {/* 바이닐 + 웨이브폼 */}
                <div className="flex flex-col items-center gap-3 py-2">
                  <motion.div
                    animate={{ rotate: isPlaying ? 360 : 0 }}
                    transition={{ duration: 6, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                    className="w-24 h-24 rounded-full flex items-center justify-center relative"
                    style={{
                      background: "linear-gradient(135deg, #b06ce0 0%, #e040a0 40%, #7c3aed 75%, #c026a0 100%)",
                      boxShadow: "0 8px 28px rgba(180,100,220,0.28)",
                    }}>
                    <div className="absolute inset-0 rounded-full"
                      style={{ background: "repeating-radial-gradient(circle at 50%, transparent 0px, transparent 6px, rgba(255,255,255,0.06) 6px, rgba(255,255,255,0.06) 7px)" }} />
                    <div className="w-8 h-8 rounded-full z-10 relative flex items-center justify-center"
                      style={{ background: "#fff5f9" }}>
                      <div className="w-2 h-2 rounded-full"
                        style={{ background: "linear-gradient(135deg, #e040a0, #7c3aed)" }} />
                    </div>
                  </motion.div>
                  <Waveform isPlaying={isPlaying} />
                  <p className="font-['Playfair_Display'] italic text-sm" style={{ color: "#d4a0bc" }}>
                    Song {round} of {totalRounds} — listen and choose! 🎵
                  </p>
                </div>

                {/* Timer bar */}
                {!isUnlimitedTime && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs" style={{ color: "#d48fb0" }}>
                      <span>Time</span>
                      <span className={cn("font-bold", timeLeft <= 5 ? "text-red-400 animate-pulse" : "")}
                        style={timeLeft > 5 ? { color: "#e91e8c" } : {}}>
                        {timeLeft}s
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "#fce4f0" }}>
                      <motion.div className="h-full rounded-full"
                        style={{
                          width: `${(timeLeft / timeLimit) * 100}%`,
                          background: timeLeft <= 5
                            ? "#f87171"
                            : "linear-gradient(to right, #e91e8c, #7c3aed)"
                        }}
                        transition={{ duration: 1, ease: "linear" }} />
                    </div>
                  </div>
                )}

                {/* 4지선다 */}
                <div className="grid grid-cols-2 gap-3">
                  {choices.map((choice, i) => (
                    <motion.button key={i} onClick={() => handleChoice(choice)} whileTap={{ scale: 0.97 }}
                      className="py-4 px-3 rounded-2xl text-sm font-medium text-left leading-snug transition-all"
                      style={{ border: "2px solid #fce4f0", background: "white", color: "#555" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#f9a8cc"; e.currentTarget.style.background = "#fff5f9"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#fce4f0"; e.currentTarget.style.background = "white"; }}>
                      <span className="font-bold mr-1.5" style={{ color: "#f48fb1" }}>
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {choice}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Result ── */}
          {gameState === "result" && currentSong && (
            <motion.div key={`result-${round}`}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="rounded-3xl p-6 shadow-xl space-y-5 text-center"
                style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", border: "1px solid #fce4f0" }}>

                {/* 앨범 자켓 */}
                <div className="relative mx-auto w-44 h-44 overflow-hidden"
                  style={{ borderRadius: 16, boxShadow: "0 8px 32px rgba(180,100,220,0.2)" }}>
                  <img src={currentSong.thumbnail} alt={currentSong.title} className="w-full h-full object-cover" />
                </div>

                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }} className="text-4xl">
                  {isCorrect ? "🎉" : "💔"}
                </motion.div>

                <div>
                  <h2 className="text-2xl font-['Playfair_Display'] font-bold mb-1"
                    style={isCorrect
                      ? { background: "linear-gradient(135deg, #b5395f, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }
                      : { color: "#bbb" }}>
                    {isCorrect ? "Correct! 🌸" : "Not quite... 💕"}
                  </h2>
                  <p className="text-sm font-medium text-gray-500">"{currentSong.title}"</p>
                  {isCorrect && <p className="text-purple-400 text-sm font-semibold mt-1">+100 Points</p>}
                </div>

                {/* 선지 결과 */}
                <div className="grid grid-cols-2 gap-2 text-left">
                  {choices.map((choice, i) => {
                    const isRight = choice === currentSong.title;
                    const isPicked = choice === selected;
                    return (
                      <div key={i} className="py-3 px-3 rounded-2xl text-sm font-medium leading-snug"
                        style={{
                          border: isRight ? "2px solid #4ade80" : isPicked ? "2px solid #fca5a5" : "2px solid #fce4f0",
                          background: isRight ? "#f0fdf4" : isPicked ? "#fff5f5" : "white",
                          color: isRight ? "#16a34a" : isPicked ? "#e11d48" : "#aaa",
                        }}>
                        <span className="font-bold mr-1.5"
                          style={{ color: isRight ? "#22c55e" : isPicked ? "#f87171" : "#f9a8cc" }}>
                          {String.fromCharCode(65 + i)}.
                        </span>
                        {choice}{isRight && " ✓"}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 justify-center pt-1">
                  <a href={`https://www.youtube.com/watch?v=${currentSong.id}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ border: "2px solid #fce4f0", color: "#e91e8c", background: "white" }}>
                    <ExternalLink className="w-3.5 h-3.5" /> Listen More
                  </a>
                  <motion.button onClick={goNext} whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md transition-all"
                    style={{ background: "linear-gradient(135deg, #e91e8c, #7c3aed)", boxShadow: "0 4px 16px rgba(233,30,140,0.25)" }}>
                    {round >= totalRounds ? "Finish" : "Next"} <SkipForward className="w-4 h-4" />
                  </motion.button>
                </div>
                <p className="text-xs animate-pulse" style={{ color: "#f9c5d9" }}>Auto-advancing in a few seconds...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Game Over ─────────────────────────────────────────────
function GameOverView({ score, totalRounds, playlistId, playerName, setPlayerName,
  onSubmit, isSubmitting, isSubmitted, onReplay, onHome, allSongsCompleted }: {
  score: number; totalRounds: number; playlistId: string | null;
  playerName: string; setPlayerName: (v: string) => void;
  onSubmit: () => void; isSubmitting: boolean; isSubmitted: boolean;
  onReplay: () => void; onHome: () => void; allSongsCompleted?: boolean;
}) {
  const { data: leaderboard } = useLeaderboard(playlistId);
  const pct = Math.round((score / (totalRounds * 100)) * 100);

  // 전곡 완주 축하 화면
  if (allSongsCompleted) {
    confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors: ["#e91e8c", "#9c27b0", "#f8bbd9", "#ffd700"] });
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(180deg, #fff 0%, #fff0f7 100%)" }}>
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 150 }}
          className="rounded-3xl p-8 shadow-2xl max-w-sm w-full z-10 text-center space-y-6"
          style={{ background: "rgba(255,255,255,0.92)", border: "1px solid #fce4f0" }}>
          <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ delay: 0.3, duration: 0.6 }} className="text-6xl">🎊</motion.div>
          <div>
            <h2 className="text-3xl font-['Playfair_Display'] font-bold mb-1"
              style={{ background: "linear-gradient(135deg, #b5395f, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              축하합니다!
            </h2>
            <p className="text-gray-400 text-sm">플레이리스트의 모든 곡을 완주했어요! 🎵</p>
          </div>
          <div className="rounded-2xl p-5 space-y-1" style={{ background: "linear-gradient(135deg, #fff0f6, #f3e8ff)" }}>
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "#d48fb0" }}>Total Score</p>
            <p className="text-5xl font-['Playfair_Display'] font-black"
              style={{ background: "linear-gradient(135deg, #b5395f, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {score}
            </p>
            <p className="text-sm text-gray-400">{totalRounds}곡 · 정답률 {pct}%</p>
          </div>
          <button onClick={onHome}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-semibold mx-auto"
            style={{ background: "linear-gradient(135deg, #e91e8c, #7c3aed)", boxShadow: "0 8px 24px rgba(233,30,140,0.25)" }}>
            <Home className="w-4 h-4" /> 홈으로
          </button>
        </motion.div>
      </div>
    );
  }

  const msg = pct >= 80 ? { title: "Music Maestro! 🏆", sub: "You know your music inside out!" }
    : pct >= 60 ? { title: "Playlist Pro! 🌟", sub: "Great ear for music!" }
    : pct >= 40 ? { title: "Getting There! 🎵", sub: "Keep listening!" }
    : { title: "Keep Discovering! 🌱", sub: "Music is a journey!" };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(180deg, #fff 0%, #fff0f7 100%)" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-6 shadow-xl max-w-md w-full z-10 space-y-5"
        style={{ background: "rgba(255,255,255,0.88)", border: "1px solid #fce4f0" }}>
        <div className="text-center space-y-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 150 }}
            className="w-32 h-32 rounded-full mx-auto flex flex-col items-center justify-center"
            style={{ background: "linear-gradient(135deg, #e91e8c, #7c3aed)", boxShadow: "0 12px 40px rgba(233,30,140,0.35)" }}>
            <span className="text-3xl font-['Playfair_Display'] font-black text-white">{score}</span>
            <span className="text-xs text-white/70 uppercase tracking-widest">points</span>
          </motion.div>
          <div>
            <h2 className="text-2xl font-['Playfair_Display'] font-bold"
              style={{ background: "linear-gradient(135deg, #b5395f, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {msg.title}
            </h2>
            <p className="text-gray-400 text-sm">{msg.sub}</p>
          </div>
          <div className="flex justify-center gap-3">
            {[{ l: "Score", v: score }, { l: "Songs", v: totalRounds }, { l: "Accuracy", v: `${pct}%` }].map(({ l, v }) => (
              <div key={l} className="rounded-2xl px-4 py-3 min-w-[80px]" style={{ background: "#fff0f6" }}>
                <span className="block text-xl font-['Playfair_Display'] font-bold" style={{ color: "#e91e8c" }}>{v}</span>
                <span className="text-xs uppercase tracking-wider" style={{ color: "#d48fb0" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {!isSubmitted ? (
          <div className="space-y-2 p-4 rounded-2xl" style={{ background: "#fff0f6", border: "1px solid #fce4f0" }}>
            <h3 className="font-semibold text-sm text-center" style={{ color: "#e91e8c" }}>Save to Leaderboard</h3>
            <input placeholder="Your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={15}
              className="w-full px-4 py-2.5 rounded-xl text-center text-sm text-gray-700 focus:outline-none transition-all"
              style={{ border: "2px solid #fce4f0", background: "white" }} />
            <button onClick={onSubmit} disabled={!playerName.trim() || isSubmitting}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #e91e8c, #7c3aed)" }}>
              {isSubmitting ? "Saving..." : "Submit Score"}
            </button>
          </div>
        ) : (
          <div className="py-3 px-6 rounded-xl text-green-600 text-sm font-medium text-center"
            style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>✅ Score saved!</div>
        )}

        {leaderboard && leaderboard.length > 0 && (
          <div>
            <h3 className="text-base font-['Playfair_Display'] font-bold mb-2 flex items-center gap-2" style={{ color: "#e91e8c" }}>
              <Trophy className="w-4 h-4 text-yellow-500" /> Leaderboard
            </h3>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #fce4f0", background: "rgba(255,240,246,0.5)" }}>
              {leaderboard.slice(0, 5).map((entry: Game, i: number) => (
                <div key={entry.id} className="flex justify-between items-center px-4 py-2.5"
                  style={{ borderBottom: i < 4 ? "1px solid #fce4f0" : "none" }}>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                      i === 0 ? "bg-yellow-100 text-yellow-600" : i === 1 ? "bg-gray-100 text-gray-500"
                        : i === 2 ? "bg-orange-100 text-orange-600" : "bg-pink-100 text-pink-400")}>
                      {i + 1}
                    </span>
                    <span className="font-medium text-gray-700 text-sm">{entry.playerName}</span>
                  </div>
                  <span className="font-mono font-bold text-sm" style={{ color: "#e91e8c" }}>{entry.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-3 pt-1">
          <button onClick={onHome}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ border: "2px solid #fce4f0", color: "#e91e8c", background: "white" }}>
            <Home className="w-4 h-4" /> Home
          </button>
          <button onClick={onReplay}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-md"
            style={{ background: "linear-gradient(135deg, #e91e8c, #7c3aed)" }}>
            <RotateCcw className="w-4 h-4" /> Play Again
          </button>
        </div>
      </motion.div>
    </div>
  );
}
