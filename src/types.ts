/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CellState = 
  | 'unrevealed' 
  | 'gem' 
  | 'mine' 
  | 'revealed-gem' 
  | 'revealed-mine'
  | 'revealed-mine-exploded';

export interface Cell {
  id: number; // 0 to 24
  state: CellState;
  isRealMine: boolean; // Hidden answer
  isFlipped: boolean;
}

export type GameStatus = 'idle' | 'playing' | 'lost' | 'cashed-out';

export interface RoundHistoryItem {
  id: string;
  timestamp: number;
  betAmount: number;
  minesCount: number;
  outcome: 'lost' | 'cashed-out';
  multiplier: number;
  profit: number;
  revealedCellsCount: number;
  // Store the state and selections of the round for review or "replay"
  gridMines: boolean[]; // 25 booleans of where mines were
  clicks: number[]; // Ordered list of cell indices clicked by the user
}

export interface Stats {
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  totalWagered: number;
  totalProfit: number;
  highestMultiplier: number;
  highestWinAmount: number;
}
