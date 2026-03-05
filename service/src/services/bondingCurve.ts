import { BondingCurveState } from "../types";
import { logger } from "../utils/logger";
import { prisma, dbConnected } from "../lib/prisma";

// ---------------------------------------------------------------------------
// Bonding curve constants (pump.fun style constant product AMM)
// ---------------------------------------------------------------------------

const INITIAL_VIRTUAL_TOKEN = 1_073_000_000; // 1.073B tokens (UI units)
const INITIAL_VIRTUAL_SOL = 30; // 30 SOL
const INITIAL_REAL_TOKEN = 793_100_000; // 793.1M tokens
const GRADUATION_RESERVE_SOL = 5; // SOL reserve to graduate (devnet testing)

// ---------------------------------------------------------------------------
// Pure calculation helpers (constant product AMM: x * y = k)
// ---------------------------------------------------------------------------

/**
 * Spot price at given virtual reserves.
 *   price = virtualSol / virtualToken  (SOL per token)
 */
export function spotPrice(virtualToken: number, virtualSol: number): number {
  if (virtualToken === 0) return 0;
  return virtualSol / virtualToken;
}

/**
 * Cost to buy `amount` tokens using constant product AMM.
 *   sol_cost = virtualSol - k / (virtualToken + amount)
 *   → sol_cost = virtualSol * amount / (virtualToken - amount)  (rearranged)
 *   Actually: tokens_out for a given sol_in, but here we solve for sol given tokens:
 *   new_vt = virtualToken - amount
 *   new_vs = k / new_vt
 *   sol_cost = new_vs - virtualSol
 */
export function calculateBuyCost(
  virtualToken: number,
  virtualSol: number,
  amount: number
): number {
  if (amount <= 0 || virtualToken <= amount) return Infinity;
  const k = virtualToken * virtualSol;
  const newVt = virtualToken - amount;
  const newVs = k / newVt;
  return newVs - virtualSol;
}

/**
 * Tokens received for a given SOL input.
 *   tokens_out = virtualToken - k / (virtualSol + solIn)
 */
export function calculateBuyTokens(
  virtualToken: number,
  virtualSol: number,
  solIn: number
): number {
  if (solIn <= 0) return 0;
  const k = virtualToken * virtualSol;
  const newVs = virtualSol + solIn;
  const newVt = k / newVs;
  return virtualToken - newVt;
}

/**
 * SOL received when selling `amount` tokens.
 *   sol_out = virtualSol - k / (virtualToken + amount)
 */
export function calculateSellReturn(
  virtualToken: number,
  virtualSol: number,
  amount: number
): number {
  if (amount <= 0) return 0;
  const k = virtualToken * virtualSol;
  const newVt = virtualToken + amount;
  const newVs = k / newVt;
  return virtualSol - newVs;
}

/**
 * Estimate slippage: percentage difference between spot price and effective
 * average price for the given trade size.
 */
export function estimateSlippage(
  virtualToken: number,
  virtualSol: number,
  amount: number,
  side: "buy" | "sell"
): number {
  const spot = spotPrice(virtualToken, virtualSol);
  if (spot === 0) return 0;

  let totalCost: number;
  if (side === "buy") {
    totalCost = calculateBuyCost(virtualToken, virtualSol, amount);
  } else {
    totalCost = calculateSellReturn(virtualToken, virtualSol, amount);
  }
  const avgPrice = totalCost / amount;
  return Math.abs((avgPrice - spot) / spot) * 100; // percentage
}

/**
 * Calculate the bonding curve progress towards graduation (0-100).
 * Based on real SOL reserves vs graduation threshold.
 */
export function calculateProgress(
  realSolReserves: number,
): number {
  const progress = (realSolReserves / GRADUATION_RESERVE_SOL) * 100;
  return Math.min(100, progress);
}

/**
 * Approximate virtual reserves given current supply (tokens sold).
 * Uses constant product invariant from initial state.
 * Not perfectly accurate if sells occurred (path-dependent), but good enough
 * for display/recording purposes.
 */
export function approximateReserves(currentSupply: number): { virtualToken: number; virtualSol: number; realSol: number } {
  const k = INITIAL_VIRTUAL_TOKEN * INITIAL_VIRTUAL_SOL;
  const virtualToken = INITIAL_VIRTUAL_TOKEN - currentSupply;
  if (virtualToken <= 0) {
    return { virtualToken: 1, virtualSol: k, realSol: GRADUATION_RESERVE_SOL };
  }
  const virtualSol = k / virtualToken;
  const realSol = virtualSol - INITIAL_VIRTUAL_SOL;
  return { virtualToken, virtualSol, realSol: Math.max(0, realSol) };
}

/**
 * Spot price approximated from current supply (convenience wrapper).
 */
export function spotPriceFromSupply(currentSupply: number): number {
  const { virtualToken, virtualSol } = approximateReserves(currentSupply);
  return spotPrice(virtualToken, virtualSol);
}

// ---------------------------------------------------------------------------
// Database-backed helpers
// ---------------------------------------------------------------------------

/**
 * Fetch the current state of a bonding curve for a given token.
 * If DB is unavailable, returns a mock zero-state.
 */
export async function getBondingCurveState(
  tokenMint: string
): Promise<BondingCurveState> {
  logger.info(`Fetching bonding curve state for token: ${tokenMint}`);

  const defaultState: BondingCurveState = {
    tokenMint,
    currentSupply: 0,
    currentPrice: spotPrice(INITIAL_VIRTUAL_TOKEN, INITIAL_VIRTUAL_SOL),
    reserveBalance: 0,
    graduated: false,
  };

  if (!dbConnected()) {
    return defaultState;
  }

  try {
    const token = await prisma.token.findUnique({
      where: { mint: tokenMint },
    });

    if (!token) {
      return defaultState;
    }

    return {
      tokenMint,
      currentSupply: token.totalSupply,
      currentPrice: token.currentPrice,
      reserveBalance: token.marketCap, // reserve approximation
      graduated: token.graduated,
    };
  } catch (err) {
    logger.error("Failed to fetch bonding curve state", err);
    return defaultState;
  }
}
