/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  History,
  TrendingUp,
  Award,
  CirclePlay,
  RotateCcw,
  Sparkles,
  Info
} from "lucide-react";
import { RoundHistoryItem, Stats } from "../types";

interface StatsPanelProps {
  stats: Stats;
  history: RoundHistoryItem[];
  onReplayRound: (round: RoundHistoryItem) => void;
  onClearStats: () => void;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({
  stats,
  history,
  onReplayRound,
  onClearStats,
}) => {
  const [activeTab, setActiveTab] = useState<"stats" | "history">("history");
  const [selectedRoundPreview, setSelectedRoundPreview] = useState<RoundHistoryItem | null>(null);

  const profitIsPositive = stats.totalProfit >= 0;

  return (
    <div className="w-full rounded-3xl glass p-5 shadow-2xl relative overflow-hidden flex flex-col gap-5">
      {/* Background Glow */}
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-cyan/5 rounded-full blur-3xl pointer-events-none" />

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex gap-2 p-1 bg-brand-bg/80 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === "history"
                ? "bg-[#1a1b31] text-brand-cyan shadow-md border border-white/5"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Bet History ({history.length})
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === "stats"
                ? "bg-[#1a1b31] text-brand-cyan shadow-md border border-white/5"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Performance Stats
          </button>
        </div>

        <button
          onClick={onClearStats}
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 font-medium transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/5"
        >
          <RotateCcw className="w-3 h-3" />
          Reset All
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "stats" ? (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {/* Net Profit */}
            <div className="p-4 bg-brand-bg/80 rounded-2xl border border-white/5 flex flex-col gap-1 shadow-inner">
              <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Net Profit</span>
              <span className={`text-lg font-bold font-mono ${profitIsPositive ? "text-emerald-400" : "text-brand-pink"}`}>
                {profitIsPositive ? "+" : ""}${stats.totalProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-gray-500 mt-1">
                Wagered: ${stats.totalWagered.toFixed(2)}
              </span>
            </div>

            {/* Total Bets */}
            <div className="p-4 bg-brand-bg/80 rounded-2xl border border-white/5 flex flex-col gap-1 shadow-inner">
              <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Bets (Win Rate)</span>
              <span className="text-lg font-bold text-white font-mono">
                {stats.totalBets}
              </span>
              <span className="text-[10px] text-gray-400 font-mono mt-1">
                {stats.totalBets > 0
                  ? `${Math.round((stats.totalWins / stats.totalBets) * 100)}% Win Rate`
                  : "0% Win Rate"}
              </span>
            </div>

            {/* Highest Multiplier */}
            <div className="p-4 bg-brand-bg/80 rounded-2xl border border-white/5 flex flex-col gap-1 shadow-inner">
              <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Peak Multiplier</span>
              <span className="text-lg font-bold text-brand-cyan font-mono flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-brand-cyan" />
                {stats.highestMultiplier.toFixed(2)}x
              </span>
              <span className="text-[10px] text-gray-500 mt-1">
                From single game
              </span>
            </div>

            {/* Highest Win Amount */}
            <div className="p-4 bg-brand-bg/80 rounded-2xl border border-white/5 flex flex-col gap-1 shadow-inner">
              <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Highest Payout</span>
              <span className="text-lg font-bold text-yellow-400 font-mono flex items-center gap-1">
                <Award className="w-4 h-4 text-yellow-500 animate-bounce" style={{ animationDuration: '3s' }} />
                ${stats.highestWinAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-gray-500 mt-1">
                Single round peak
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-3"
          >
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                No bets recorded in this session. Start playing to see your logs!
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-4">
                {/* History table list */}
                <div className="flex-1 max-h-[220px] overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                  {history.map((round) => {
                    const isWin = round.outcome === "cashed-out";
                    const isSelected = selectedRoundPreview?.id === round.id;

                    return (
                      <div
                        key={round.id}
                        onClick={() => setSelectedRoundPreview(round)}
                        className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between hover:scale-[1.01] ${
                          isSelected
                            ? "bg-brand-cyan/10 border-brand-cyan/30"
                            : "bg-brand-bg/80 border-white/5 hover:bg-[#1e2130]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isWin
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-brand-pink/10 text-brand-pink border border-brand-pink/20"
                          }`}>
                            {isWin ? "Win" : "Loss"}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-500 font-mono">
                              {new Date(round.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="text-xs text-gray-300">
                              Bet: <span className="font-mono font-bold">${round.betAmount.toFixed(2)}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex flex-col text-right">
                            <span className="text-[11px] text-gray-400 font-mono">
                              {round.minesCount} Mines ({round.revealedCellsCount} Gems)
                            </span>
                            <span className={`text-xs font-bold font-mono ${isWin ? "text-emerald-400" : "text-gray-400"}`}>
                              {isWin ? `+$${round.profit.toFixed(2)} (${round.multiplier.toFixed(2)}x)` : `-$${round.betAmount.toFixed(2)}`}
                            </span>
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReplayRound(round);
                            }}
                            className="p-1.5 rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan transition-colors flex items-center gap-1 text-[10px] font-semibold"
                            title="Interactive Replay Game Board"
                          >
                            <CirclePlay className="w-3.5 h-3.5" />
                            Replay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Round Grid Mini Preview Panel */}
                <AnimatePresence>
                  {selectedRoundPreview && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, width: 0 }}
                      animate={{ opacity: 1, scale: 1, width: "100%", maxWidth: "230px" }}
                      exit={{ opacity: 0, scale: 0.95, width: 0 }}
                      className="shrink-0 p-3 bg-brand-bg/80 rounded-2xl border border-white/5 flex flex-col gap-2 mx-auto lg:mx-0 overflow-hidden"
                    >
                      <h4 className="text-[10px] font-bold text-gray-400 font-mono uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-brand-cyan" />
                        Board Layout
                      </h4>
                      
                      {/* 5x5 Mini Preview Grid */}
                      <div className="grid grid-cols-5 gap-1 w-[160px] h-[160px] mx-auto my-2.5">
                        {Array.from({ length: 25 }).map((_, idx) => {
                          const isMine = selectedRoundPreview.gridMines[idx];
                          const clickIndex = selectedRoundPreview.clicks.indexOf(idx);
                          const isClicked = clickIndex !== -1;
                          
                          let cellBg = "bg-[#212431]/60 border border-white/5";
                          if (isMine) {
                            cellBg = isClicked 
                              ? "bg-brand-pink/50 border border-brand-pink shadow-[0_0_8px_rgba(255,0,85,0.4)]"
                              : "bg-brand-pink/10 border border-brand-pink/30";
                          } else if (isClicked) {
                            cellBg = "bg-brand-cyan/40 border border-brand-cyan shadow-[0_0_8px_rgba(0,255,204,0.4)]";
                          }

                          return (
                            <div
                              key={idx}
                              className={`rounded-md relative w-full h-full flex items-center justify-center transition-all ${cellBg}`}
                              title={isMine ? (isClicked ? "Hit Mine" : "Hidden Mine") : (isClicked ? `Gem Step ${clickIndex + 1}` : "Safe Gem")}
                            >
                              {isClicked && !isMine && (
                                <span className="text-[7px] text-emerald-100 font-mono font-bold">
                                  {clickIndex + 1}
                                </span>
                              )}
                              {isMine && (
                                <div className={`w-1.5 h-1.5 rounded-full ${isClicked ? 'bg-brand-pink animate-ping' : 'bg-brand-pink/50'}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-[9px] text-gray-500 text-center leading-tight">
                        🟢 = Safe Gem Clicks (Numbered Path)<br />
                        🔴 = Hidden & Hit Mines
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
