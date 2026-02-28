import { z } from "zod";

// ---------------------------------------------------------------------------
// Common validators
// ---------------------------------------------------------------------------

const solanaAddress = z.string().min(32).max(64);

// ---------------------------------------------------------------------------
// POST /api/launches
// ---------------------------------------------------------------------------

export const createLaunchSchema = z.object({
  mint: solanaAddress,
  name: z.string().min(1).max(64),
  symbol: z.string().min(1).max(16).transform((s) => s.toUpperCase()),
  description: z.string().max(500).default(""),
  imageUrl: z.string().default(""),
  deployerAddress: solanaAddress,
  collateralAmount: z.number().min(0.01, "Minimum collateral is 0.01 SOL"),
  escrowTxSignature: z.string().min(32).optional(),
  curveTxSignature: z.string().min(32).optional(),
});

export type CreateLaunchInput = z.infer<typeof createLaunchSchema>;

// ---------------------------------------------------------------------------
// GET /api/launches query params
// ---------------------------------------------------------------------------

export const launchesQuerySchema = z.object({
  sort: z.string().optional().default("newest"),
  limit: z.string().optional().default("20"),
  offset: z.string().optional().default("0"),
});

export type LaunchesQueryInput = z.infer<typeof launchesQuerySchema>;

// ---------------------------------------------------------------------------
// POST /api/trade
// ---------------------------------------------------------------------------

export const createTradeSchema = z.object({
  tokenMint: solanaAddress,
  traderAddress: solanaAddress,
  side: z.enum(["buy", "sell"]),
  amount: z.number().positive("Amount must be positive"),
  txSignature: z.string().min(32).optional(),
  solAmount: z.number().positive().optional(),
  price: z.number().nonnegative().optional(),
});

export type CreateTradeInput = z.infer<typeof createTradeSchema>;
