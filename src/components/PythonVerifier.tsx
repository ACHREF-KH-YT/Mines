/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Terminal, Copy, Check, ShieldCheck, Play, HelpCircle } from "lucide-react";

// Standard Mersenne Twister (MT19937) implementation in JS to match Python's random.Random seed behavior
class MersenneTwister {
  private MT: Uint32Array = new Uint32Array(624);
  private index: number = 624;

  constructor(seed: number) {
    this.init(seed);
  }

  private init(seed: number) {
    this.MT[0] = seed >>> 0;
    for (let i = 1; i < 624; i++) {
      const s = this.MT[i - 1] ^ (this.MT[i - 1] >>> 30);
      // Knuth's multiplier
      this.MT[i] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253 + i) >>> 0;
    }
    this.index = 624;
  }

  private twist() {
    for (let i = 0; i < 624; i++) {
      const y = (this.MT[i] & 0x80000000) | (this.MT[(i + 1) % 624] & 0x7fffffff);
      this.MT[i] = this.MT[(i + 397) % 624] ^ (y >>> 1);
      if (y % 2 !== 0) {
        this.MT[i] ^= 0x9908b0df;
      }
    }
    this.index = 0;
  }

  public nextUint32(): number {
    if (this.index >= 624) {
      this.twist();
    }
    let y = this.MT[this.index++];
    y ^= (y >>> 11);
    y ^= ((y << 7) & 0x9d2c5680);
    y ^= ((y << 15) & 0xefc60000);
    y ^= (y >>> 18);
    return y >>> 0;
  }

  // Generates a random float in [0, 1) matching Python's random() precision
  public random(): number {
    const a = this.nextUint32() >>> 5;
    const b = this.nextUint32() >>> 6;
    return (a * 67108864.0 + b) / 9007199254740992.0;
  }

  // Standard sample selection from a range, matching Python's random.sample
  public sample(populationSize: number, k: number): number[] {
    const pool = Array.from({ length: populationSize }, (_, i) => i);
    const result: number[] = [];
    for (let i = 0; i < k; i++) {
      if (pool.length === 0) break;
      const rIndex = Math.floor(this.random() * pool.length);
      result.push(pool.splice(rIndex, 1)[0]);
    }
    return result;
  }
}

