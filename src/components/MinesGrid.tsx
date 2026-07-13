/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Diamond, Bomb } from "lucide-react";
import { Cell } from "../types";

interface MinesGridProps {
  cells: Cell[];
  onCellClick: (id: number) => void;
  gameStatus: "idle" | "playing" | "lost" | "cashed-out";
  shakeGrid: boolean;
  highlightedIndices?: number[]; // Used for replaying
  customBgImage?: string | null;
}

export const MinesGrid: React.FC<MinesGridProps> = ({
  cells,
  onCellClick,
  gameStatus,
  shakeGrid,
  highlightedIndices = [],
  customBgImage = null,
}) => {
  return (
    <div 
      style={customBgImage ? {
        backgroundImage: `radial-gradient(circle at center, rgba(15, 17, 24, 0.6) 0%, rgba(9, 10, 15, 0.95) 100%), url(${customBgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } : {}}
      className="relative w-full aspect-square max-w-[460px] mx-auto p-4 rounded-3xl glass shadow-2xl overflow-hidden"
    >
      {/* Absolute grid glowing elements */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-pink/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        animate={shakeGrid ? {
          x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0],
          transition: { duration: 0.5 }
        } : {}}
        className="grid grid-cols-5 gap-2 md:gap-3 h-full w-full"
      >
        {cells.map((cell) => {
          const isReplayingNext = highlightedIndices.includes(cell.id);
          const isRevealed = cell.isFlipped;
          const isGem = cell.state === "gem" || cell.state === "revealed-gem";
          const isMine = cell.state === "mine" || cell.state === "revealed-mine";
          const isExploded = cell.state === "revealed-mine-exploded";

          // Calculate interactive visual state
          let bgClass = "bg-gradient-to-br from-[#1a1b31] to-[#0d0e1a] border border-brand-cyan/15 shadow-[0_4px_12px_rgba(0,0,0,0.4)]";
          if (isRevealed) {
            if (isGem) {
              bgClass = "bg-gradient-to-br from-brand-cyan/20 to-teal-500/15 border-brand-cyan shadow-[0_0_15px_rgba(0,255,204,0.3)]";
            } else if (isExploded) {
              bgClass = "bg-gradient-to-br from-brand-pink/30 to-red-600/20 border-brand-pink shadow-[0_0_20px_rgba(255,0,85,0.5)]";
            } else if (isMine) {
              bgClass = "bg-gradient-to-br from-brand-pink/10 to-red-600/5 border-brand-pink/40 opacity-50";
            }
          } else {
            // Unrevealed state (faded if game is completed)
            if (gameStatus === "lost" || gameStatus === "cashed-out") {
              bgClass = "bg-[#0d0e1a]/80 border-white/5 opacity-40 cursor-not-allowed";
            } else if (gameStatus === "playing") {
              bgClass = "bg-gradient-to-br from-[#1a1b31] to-[#0d0e1a] border border-brand-cyan/20 shadow-[0_4px_12px_rgba(0,0,0,0.4)] cursor-pointer hover:border-brand-cyan hover:shadow-[0_0_15px_rgba(0,255,204,0.2)]";
            } else {
              bgClass = "bg-gradient-to-br from-[#1a1b31] to-[#0d0e1a] border border-white/5 opacity-70 cursor-not-allowed";
            }
          }

          // Highlight element during replays
          if (isReplayingNext) {
            bgClass += " ring-2 ring-yellow-400 scale-105 shadow-[0_0_15px_rgba(250,204,21,0.5)]";
          }

          return (
            <motion.button
              key={cell.id}
              id={`mines-cell-${cell.id}`}
              onClick={() => onCellClick(cell.id)}
              disabled={isRevealed || gameStatus !== "playing"}
              whileHover={!isRevealed && gameStatus === "playing" ? { scale: 1.05, y: -2 } : {}}
              whileTap={!isRevealed && gameStatus === "playing" ? { scale: 0.95 } : {}}
              layout
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className={`relative aspect-square w-full rounded-2xl flex items-center justify-center transition-all duration-300 outline-none select-none overflow-hidden ${bgClass}`}
            >
              <AnimatePresence mode="wait">
                {isRevealed ? (
                  <motion.div
                    key="revealed"
                    initial={{ rotateY: -90, scale: 0.3, opacity: 0 }}
                    animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                    exit={{ rotateY: 90, scale: 0.3, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className="flex items-center justify-center w-full h-full p-1"
                  >
                    {isGem ? (
                      <div className="relative flex items-center justify-center w-full h-full">
                        {/* Shimmer effect inside gem */}
                        <div className="absolute w-6 h-6 bg-brand-cyan/40 rounded-full filter blur-xl opacity-60 animate-pulse" />
                        <Diamond className="w-7 h-7 text-brand-cyan filter drop-shadow-[0_0_8px_rgba(0,255,204,0.5)]" strokeWidth={2} />
                      </div>
                    ) : (
                      <div className="relative flex items-center justify-center w-full h-full">
                        <div className={`absolute w-7 h-7 rounded-full filter blur-xl opacity-70 animate-pulse ${isExploded ? 'bg-brand-pink' : 'bg-brand-pink/30'}`} />
                        <Bomb className={`w-7 h-7 filter drop-shadow-[0_0_8px_rgba(255,0,85,0.5)] ${isExploded ? 'text-brand-pink scale-110' : 'text-brand-pink/60'}`} strokeWidth={2} />
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="hidden"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-2.5 h-2.5 rounded-full bg-[#3d425c] transition-colors duration-300"
                  />
                )}
              </AnimatePresence>

              {/* Absolute glowing border overlay for revealed exploded mine */}
              {isExploded && (
                <div className="absolute inset-0 border border-brand-pink rounded-2xl animate-ping opacity-45 pointer-events-none" />
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};
