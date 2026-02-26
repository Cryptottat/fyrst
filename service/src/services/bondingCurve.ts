import { BondingCurveState } from "../types";
import { logger } from "../utils/logger";
import { prisma, dbConnected } from "../lib/prisma";

// ---------------------------------------------------------------------------
// Bonding curve constants
// ---------------------------------------------------------------------------

const BASE_PRICE = 0.0001; // SOL per token at supply = 0
const SLOPE = 0.00000001; // Price increase per unit of supply
const GRADUATION_MARKET_CAP = 69_000; // SOL market cap to graduate (like pump.fun)

// ---------------------------------------------------------------------------
// Pure calculation helpers
// ---------------------------------------------------------------------------

/**
 * Spot price at a given supply level.
 *   price = basePrice + slope * supply
 */
export function spotPrice(supply: number): number {
  return BASE_PRICE + SLOPE * supply;
}

/**
 * Cost to buy `amount` tokens starting from `currentSupply`.
 * Uses integral of the linear bonding curve:
 *   Cost = basePrice * amount + slope * (amount * currentSupply + amount^2 / 2)
 */
export function calculateBuyCost(
  currentSupply: number,
  amount: number
): number {
  const cost =
    BASE_PRICE * amount +
    SLOPE * (amount * currentSupply + (amount * amount) / 2);
  return cost;
}

/**
 * SOL received when selling `amount` tokens starting from `currentSupply`.
 * Integral runs from (supply - amount) to supply.
 */
export function calculateSellReturn(
  currentSupply: number,
  amount: number
): number {
  if (amount > currentSupply) {
    throw new Error("Cannot sell more than current supply");
  }
  const newSupply = currentSupply - amount;
  return calculateBuyCost(newSupply, amount);
}

/**
 * Estimate slippage: percentage difference between spot price and effective
 * average price for the given trade size.
 */
export function estimateSlippage(
  currentSupply: number,
  amount: number,
  side: "buy" | "sell"
): number {
  const spot = spotPrice(currentSupply);
  if (spot === 0) return 0;

  let totalCost: number;
  if (side === "buy") {
    totalCost = calculateBuyCost(currentSupply, amount);
  } else {
    totalCost = calculateSellReturn(currentSupply, amount);
  }
  const avgPrice = totalCost / amount;
  return Math.abs((avgPrice - spot) / spot) * 100; // percentage
}

/**
 * Calculate the bonding curve progress towards graduation (0-100).
 */
export function calculateProgress(
  currentSupply: number,
  currentPrice: number
): number {
  const marketCap = currentSupply * currentPrice;
  const progress = (marketCap / GRADUATION_MARKET_CAP) * 100;
  return Math.min(100, progress);
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

  if (!dbConnected()) {
    // TODO: In Phase 6 this will also query on-chain program accounts
    return {
      tokenMint,
      currentSupply: 0,
      currentPrice: BASE_PRICE,
      reserveBalance: 0,
      graduated: false,
    };
  }

  try {
    const token = await prisma.token.findUnique({
      where: { mint: tokenMint },
    });

    if (!token) {
      return {
        tokenMint,
        currentSupply: 0,
        currentPrice: BASE_PRICE,
        reserveBalance: 0,
        graduated: false,
      };
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
    return {
      tokenMint,
      currentSupply: 0,
      currentPrice: BASE_PRICE,
      reserveBalance: 0,
      graduated: false,
    };
  }
}