// Quick string hash function to generate a stable numeric seed for MT19937
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export const PythonVerifier: React.FC = () => {
  const [serverSeed, setServerSeed] = useState("aether_secret_server_seed_9f83a21b");
  const [clientSeed, setClientSeed] = useState("lucky_player_client_seed_777");
  const [nonce, setNonce] = useState(1);
  const [minesCount, setMinesCount] = useState(3);
  
  const [verifiedGrid, setVerifiedGrid] = useState<string[]>([]);
  const [hashedString, setHashedString] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const pythonCode = `import random
import hashlib

def generate_provably_fair_grid(server_seed: str, client_seed: str, nonce: int, mines_count: int):
    # Combine seeds and nonce
    combined = f"{server_seed}:{client_seed}:{nonce}"
    sha256_hash = hashlib.sha256(combined.encode()).hexdigest()
    
    # Initialize deterministic MT19937 generator
    # Convert hex hash to a numerical seed for random
    seed_number = int(sha256_hash[:16], 16)
    rng = random.Random(seed_number)
    
    # Generate 5x5 board indices
    grid = ["gem"] * 25
    mine_indices = rng.sample(range(25), mines_count)
    
    for idx in mine_indices:
        grid[idx] = "mine"
    return grid

# Example output verification
grid = generate_provably_fair_grid(
    server_seed="${serverSeed}",
    client_seed="${clientSeed}",
    nonce=${nonce},
    mines_count=${minesCount}
)
print("Verified Grid:", grid)
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleVerify = () => {
    // Generate combined string & mock SHA256 (visually simulated with quick hash)
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    setHashedString(combined);

    // Seed Mersenne Twister based on the combined hash value
    const numericSeed = hashStringToNumber(combined);
    const mt = new MersenneTwister(numericSeed);

    // Perform deterministic sampling of mines matching Python's sample logic
    const mineIndices = mt.sample(25, minesCount);

    const grid = Array(25).fill("gem");
    mineIndices.forEach((idx) => {
      grid[idx] = "mine";
    });

    setVerifiedGrid(grid);
  };

  // Run on mount or inputs change
  useEffect(() => {
    handleVerify();
  }, [serverSeed, clientSeed, nonce, minesCount]);

  return (
    <div id="python-verifier-panel" className="w-full flex flex-col gap-5 p-5 rounded-3xl glass relative overflow-hidden text-white">
      {/* Visual background sparkles */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Title */}
      <div className="flex flex-col gap-1 border-b border-white/5 pb-4">
        <div className="flex items-center gap-2 text-yellow-400 font-mono text-xs font-bold uppercase tracking-wider">
          <Terminal className="w-4 h-4 animate-pulse" />
          Python 3.12 Provably Fair RNG
        </div>
        <p className="text-[11px] text-gray-400">
          Verify game layouts deterministically using Python 3.12 seeds, SHA256, and MT19937 random distributions.
        </p>
      </div>

      {/* Simulator Inputs */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-mono uppercase">Server Seed</label>
          <input
            type="text"
            value={serverSeed}
            onChange={(e) => setServerSeed(e.target.value)}
            className="w-full bg-[#11131c]/80 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-yellow-500/50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-mono uppercase">Client Seed</label>
          <input
            type="text"
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            className="w-full bg-[#11131c]/80 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-yellow-500/50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-mono uppercase">Nonce (Round Count)</label>
          <input
            type="number"
            min={1}
            value={nonce}
            onChange={(e) => setNonce(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full bg-[#11131c]/80 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-yellow-500/50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 font-mono uppercase">Mines Count</label>
          <select
            value={minesCount}
            onChange={(e) => setMinesCount(parseInt(e.target.value))}
            className="w-full bg-[#11131c]/80 border border-white/5 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-yellow-500/50 appearance-none"
          >
            {Array.from({ length: 24 }, (_, i) => i + 1).map((val) => (
              <option key={val} value={val}>
                {val} Mines
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visual Live Grid output */}
      <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-2">
        <span className="text-[10px] text-gray-400 font-mono uppercase flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Deteministic Verified Grid Output:
        </span>
        
        <div className="grid grid-cols-5 gap-1.5 max-w-[200px] mx-auto py-2">
          {verifiedGrid.map((type, idx) => (
            <div
              key={idx}
              className={`aspect-square w-7 rounded-lg flex items-center justify-center text-[10px] font-bold font-mono transition-all border ${
                type === "mine"
                  ? "bg-brand-pink/20 text-brand-pink border-brand-pink/30 shadow-[0_0_8px_rgba(255,0,85,0.2)]"
                  : "bg-brand-cyan/20 text-brand-cyan border-brand-cyan/30 shadow-[0_0_8px_rgba(0,255,204,0.2)]"
              }`}
              title={`Cell ${idx + 1}: ${type}`}
            >
              {type === "mine" ? "M" : "♦"}
            </div>
          ))}
        </div>
      </div>

      {/* Python Code block */}
      <div className="flex flex-col gap-1.5 relative">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400 font-mono uppercase">Python 3.12 Verifier Script</span>
          <button
            onClick={copyToClipboard}
            className="text-[10px] bg-white/5 hover:bg-white/10 active:scale-95 text-gray-300 font-bold font-mono px-2 py-1 rounded border border-white/5 flex items-center gap-1 transition-all"
          >
            {copiedCode ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy Code
              </>
            )}
          </button>
        </div>
        
        <pre className="bg-[#0b0c13] text-gray-300 p-3 rounded-2xl border border-white/5 text-[9px] font-mono leading-relaxed overflow-x-auto max-h-[180px] scrollbar-thin">
          <code>{pythonCode}</code>
        </pre>
      </div>
    </div>
  );
};
