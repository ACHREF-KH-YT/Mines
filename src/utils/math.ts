/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Calculates combination nCr
function combinations(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;
  let result = 1;
  const k = Math.min(r, n - r);
  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i;
  }
  return result;
}

/**
 * Calculates the exact Mines multiplier based on total cells,
 * number of mines, and successfully revealed gems.
 * 
 * Formula: nCr(total, revealed) / nCr(total - mines, revealed) * (1 - houseEdge)
 */
export function calculateMultiplier(
  mines: number,
  revealedGems: number,
  houseEdge: number = 0.01 // 1% house edge by default
): number {
  if (revealedGems === 0) return 1.0;
  const totalCells = 25;
  const totalGems = totalCells - mines;

  if (revealedGems > totalGems) return 0.0;

  const totalCombos = combinations(totalCells, revealedGems);
  const winCombos = combinations(totalGems, revealedGems);

  if (winCombos === 0) return 0.0;

  const fairMultiplier = totalCombos / winCombos;
  
  // Apply house edge and round to 2 decimal places
  const payoutMultiplier = fairMultiplier * (1 - houseEdge);
  return Math.max(1.0, Math.round(payoutMultiplier * 100) / 100);
}

/**
 * Pre-generates the multiplier steps for UI feedback, so the user knows
 * what the multiplier will be for each subsequent gem they reveal.
 */
export function getMultiplierSteps(mines: number, houseEdge: number = 0.01): number[] {
  const maxSteps = 25 - mines;
  const steps: number[] = [];
  for (let i = 1; i <= maxSteps; i++) {
    steps.push(calculateMultiplier(mines, i, houseEdge));
  }
  return steps;
}
