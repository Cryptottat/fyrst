import { BondingCurveState } from "../types";
import { logger } from "../utils/logger";

/**
 * Calculate the price for a given token supply and purchase amount
 * using the bonding curve formula.
 *
 * FYRST uses a linear bonding curve: price = basePrice + slope * supply
 *
 * @param currentSupply - Current circulating supply of the token
 * @param purchaseAmount - Number of tokens being purchased
 * @returns Total cost in SOL for the purchase
 */
export function calculatePrice(
  currentSupply: number,
  purchaseAmount: number
): number {
  // TODO: Implement bonding curve pricing formula
  // Linear bonding curve: P(s) = base + slope * s
  // Cost to buy N tokens from supply S:
  //   integral from S to S+N of P(s) ds
  //   = base * N + slope * (N * S + N^2 / 2)
  logger.debug(
    `Calculating price: supply=${currentSupply} amount=${purchaseAmount}`
  );

  const basePrice = 0.00001; // SOL per token at supply=0
  const slope = 0.0000001; // Price increase per token

  const cost =
    basePrice * purchaseAmount +
    slope * (purchaseAmount * currentSupply + (purchaseAmount ** 2) / 2);

  return cost;
}

/**
 * Fetch the current state of a bonding curve for a given token.
 *
 * @param tokenMint - Token mint address
 * @returns Current bonding curve state
 */
export async function getBondingCurveState(
  tokenMint: string
): Promise<BondingCurveState> {
  // TODO: Fetch bonding curve state from on-chain program
  // 1. Derive bonding curve PDA from token mint
  // 2. Fetch account data
  // 3. Deserialize and return
  logger.info(`Fetching bonding curve state for token: ${tokenMint}`);

  return {
    tokenMint,
    currentSupply: 0,
    currentPrice: 0,
    reserveBalance: 0,
    graduated: false,
  };
}
