/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Diamond,
  Bomb,
  HelpCircle,
  TrendingUp,
  Cpu,
  Tv,
  Coins,
  History,
  Volume2,
  VolumeX,
  Video,
  Square,
  Music,
  Download,
  Image as ImageIcon,
  Terminal,
  Play
} from "lucide-react";

import { Cell, CellState, GameStatus, RoundHistoryItem, Stats } from "./types";
import { calculateMultiplier, getMultiplierSteps } from "./utils/math";
import { audioEngine } from "./utils/audioEngine";

// Components
import { MinesGrid } from "./components/MinesGrid";
import { MinesSidebar } from "./components/MinesSidebar";
import { MediaCustomizer } from "./components/MediaCustomizer";
import { PythonVerifier } from "./components/PythonVerifier";

const GRID_SIZE = 25;
const HOUSE_EDGE = 0.01; // 1% edge

export default function App() {
  // Custom background image
  const [customBgImage, setCustomBgImage] = useState<string | null>(() => {
    return localStorage.getItem("custom_mines_bg") || null;
  });

  // Game Setup & Balance
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem("mines_balance");
    return saved ? parseFloat(saved) : 1000.0;
  });
  const [betAmount, setBetAmount] = useState<number>(10.0);
  const [minesCount, setMinesCount] = useState<number>(3);
  const [gameStatus, setGameStatus] = useState<GameStatus>("idle");

  // Audio & Sound volume states
  const [sfxVolume, setSfxVolume] = useState<number>(0.5);
  const [musicVolume, setMusicVolume] = useState<number>(0.2);
  const [isMusicOn, setIsMusicOn] = useState<boolean>(false);

  // Video recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<any>(null);

  // Sync volume on changes
  useEffect(() => {
    audioEngine.setSFXVolume(sfxVolume);
  }, [sfxVolume]);

  useEffect(() => {
    audioEngine.setMusicVolume(musicVolume);
  }, [musicVolume]);

  // Track timer during recording
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  const handleToggleMusic = () => {
    audioEngine.init();
    if (isMusicOn) {
      audioEngine.stopMusic();
      setIsMusicOn(false);
    } else {
      audioEngine.startMusic();
      setIsMusicOn(true);
    }
  };

  const startScreenRecording = async () => {
    setRecordingError(null);
    setVideoUrl(null);
    setRecordedChunks([]);
    audioEngine.init();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error("Display recording is not fully supported in this browser. Try Chrome/Firefox/Edge.");
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "browser" },
        audio: true
      });

      const videoTracks = screenStream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error("No video track detected.");
      }

      const gameAudioStream = audioEngine.getAudioStream();
      let combinedStream = screenStream;

      if (gameAudioStream) {
        const audioTracks = gameAudioStream.getAudioTracks();
        if (audioTracks.length > 0) {
          combinedStream = new MediaStream([
            videoTracks[0],
            audioTracks[0]
          ]);
        }
      }

      streamRef.current = screenStream;

      const options = { mimeType: "video/webm;codecs=vp9,opus" };
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(combinedStream, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(combinedStream);
      }

      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsRecording(false);
        setRecordDuration(0);

        screenStream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordDuration(0);

    } catch (err: any) {
      console.error("Screen recording failed", err);
      if (err.name === "NotAllowedError" || err.message?.includes("Permission denied")) {
        setRecordingError("Recording permission was denied. If in iframe, please open the app in a new tab!");
      } else {
        setRecordingError(err.message || "Could not start video recording.");
      }
      setIsRecording(false);
    }
  };

  const stopScreenRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Grid and game status
  const [cells, setCells] = useState<Cell[]>(() => generateInitialGrid());
  const [clicks, setClicks] = useState<number[]>([]);
  const [gridMines, setGridMines] = useState<boolean[]>(() => Array(GRID_SIZE).fill(false));
  const [shakeGrid, setShakeGrid] = useState<boolean>(false);

  // Stats & History
  const [history, setHistory] = useState<RoundHistoryItem[]>(() => {
    const saved = localStorage.getItem("mines_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [stats, setStats] = useState<Stats>(() => {
    const saved = localStorage.getItem("mines_stats");
    return saved ? JSON.parse(saved) : {
      totalBets: 0,
      totalWins: 0,
      totalLosses: 0,
      totalWagered: 0,
      totalProfit: 0,
      highestMultiplier: 1.0,
      highestWinAmount: 0.0,
    };
  });

  // Replay states
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [highlightedIndices, setHighlightedIndices] = useState<number[]>([]);

  // AI Auto Play states
  const [isAutoActive, setIsAutoActive] = useState<boolean>(false);
  const [autoBetsRemaining, setAutoBetsRemaining] = useState<number>(0);
  const [onWinAction, setOnWinAction] = useState<"reset" | "increase">("reset");
  const [onWinPercent, setOnWinPercent] = useState<number>(100);
  const [onLossAction, setOnLossAction] = useState<"reset" | "increase">("reset");
  const [onLossPercent, setOnLossPercent] = useState<number>(100);
  const [baseBetAmount, setBaseBetAmount] = useState<number>(10.0);
  const autoPlayTimerRef = useRef<any>(null);

  // Save states to localStorage
  useEffect(() => {
    localStorage.setItem("mines_balance", balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem("mines_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("mines_stats", JSON.stringify(stats));
  }, [stats]);

  // Clean up auto timers on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, []);

  // Multiplier derivations
  const revealedCount = clicks.length;
  const currentMultiplier = useMemo(() => {
    return calculateMultiplier(minesCount, revealedCount, HOUSE_EDGE);
  }, [minesCount, revealedCount]);

  const nextMultiplier = useMemo(() => {
    return calculateMultiplier(minesCount, revealedCount + 1, HOUSE_EDGE);
  }, [minesCount, revealedCount]);

  const multiplierSteps = useMemo(() => {
    return getMultiplierSteps(minesCount, HOUSE_EDGE);
  }, [minesCount]);

  // Generate an empty initial grid
  function generateInitialGrid(): Cell[] {
    return Array.from({ length: GRID_SIZE }, (_, id) => ({
      id,
      state: "unrevealed",
      isRealMine: false,
      isFlipped: false,
    }));
  }

  const handleResetBalance = () => {
    if (gameStatus === "playing") return;
    setBalance(1000.0);
  };

  const handleClearStats = () => {
    if (gameStatus === "playing") return;
    const initialStats = {
      totalBets: 0,
      totalWins: 0,
      totalLosses: 0,
      totalWagered: 0,
      totalProfit: 0,
      highestMultiplier: 1.0,
      highestWinAmount: 0.0,
    };
    setStats(initialStats);
    setHistory([]);
    localStorage.setItem("mines_stats", JSON.stringify(initialStats));
    localStorage.setItem("mines_history", JSON.stringify([]));
  };

  // Start a manual/auto Mines game
  const handleStartGame = (isAutoMode: boolean = false) => {
    if (gameStatus === "playing" || isReplaying) return;
    if (betAmount <= 0 || betAmount > balance) return;

    audioEngine.init();
    audioEngine.playClick();

    // 1. Subtract bet amount
    setBalance((prev) => Math.round((prev - betAmount) * 100) / 100);

    // 2. Generate random mine locations
    const minePositions = Array(GRID_SIZE).fill(false);
    let minesPlaced = 0;
    while (minesPlaced < minesCount) {
      const randIdx = Math.floor(Math.random() * GRID_SIZE);
      if (!minePositions[randIdx]) {
        minePositions[randIdx] = true;
        minesPlaced++;
      }
    }

    setGridMines(minePositions);

    // 3. Initialize cells
    const newCells: Cell[] = Array.from({ length: GRID_SIZE }, (_, id) => ({
      id,
      state: "unrevealed",
      isRealMine: minePositions[id],
      isFlipped: false,
    }));

    setCells(newCells);
    setClicks([]);
    setGameStatus("playing");
    setShakeGrid(false);

    // Update stats for wagered amounts
    setStats((prev) => ({
      ...prev,
      totalBets: prev.totalBets + 1,
      totalWagered: Math.round((prev.totalWagered + betAmount) * 100) / 100,
    }));

    // Handle AI autoplay bot trigger
    if (isAutoMode) {
      setIsAutoActive(true);
      // Run the automated grid solver steps after a brief starting delay
      autoPlayTimerRef.current = setTimeout(() => runAIStep(newCells, minePositions, []), 600);
    }
  };

  // Click handler for grid cells
  const handleCellClick = (id: number) => {
    if (gameStatus !== "playing" || isReplaying || isAutoActive) return;

    const targetCell = cells[id];
    if (targetCell.isFlipped) return;

    const newClicks = [...clicks, id];
    setClicks(newClicks);

    if (targetCell.isRealMine) {
      // 💥 EXPLOSION (HIT A MINE, GAME OVER)
      audioEngine.playExplosion();
      setShakeGrid(true);

      const updatedCells = cells.map((cell) => {
        if (cell.id === id) {
          return { ...cell, state: "revealed-mine-exploded" as CellState, isFlipped: true };
        } else if (cell.isRealMine) {
          return { ...cell, state: "revealed-mine" as CellState, isFlipped: true };
        } else if (newClicks.includes(cell.id)) {
          return { ...cell, state: "gem" as CellState, isFlipped: true };
        } else {
          // Unclicked safe items revealed at end
          return { ...cell, state: "revealed-gem" as CellState, isFlipped: true };
        }
      });

      setCells(updatedCells);
      setGameStatus("lost");

      // Update statistics
      setStats((prev) => ({
        ...prev,
        totalLosses: prev.totalLosses + 1,
        totalProfit: Math.round((prev.totalProfit - betAmount) * 100) / 100,
      }));

      // Add to session history logs
      const newHistoryItem: RoundHistoryItem = {
        id: `round_${Date.now()}`,
        timestamp: Date.now(),
        betAmount,
        minesCount,
        outcome: "lost",
        multiplier: 0,
        profit: -betAmount,
        revealedCellsCount: newClicks.length - 1,
        gridMines: gridMines,
        clicks: newClicks,
      };
      setHistory((prev) => [newHistoryItem, ...prev]);

    } else {
      // 💎 REVEALED A GEM
      const currentStreak = newClicks.length - 1;
      audioEngine.playDiamond(currentStreak);

      const updatedCells = cells.map((cell) => {
        if (cell.id === id) {
          return { ...cell, state: "gem" as CellState, isFlipped: true };
        }
        return cell;
      });

      setCells(updatedCells);

      // Ultimate win condition: revealed all possible safe gems!
      const totalSafeGems = GRID_SIZE - minesCount;
      if (newClicks.length === totalSafeGems) {
        // Automatic cashout at max possible multiplier!
        const maxMult = calculateMultiplier(minesCount, totalSafeGems, HOUSE_EDGE);
        const winProfit = Math.round(betAmount * maxMult * 100) / 100;
        
        setBalance((prev) => Math.round((prev + winProfit) * 100) / 100);
        audioEngine.playCashout();
        setGameStatus("cashed-out");

        // Reveal remaining mines
        const finalCells = updatedCells.map((c) => {
          if (c.isRealMine) return { ...c, state: "revealed-mine" as CellState, isFlipped: true };
          return c;
        });
        setCells(finalCells);

        setStats((prev) => ({
          ...prev,
          totalWins: prev.totalWins + 1,
          totalProfit: Math.round((prev.totalProfit + winProfit - betAmount) * 100) / 100,
          highestMultiplier: Math.max(prev.highestMultiplier, maxMult),
          highestWinAmount: Math.max(prev.highestWinAmount, winProfit),
        }));

        setHistory((prev) => [
          {
            id: `round_${Date.now()}`,
            timestamp: Date.now(),
            betAmount,
            minesCount,
            outcome: "cashed-out",
            multiplier: maxMult,
            profit: winProfit - betAmount,
            revealedCellsCount: newClicks.length,
            gridMines: gridMines,
            clicks: newClicks,
          },
          ...prev,
        ]);
      }
    }
  };

  // Cash Out action
  const handleCashOut = () => {
    if (gameStatus !== "playing" || isReplaying || clicks.length === 0) return;

    audioEngine.playCashout();
    const multiplier = calculateMultiplier(minesCount, clicks.length, HOUSE_EDGE);
    const winAmount = Math.round(betAmount * multiplier * 100) / 100;
    const profit = Math.round((winAmount - betAmount) * 100) / 100;

    // 1. Credit balance
    setBalance((prev) => Math.round((prev + winAmount) * 100) / 100);
    setGameStatus("cashed-out");

    // 2. Reveal all remaining layout cells cleanly (dimmed)
    const revealedCells = cells.map((cell) => {
      if (cell.isRealMine) {
        return { ...cell, state: "revealed-mine" as CellState, isFlipped: true };
      } else if (!cell.isFlipped) {
        return { ...cell, state: "revealed-gem" as CellState, isFlipped: true };
      }
      return cell;
    });
    setCells(revealedCells);

    // 3. Update Stats
    setStats((prev) => ({
      ...prev,
      totalWins: prev.totalWins + 1,
      totalProfit: Math.round((prev.totalProfit + profit) * 100) / 100,
      highestMultiplier: Math.max(prev.highestMultiplier, multiplier),
      highestWinAmount: Math.max(prev.highestWinAmount, winAmount),
    }));

    // 4. Save history item
    const newHistoryItem: RoundHistoryItem = {
      id: `round_${Date.now()}`,
      timestamp: Date.now(),
      betAmount,
      minesCount,
      outcome: "cashed-out",
      multiplier,
      profit: profit,
      revealedCellsCount: clicks.length,
      gridMines: gridMines,
      clicks: clicks,
    };
    setHistory((prev) => [newHistoryItem, ...prev]);
  };

  // Interactive step-by-step game replay solver
  const handleReplayRound = (round: RoundHistoryItem) => {
    if (gameStatus === "playing" || isReplaying) return;

    setIsReplaying(true);
    setClicks([]);
    setHighlightedIndices([]);
    
    // Set board to standard unrevealed with the custom historical mines
    const initialCells: Cell[] = Array.from({ length: GRID_SIZE }, (_, id) => ({
      id,
      state: "unrevealed",
      isRealMine: round.gridMines[id],
      isFlipped: false,
    }));
    setCells(initialCells);

    let currentStep = 0;

    const playNextStep = () => {
      if (currentStep >= round.clicks.length) {
        // Replay completed! End round cleanly
        setTimeout(() => {
          const finalCells = initialCells.map((cell) => {
            const isClicked = round.clicks.includes(cell.id);
            if (cell.isRealMine) {
              const isExploded = isClicked && cell.id === round.clicks[round.clicks.length - 1] && round.outcome === "lost";
              return { 
                ...cell, 
                state: isExploded ? "revealed-mine-exploded" as CellState : "revealed-mine" as CellState, 
                isFlipped: true 
              };
            } else {
              return { 
                ...cell, 
                state: isClicked ? "gem" as CellState : "revealed-gem" as CellState, 
                isFlipped: true 
              };
            }
          });
          setCells(finalCells);
          setIsReplaying(false);
          setHighlightedIndices([]);
          if (round.outcome === "cashed-out") {
            audioEngine.playCashout();
          } else {
            audioEngine.playSadLoss();
          }
        }, 600);
        return;
      }

      const targetId = round.clicks[currentStep];
      setHighlightedIndices([targetId]);

      setTimeout(() => {
        const isMine = round.gridMines[targetId];
        
        if (isMine) {
          audioEngine.playExplosion();
          setShakeGrid(true);
          setTimeout(() => setShakeGrid(false), 500);
        } else {
          audioEngine.playDiamond(currentStep);
        }

        setCells((prevCells) =>
          prevCells.map((cell) => {
            if (cell.id === targetId) {
              return { 
                ...cell, 
                state: isMine ? "revealed-mine-exploded" as CellState : "gem" as CellState, 
                isFlipped: true 
              };
            }
            return cell;
          })
        );

        setClicks((prev) => [...prev, targetId]);
        currentStep++;
        autoPlayTimerRef.current = setTimeout(playNextStep, 750);
      }, 300);
    };

    playNextStep();
  };

  // AI Autoplay Step Logic
  const runAIStep = (currentCells: Cell[], actualMines: boolean[], currentClicks: number[]) => {
    // Determine how many steps to click (AI targets a realistic multiplier, e.g., 2 to 4 safe steps based on selected mines)
    // Low risk targets: 2-3 safe gems. High risk targets: 4-5 gems.
    const targetSteps = minesCount <= 3 ? 4 : (minesCount <= 8 ? 3 : 2);
    
    if (currentClicks.length >= targetSteps) {
      // AI reaches multiplier goal! Trigger auto cashout.
      setTimeout(() => {
        audioEngine.playCashout();
        const multiplier = calculateMultiplier(minesCount, currentClicks.length, HOUSE_EDGE);
        const winAmount = Math.round(betAmount * multiplier * 100) / 100;
        const profit = Math.round((winAmount - betAmount) * 100) / 100;

        setBalance((prev) => Math.round((prev + winAmount) * 100) / 100);
        setGameStatus("cashed-out");

        const finalRevealed = currentCells.map((c) => {
          if (c.isRealMine) return { ...c, state: "revealed-mine" as CellState, isFlipped: true };
          if (!c.isFlipped) return { ...c, state: "revealed-gem" as CellState, isFlipped: true };
          return c;
        });
        setCells(finalRevealed);

        setStats((prev) => ({
          ...prev,
          totalWins: prev.totalWins + 1,
          totalProfit: Math.round((prev.totalProfit + profit) * 100) / 100,
          highestMultiplier: Math.max(prev.highestMultiplier, multiplier),
          highestWinAmount: Math.max(prev.highestWinAmount, winAmount),
        }));

        setHistory((prev) => [
          {
            id: `round_${Date.now()}`,
            timestamp: Date.now(),
            betAmount,
            minesCount,
            outcome: "cashed-out",
            multiplier,
            profit,
            revealedCellsCount: currentClicks.length,
            gridMines: actualMines,
            clicks: currentClicks,
          },
          ...prev,
        ]);

        setIsAutoActive(false);
      }, 500);
      return;
    }

    // Pick a random unrevealed cell
    const unrevealedIndices = currentCells
      .filter((c) => !currentClicks.includes(c.id))
      .map((c) => c.id);

    if (unrevealedIndices.length === 0) return;
    const randomChoice = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];

    const updatedClicks = [...currentClicks, randomChoice];
    setClicks(updatedClicks);

    const isHitMine = actualMines[randomChoice];

    if (isHitMine) {
      // AI hit mine!
      audioEngine.playExplosion();
      setShakeGrid(true);
      setTimeout(() => setShakeGrid(false), 500);

      const explodedCells = currentCells.map((cell) => {
        if (cell.id === randomChoice) {
          return { ...cell, state: "revealed-mine-exploded" as CellState, isFlipped: true };
        } else if (cell.isRealMine) {
          return { ...cell, state: "revealed-mine" as CellState, isFlipped: true };
        } else if (updatedClicks.includes(cell.id)) {
          return { ...cell, state: "gem" as CellState, isFlipped: true };
        } else {
          return { ...cell, state: "revealed-gem" as CellState, isFlipped: true };
        }
      });

      setCells(explodedCells);
      setGameStatus("lost");

      setStats((prev) => ({
        ...prev,
        totalLosses: prev.totalLosses + 1,
        totalProfit: Math.round((prev.totalProfit - betAmount) * 100) / 100,
      }));

      setHistory((prev) => [
        {
          id: `round_${Date.now()}`,
          timestamp: Date.now(),
          betAmount,
          minesCount,
          outcome: "lost",
          multiplier: 0,
          profit: -betAmount,
          revealedCellsCount: updatedClicks.length - 1,
          gridMines: actualMines,
          clicks: updatedClicks,
        },
        ...prev,
      ]);

      setIsAutoActive(false);
    } else {
      // AI success diamond reveal
      audioEngine.playDiamond(updatedClicks.length - 1);

      const nextCells = currentCells.map((cell) => {
        if (cell.id === randomChoice) {
          return { ...cell, state: "gem" as CellState, isFlipped: true };
        }
        return cell;
      });

      setCells(nextCells);
      
      // Schedule next click after 350ms delay for smooth visuals
      autoPlayTimerRef.current = setTimeout(() => runAIStep(nextCells, actualMines, updatedClicks), 400);
    }
  };

  return (
    <div
      className="min-h-screen w-full text-white font-sans overflow-x-hidden flex flex-col relative py-8 px-4 sm:px-6 md:px-8 selection:bg-brand-cyan selection:text-black bg-[#07080d]"
    >
      {/* Background glow elements */}
      <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Aesthetic Top Navigation Bar */}
      <header className="max-w-6xl w-full mx-auto flex flex-col md:flex-row items-center justify-between mb-8 pb-4 border-b border-white/5 relative z-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-cyan to-purple-600 flex items-center justify-center shadow-lg shadow-brand-cyan/20">
            <Diamond className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider uppercase font-mono bg-gradient-to-r from-white via-brand-cyan to-purple-400 bg-clip-text text-transparent">
              Aether Mines
            </h1>
            <p className="text-[10px] text-brand-cyan font-mono tracking-widest uppercase opacity-80">
              Stake replica simulator
            </p>
          </div>
        </div>

        {/* TOP QUICK ACTION CENTER: Control buttons for Record, Sound next to Wallet & Start */}
        <div className="flex flex-wrap items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5 shadow-inner">
          
          {/* WALLET PORTAL */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-brand-bg/80 border border-white/5">
            <Coins className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] text-gray-500 font-mono uppercase tracking-wider leading-none">Wallet</span>
              <span className="text-xs font-bold font-mono text-white leading-none mt-0.5">
                ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <button
              onClick={handleResetBalance}
              disabled={gameStatus === "playing"}
              className="ml-1.5 px-1.5 py-0.5 text-[8px] font-bold bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-30 rounded text-gray-300 transition-all font-mono uppercase"
            >
              Reset
            </button>
          </div>

          {/* DYNAMIC QUICK START / CASH OUT GAME ACTION */}
          <div>
            {gameStatus === "playing" ? (
              <button
                onClick={handleCashOut}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-white font-bold text-[10px] transition-all flex items-center gap-1 shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>Cash Out</span>
                <span className="bg-white/25 px-1 py-0.1 rounded font-mono">
                  ${(betAmount * currentMultiplier).toFixed(2)}
                </span>
              </button>
            ) : (
              <button
                onClick={() => handleStartGame(false)}
                disabled={betAmount <= 0 || betAmount > balance || balance < 0.1}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-cyan to-purple-600 hover:from-brand-cyan/85 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white font-bold text-[10px] transition-all flex items-center gap-1 shadow-md shadow-brand-cyan/10 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Quick Bet</span>
              </button>
            )}
          </div>

          <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

          {/* QUICK AUDIO/SOUND CONTROLLER */}
          <button
            onClick={handleToggleMusic}
            className={`p-1.5 rounded-xl transition-all flex items-center gap-1 border ${
              isMusicOn
                ? "bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)] animate-pulse"
                : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-gray-200"
            }`}
            title={isMusicOn ? `Ambient Music ON (Volume: ${Math.round(musicVolume * 100)}%)` : "Music Muted"}
          >
            {isMusicOn ? <Music className="w-3.5 h-3.5 text-purple-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-bold font-mono tracking-wider hidden sm:inline">
              {isMusicOn ? "Music: ON" : "Music: OFF"}
            </span>
          </button>

          {/* QUICK VIDEO RECORDER CONTROLLER */}
          <div className="flex items-center gap-1">
            {isRecording ? (
              <button
                onClick={stopScreenRecording}
                className="p-1.5 rounded-xl bg-brand-pink hover:bg-brand-pink/85 text-white font-bold text-[10px] transition-all flex items-center gap-1.5 shadow-md shadow-brand-pink/20 cursor-pointer border border-brand-pink/20"
                title="Recording gameplay... Click to stop & save"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <Square className="w-3 h-3 fill-white" />
                <span className="font-mono text-[9px]">{formatDuration(recordDuration)}</span>
              </button>
            ) : (
              <button
                onClick={startScreenRecording}
                className="p-1.5 rounded-xl bg-white/5 text-gray-400 hover:text-brand-pink hover:bg-brand-pink/5 hover:border-brand-pink/20 border border-white/5 transition-all flex items-center gap-1 cursor-pointer"
                title="Record Session Screen Capture"
              >
                <Video className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold font-mono tracking-wider hidden sm:inline">Record</span>
              </button>
            )}

            {videoUrl && (
              <motion.a
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                href={videoUrl}
                download={`mines_win_clip_${Date.now()}.webm`}
                className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                title="Download video capture clip!"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold font-mono tracking-wider hidden sm:inline">Save WebM</span>
              </motion.a>
            )}
          </div>

          <div className="h-6 w-[1px] bg-white/10 hidden lg:block" />

          {/* ACTIVE CATEGORY / Python 3.12 RNG indicator */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
            <span className="text-[9px] font-mono font-bold text-yellow-500 uppercase tracking-widest">
              Python 3.12 RNG
            </span>
          </div>

        </div>
      </header>

      {/* Main Full Stack Casino Dashboard Grid */}
      <main className="max-w-6xl w-full mx-auto flex flex-col gap-6 relative z-10 flex-1 justify-center">
        <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center">
          
          {/* LEFT COLUMN: Standard fully spacious sidebar for controls */}
          <MinesSidebar
            balance={balance}
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            minesCount={minesCount}
            setMinesCount={setMinesCount}
            gameStatus={gameStatus}
            onStartGame={handleStartGame}
            onCashOut={handleCashOut}
            revealedCount={revealedCount}
            currentMultiplier={currentMultiplier}
            nextMultiplier={nextMultiplier}
            onResetBalance={handleResetBalance}
            isCompact={false}

            // Audio props
            sfxVolume={sfxVolume}
            setSfxVolume={setSfxVolume}
            musicVolume={musicVolume}
            setMusicVolume={setMusicVolume}
            isMusicOn={isMusicOn}
            setIsMusicOn={setIsMusicOn}
            handleToggleMusic={handleToggleMusic}

            // Recording props
            isRecording={isRecording}
            recordDuration={recordDuration}
            videoUrl={videoUrl}
            recordingError={recordingError}
            startScreenRecording={startScreenRecording}
            stopScreenRecording={stopScreenRecording}
            onReplayClick={
              history.length > 0
                ? () => handleReplayRound(history[0])
                : undefined
            }
            isReplaying={isReplaying}
          />

          {/* MIDDLE COLUMN: Custom 9:16 Shorts-style Game Board viewport */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <span className="text-xs font-mono text-gray-400 tracking-wider uppercase flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
              <Tv className="w-3.5 h-3.5 text-brand-cyan" />
              Game Screen (Shorts 9:16 Ratio)
            </span>

            <div 
              id="youtube-shorts-9-16-game-viewport"
              style={{
                backgroundImage: customBgImage 
                  ? `radial-gradient(circle at center, rgba(14, 16, 25, 0.4) 0%, rgba(14, 16, 25, 0.95) 100%), url(${customBgImage})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              className="w-[360px] h-[640px] bg-[#0c0d15] rounded-[32px] border-[5px] border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.85)] flex flex-col relative overflow-hidden shrink-0 p-4"
            >
              {/* Overlay elements inside the 9:16 game viewport */}
              <div className="w-full flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-mono font-bold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded uppercase">
                    Python 3.12 RNG
                  </span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand-cyan/10 border border-brand-cyan/20">
                  <span className="w-1 h-1 rounded-full bg-brand-cyan animate-ping" />
                  <span className="text-[7px] font-mono text-brand-cyan font-bold uppercase tracking-wider">ACTIVE</span>
                </div>
              </div>

              {/* Multipliers horizontal tracker */}
              <div className="w-full overflow-hidden rounded-xl bg-white/5 border border-white/5 p-1.5 flex items-center gap-1 select-none relative shrink-0 mb-4">
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-brand-bg to-transparent pointer-events-none z-10" />
                <div className="flex gap-1 overflow-x-auto scrollbar-none pr-8">
                  {multiplierSteps.map((step, idx) => {
                    const isActive = idx === revealedCount - 1 && gameStatus === "playing";
                    const isPassed = idx < revealedCount && gameStatus === "playing";

                    let badgeStyle = "bg-[#181a24] text-gray-400 border border-white/5";
                    if (isActive) {
                      badgeStyle = "bg-brand-cyan text-black font-extrabold scale-105 border-brand-cyan shadow-[0_0_12px_rgba(0,255,204,0.4)]";
                    } else if (isPassed) {
                      badgeStyle = "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20";
                    }

                    return (
                      <div
                        key={idx}
                        className={`px-2 py-0.5 rounded-lg text-center shrink-0 flex flex-col items-center justify-center transition-all ${badgeStyle}`}
                      >
                        <span className="text-[7px] font-mono opacity-60">x{idx + 1}</span>
                        <span className="text-[9px] font-bold font-mono">{step.toFixed(2)}x</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Main Mines Game Board inside 9:16 aspect ratio */}
              <div className="w-full flex-1 flex items-center justify-center">
                <MinesGrid
                  cells={cells}
                  onCellClick={handleCellClick}
                  gameStatus={gameStatus}
                  shakeGrid={shakeGrid}
                  highlightedIndices={highlightedIndices}
                  customBgImage={customBgImage}
                />
              </div>

              {/* Game Outcome Overlay Panel */}
              <div className="mt-auto pt-4">
                <AnimatePresence>
                  {(gameStatus === "lost" || gameStatus === "cashed-out") && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs tracking-wide flex items-center justify-between shadow-lg ${
                        gameStatus === "cashed-out"
                          ? "bg-brand-cyan/15 border-brand-cyan/35 text-brand-cyan"
                          : "bg-brand-pink/15 border-brand-pink/35 text-brand-pink"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {gameStatus === "cashed-out" ? (
                          <div className="w-7 h-7 rounded-lg bg-brand-cyan/20 flex items-center justify-center shrink-0">
                            <Diamond className="w-3.5 h-3.5 text-brand-cyan animate-bounce" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-brand-pink/20 flex items-center justify-center shrink-0">
                            <Bomb className="w-3.5 h-3.5 text-brand-pink" />
                          </div>
                        )}
                        <div className="text-left">
                          <div className="text-[9px] text-gray-400 font-mono">
                            {gameStatus === "cashed-out" ? "Cash Out Complete!" : "Mine Exploded"}
                          </div>
                          <div className="text-xs font-extrabold font-mono leading-tight">
                            {gameStatus === "cashed-out"
                              ? `Won $${(betAmount * currentMultiplier).toFixed(2)}`
                              : `Lost $${betAmount.toFixed(2)}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded-md">
                          {gameStatus === "cashed-out" ? `${currentMultiplier.toFixed(2)}x` : "0.00x"}
                        </span>
                        <button
                          onClick={() => {
                            setGameStatus("idle");
                            setCells(generateInitialGrid());
                            setClicks([]);
                          }}
                          className="px-2.5 py-1 bg-white text-black hover:bg-gray-100 rounded-lg text-[10px] font-bold transition-all shadow active:scale-95 cursor-pointer"
                        >
                          Again
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Studio Workshop Controls (Background Customizer) */}
        <div className="grid grid-cols-1 gap-6 mt-6">
          <MediaCustomizer 
            customBgImage={customBgImage} 
            onBgImageChange={setCustomBgImage} 
          />
        </div>

        {/* Python Verifier Section (at the very bottom as requested) */}
        <div className="mt-6">
          <PythonVerifier />
        </div>
      </main>

      <footer className="max-w-6xl w-full mx-auto mt-12 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 relative z-10">
        <span>© 2026 Aether Mines Simulator. Custom 9:16 Gaming Engine.</span>
        <div className="flex gap-4 mt-2 sm:mt-0 font-mono">
          <span>Python 3.12 MT19937</span>
          <span>Latency: ~2ms</span>
        </div>
      </footer>
    </div>
  );
}
