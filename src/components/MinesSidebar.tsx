/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Coins, 
  Sliders, 
  Play, 
  TrendingUp, 
  Info,
  Volume2,
  VolumeX,
  Music,
  Video,
  Square,
  Download,
  Flame,
  Disc
} from "lucide-react";

interface MinesSidebarProps {
  balance: number;
  betAmount: number;
  setBetAmount: (amount: number) => void;
  minesCount: number;
  setMinesCount: (count: number) => void;
  gameStatus: "idle" | "playing" | "lost" | "cashed-out";
  onStartGame: (isAutoMode?: boolean) => void;
  onCashOut: () => void;
  revealedCount: number;
  currentMultiplier: number;
  nextMultiplier: number;
  onResetBalance: () => void;
  isCompact?: boolean;

  // Audio Mixer States
  sfxVolume?: number;
  setSfxVolume?: (v: number) => void;
  musicVolume?: number;
  setMusicVolume?: (v: number) => void;
  isMusicOn?: boolean;
  setIsMusicOn?: (v: boolean) => void;
  handleToggleMusic?: () => void;

  // Recording States
  isRecording?: boolean;
  recordDuration?: number;
  videoUrl?: string | null;
  recordingError?: string | null;
  startScreenRecording?: () => void;
  stopScreenRecording?: () => void;
  onReplayClick?: () => void;
  isReplaying?: boolean;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export const MinesSidebar: React.FC<MinesSidebarProps> = ({
  balance,
  betAmount,
  setBetAmount,
  minesCount,
  setMinesCount,
  gameStatus,
  onStartGame,
  onCashOut,
  revealedCount,
  currentMultiplier,
  nextMultiplier,
  onResetBalance,
  isCompact = false,

  // Audio & Recording Props (with defaults to ensure safety)
  sfxVolume = 0.5,
  setSfxVolume = (_v: number) => {},
  musicVolume = 0.2,
  setMusicVolume = (_v: number) => {},
  isMusicOn = false,
  setIsMusicOn = (_v: boolean) => {},
  handleToggleMusic = () => {},

  isRecording = false,
  recordDuration = 0,
  videoUrl = null,
  recordingError = null,
  startScreenRecording = () => {},
  stopScreenRecording = () => {},
  onReplayClick,
  isReplaying = false,
}) => {
  const [activeTab, setActiveTab] = useState<"manual" | "auto" | "audio" | "record">("manual");
  const [autoBetsCount, setAutoBetsCount] = useState<number>(10);
  const [onWinAction, setOnWinAction] = useState<"reset" | "increase">("reset");
  const [onWinPercent, setOnWinPercent] = useState<number>(100);
  const [onLossAction, setOnLossAction] = useState<"reset" | "increase">("reset");
  const [onLossPercent, setOnLossPercent] = useState<number>(100);
  const [isAutoRunning, setIsAutoRunning] = useState<boolean>(false);

  const handleHalfBet = () => {
    if (gameStatus === "playing") return;
    setBetAmount(Math.max(0.1, Math.round((betAmount / 2) * 100) / 100));
  };

  const handleDoubleBet = () => {
    if (gameStatus === "playing") return;
    setBetAmount(Math.min(balance, Math.round(betAmount * 2 * 100) / 100));
  };

  const handleMaxBet = () => {
    if (gameStatus === "playing") return;
    setBetAmount(Math.round(balance * 100) / 100);
  };

  const handleMinBet = () => {
    if (gameStatus === "playing") return;
    setBetAmount(0.1);
  };

  const handleStart = () => {
    if (activeTab === "auto") {
      setIsAutoRunning(true);
      onStartGame(true);
    } else {
      onStartGame(false);
    }
  };

  return (
    <div className={isCompact ? "w-full flex flex-col gap-3 shrink-0" : "w-full lg:w-[320px] flex flex-col gap-4 p-5 rounded-3xl glass shadow-2xl relative overflow-hidden shrink-0"}>
      {/* Background glow */}
      {!isCompact && <div className="absolute top-0 right-0 w-32 h-32 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />}

      {/* Balance Indicator & Quick Reset */}
      <div className={`flex items-center justify-between bg-brand-bg/80 rounded-2xl border border-white/5 shadow-inner ${isCompact ? 'p-2' : 'p-3.5'}`}>
        <div className="flex flex-col">
          <span className="text-[9px] text-gray-400 font-mono tracking-wider uppercase">Wallet Balance</span>
          <div className="flex items-center gap-1 mt-0.5">
            <Coins className="w-3.5 h-3.5 text-yellow-500" />
            <span className={`font-bold text-white font-mono ${isCompact ? 'text-sm' : 'text-lg'}`}>
              ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <button
          onClick={onResetBalance}
          disabled={gameStatus === "playing"}
          className="px-2 py-0.5 text-[10px] font-medium bg-white/5 hover:bg-white/10 active:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-gray-300 transition-colors border border-white/5"
        >
          Reset
        </button>
      </div>

      {/* Manual / Auto / Audio / Record Mode Tabs */}
      <div className="grid grid-cols-4 p-1 bg-brand-bg/80 rounded-xl border border-white/5 gap-0.5 sm:gap-1">
        <button
          onClick={() => gameStatus !== "playing" && setActiveTab("manual")}
          disabled={gameStatus === "playing"}
          className={`py-2 px-0.5 text-[10px] font-bold rounded-lg transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${
            activeTab === "manual"
              ? "bg-[#1a1b31] text-white shadow-md border border-white/5"
              : "text-gray-400 hover:text-gray-200 disabled:opacity-40"
          }`}
        >
          Manual
        </button>
        <button
          onClick={() => gameStatus !== "playing" && setActiveTab("auto")}
          disabled={gameStatus === "playing"}
          className={`py-2 px-0.5 text-[10px] font-bold rounded-lg transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${
            activeTab === "auto"
              ? "bg-[#1a1b31] text-white shadow-md border border-white/5"
              : "text-gray-400 hover:text-gray-200 disabled:opacity-40"
          }`}
        >
          Auto (AI)
        </button>
        <button
          onClick={() => setActiveTab("audio")}
          className={`py-2 px-0.5 text-[10px] font-bold rounded-lg transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${
            activeTab === "audio"
              ? "bg-[#1a1b31] text-white shadow-md border border-white/5"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Audio
        </button>
        <button
          onClick={() => setActiveTab("record")}
          className={`py-2 px-0.5 text-[10px] font-bold rounded-lg transition-all duration-200 flex flex-col items-center justify-center cursor-pointer ${
            activeTab === "record"
              ? "bg-[#1a1b31] text-white shadow-md border border-white/5"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Record
        </button>
      </div>

      {/* Betting & Settings Config Fields */}
      <div className="flex flex-col gap-3.5">
        {(activeTab === "manual" || activeTab === "auto") && (
          <>
            {/* Bet Amount */}
            <div className="flex flex-col gap-1.5 animate-fadeIn">
              <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                <span>Bet Amount</span>
                <span className="font-mono text-[11px]">${betAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center bg-brand-bg/80 rounded-xl border border-white/5 p-1">
                <input
                  type="number"
                  value={betAmount || ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setBetAmount(isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  disabled={gameStatus === "playing"}
                  className="w-full bg-transparent border-none outline-none text-white font-mono text-sm px-2.5 py-1.5"
                  placeholder="0.00"
                  step="0.1"
                  min="0.1"
                />
                <div className="flex items-center gap-1 pr-1.5">
                  <button
                    onClick={handleHalfBet}
                    disabled={gameStatus === "playing"}
                    className="px-2 py-1 text-[11px] font-semibold bg-white/5 hover:bg-[#212431] active:scale-95 disabled:opacity-40 rounded text-gray-300 transition-all font-mono"
                  >
                    ½
                  </button>
                  <button
                    onClick={handleDoubleBet}
                    disabled={gameStatus === "playing"}
                    className="px-2 py-1 text-[11px] font-semibold bg-white/5 hover:bg-[#212431] active:scale-95 disabled:opacity-40 rounded text-gray-300 transition-all font-mono"
                  >
                    2x
                  </button>
                  <button
                    onClick={handleMaxBet}
                    disabled={gameStatus === "playing"}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20 active:scale-95 disabled:opacity-40 rounded transition-all font-mono"
                  >
                    Max
                  </button>
                </div>
              </div>
            </div>

            {/* Mines Count */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-gray-400 font-medium">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-brand-cyan" /> Mines
                </span>
                <span className="font-mono text-brand-cyan font-bold bg-brand-cyan/10 px-2 py-0.5 rounded-md">
                  {minesCount}
                </span>
              </div>
              <select
                value={minesCount}
                onChange={(e) => setMinesCount(parseInt(e.target.value))}
                disabled={gameStatus === "playing"}
                className="w-full bg-brand-bg/80 border border-white/5 text-white rounded-xl py-2 px-3 outline-none text-sm transition-all focus:border-brand-cyan/50 appearance-none cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((val) => (
                  <option key={val} value={val} className="bg-[#11131c]">
                    {val} {val === 1 ? "Mine" : "Mines"} (Gems: {25 - val})
                  </option>
                ))}
              </select>
            </div>

            {/* Auto Tab Fields */}
            {activeTab === "auto" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex flex-col gap-3.5 pt-2 border-t border-white/5 overflow-hidden"
              >
                {/* Number of Bets */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-medium">Number of Bets</label>
                  <input
                    type="number"
                    value={autoBetsCount}
                    onChange={(e) => setAutoBetsCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#171a25] border border-white/5 text-white rounded-xl py-2 px-3 outline-none text-xs font-mono"
                    placeholder="10"
                  />
                </div>

                {/* On Win Adjustments */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-medium">On Win</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setOnWinAction("reset")}
                      className={`py-1.5 text-[10px] rounded-lg border font-semibold ${
                        onWinAction === "reset"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-[#171a25] text-gray-400 border-white/5"
                      }`}
                    >
                      Reset Bet
                    </button>
                    <button
                      onClick={() => setOnWinAction("increase")}
                      className={`py-1.5 text-[10px] rounded-lg border font-semibold ${
                        onWinAction === "increase"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-[#171a25] text-gray-400 border-white/5"
                      }`}
                    >
                      Increase Bet
                    </button>
                  </div>
                  {onWinAction === "increase" && (
                    <div className="flex items-center gap-1.5 bg-[#171a25] rounded-lg border border-white/5 px-2 py-1 mt-1">
                      <input
                        type="number"
                        value={onWinPercent}
                        onChange={(e) => setOnWinPercent(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-transparent text-white font-mono text-xs outline-none"
                      />
                      <span className="text-xs text-gray-400 font-mono">%</span>
                    </div>
                  )}
                </div>

                {/* On Loss Adjustments */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-medium">On Loss</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setOnLossAction("reset")}
                      className={`py-1.5 text-[10px] rounded-lg border font-semibold ${
                        onLossAction === "reset"
                          ? "bg-red-500/10 text-red-400 border-red-500/30"
                          : "bg-[#171a25] text-gray-400 border-white/5"
                      }`}
                    >
                      Reset Bet
                    </button>
                    <button
                      onClick={() => setOnLossAction("increase")}
                      className={`py-1.5 text-[10px] rounded-lg border font-semibold ${
                        onLossAction === "increase"
                          ? "bg-red-500/10 text-red-400 border-red-500/30"
                          : "bg-[#171a25] text-gray-400 border-white/5"
                      }`}
                    >
                      Increase Bet
                    </button>
                  </div>
                  {onLossAction === "increase" && (
                    <div className="flex items-center gap-1.5 bg-[#171a25] rounded-lg border border-white/5 px-2 py-1 mt-1">
                      <input
                        type="number"
                        value={onLossPercent}
                        onChange={(e) => setOnLossPercent(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-transparent text-white font-mono text-xs outline-none"
                      />
                      <span className="text-xs text-gray-400 font-mono">%</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Audio mixer controls */}
        {activeTab === "audio" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-3.5"
          >
            {/* SFX Volume Bar */}
            <div className="flex flex-col gap-1.5 p-3 bg-brand-bg/80 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                  <Flame className="w-3.5 h-3.5 text-brand-pink animate-pulse" />
                  Game Effects (SFX)
                </span>
                <span className="font-mono text-brand-cyan text-[11px] font-bold">{Math.round(sfxVolume * 100)}%</span>
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <button
                  onClick={() => setSfxVolume(sfxVolume > 0 ? 0 : 0.5)}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-brand-cyan transition-all border border-white/5 cursor-pointer"
                >
                  {sfxVolume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-brand-cyan transition-all"
                />
              </div>
            </div>

            {/* Music Volume Bar */}
            <div className="flex flex-col gap-1.5 p-3 bg-brand-bg/80 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5 font-medium">
                  <Music className={`w-3.5 h-3.5 text-purple-400 ${isMusicOn ? "animate-spin" : ""}`} style={{ animationDuration: '6s' }} />
                  Ambient Music
                </span>
                <span className="font-mono text-purple-400 text-[11px] font-bold">{Math.round(musicVolume * 100)}%</span>
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <button
                  onClick={handleToggleMusic}
                  className={`p-1.5 rounded transition-all text-xs font-semibold px-2.5 flex items-center gap-1 border cursor-pointer ${
                    isMusicOn
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                      : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10"
                  }`}
                >
                  {isMusicOn ? <Music className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{isMusicOn ? "ON" : "OFF"}</span>
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={musicVolume}
                  disabled={!isMusicOn}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg cursor-pointer accent-purple-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Screen Recorder controls */}
        {activeTab === "record" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-3 p-3 bg-brand-bg/80 rounded-2xl border border-white/5 justify-center relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                {isRecording ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-pink animate-ping" />
                    <span className="text-brand-pink font-bold">RECORDING GAMEPLAY</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                    <span>Recorder Standby</span>
                  </>
                )}
              </span>
              {isRecording && (
                <span className="font-mono text-xs text-brand-pink bg-brand-pink/10 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                  {formatDuration(recordDuration)}
                </span>
              )}
            </div>

            {recordingError && (
              <div className="text-[10px] text-brand-pink bg-brand-pink/5 border border-brand-pink/10 p-2 rounded-lg mt-1 font-mono leading-tight">
                {recordingError}
              </div>
            )}

            <div className="flex flex-col gap-2 mt-1">
              {isRecording ? (
                <button
                  onClick={stopScreenRecording}
                  className="w-full py-2.5 rounded-xl bg-brand-pink hover:bg-brand-pink/85 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-brand-pink/20 cursor-pointer border border-brand-pink/20"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  Stop & Save Video
                </button>
              ) : (
                <button
                  onClick={startScreenRecording}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-brand-pink hover:from-purple-500 hover:to-brand-pink/85 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/10 cursor-pointer border border-white/5"
                >
                  <Disc className="w-3.5 h-3.5 text-white animate-pulse" />
                  Record Game Video
                </button>
              )}

              {onReplayClick && (
                <button
                  onClick={onReplayClick}
                  disabled={isReplaying}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-gray-300 transition-all border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Replay Last Bet</span>
                </button>
              )}
            </div>

            {/* Download Action for generated video URL */}
            <AnimatePresence>
              {videoUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-2 p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-between text-xs"
                >
                  <span className="text-emerald-400 font-medium">Video Ready!</span>
                  <a
                    href={videoUrl}
                    download={`mines_win_clip_${Date.now()}.webm`}
                    className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded transition-colors flex items-center gap-1 cursor-pointer text-[10px]"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Small Bet Summary when not on Manual/Auto tabs */}
      {(activeTab === "audio" || activeTab === "record") && gameStatus !== "playing" && (
        <div className="text-[10px] text-gray-400 font-mono flex items-center justify-center gap-2 bg-white/5 py-1 px-3 rounded-lg border border-white/5 mt-1">
          <span>Active Bet: <b className="text-brand-cyan">${betAmount.toFixed(2)}</b></span>
          <span className="text-white/15">|</span>
          <span>Mines: <b className="text-brand-cyan">{minesCount}</b></span>
        </div>
      )}

      {/* Dynamic Multiplier Tracker when playing */}
      {gameStatus === "playing" && revealedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 p-3 bg-brand-cyan/5 rounded-2xl border border-brand-cyan/10 flex flex-col gap-1"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Revealed Gems</span>
            <span className="text-brand-cyan font-bold font-mono">
              {revealedCount} / {25 - minesCount}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Current Payout</span>
            <span className="text-emerald-400 font-bold font-mono">
              ${(betAmount * currentMultiplier).toFixed(2)} ({currentMultiplier.toFixed(2)}x)
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1.5 mt-1 border-t border-brand-cyan/10">
            <span className="text-gray-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-brand-cyan" /> Next Gem
            </span>
            <span className="text-brand-cyan font-bold font-mono">
              {(betAmount * nextMultiplier).toFixed(2)} ({nextMultiplier.toFixed(2)}x)
            </span>
          </div>
        </motion.div>
      )}

      {/* Primary Action Button */}
      <div className={`mt-auto ${isCompact ? 'pt-2' : 'pt-4'}`}>
        {gameStatus === "playing" ? (
          <button
            onClick={onCashOut}
            className={`w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/25 ${isCompact ? 'py-3 text-xs' : 'py-4'}`}
          >
            <span>Cash Out</span>
            <span className="bg-white/20 px-2.5 py-0.5 rounded-lg text-xs font-mono">
              ${(betAmount * currentMultiplier).toFixed(2)}
            </span>
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={betAmount <= 0 || betAmount > balance || balance < 0.1}
            className={`w-full rounded-2xl bg-gradient-to-r from-brand-cyan to-purple-600 hover:from-brand-cyan/85 hover:to-purple-500 disabled:from-gray-800 disabled:to-gray-900 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-95 text-white font-bold tracking-wide shadow-lg shadow-brand-cyan/20 hover:shadow-brand-cyan/30 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border border-white/5 ${isCompact ? 'py-3 text-xs' : 'py-4 text-sm'}`}
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>
              {activeTab === "auto" ? "Start AI Auto Bet" : "Bet / Start Game"}
            </span>
          </button>
        )}
      </div>

      {/* Informative text below */}
      <div className="flex items-center gap-1.5 justify-center mt-1 text-[10px] text-gray-500">
        <Info className="w-3 h-3" />
        <span>House Edge: 1.0% | Min bet: $0.10</span>
      </div>
    </div>
  );
};
