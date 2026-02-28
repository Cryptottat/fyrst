import { Router, Request, Response, NextFunction } from "express";
import { prisma, dbConnected } from "../lib/prisma";
import { logger } from "../utils/logger";
import { getRefundsForWallet } from "../services/refund";
import { PortfolioHolding } from "../types";

const portfolioRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/portfolio/:wallet
// ---------------------------------------------------------------------------

portfolioRouter.get(
  "/:wallet",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wallet = req.params.wallet as string;

      if (!dbConnected()) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      // Fetch all buyer records for this wallet with token info
      const buyerRecords = await prisma.buyerRecord.findMany({
        where: { buyerAddress: wallet },
        include: {
          token: {
            select: {
              mint: true,
              name: true,
              symbol: true,
              currentPrice: true,
            },
          },
        },
      });

      const holdings: PortfolioHolding[] = [];
      let totalValueSol = 0;

      for (const record of buyerRecords) {
        const balance = record.totalBought - record.totalSold;
        if (balance <= 0) continue;

        const valueSol = balance * record.token.currentPrice;
        const costBasis = balance * record.avgPrice;
        const pnlPercent =
          costBasis > 0 ? ((valueSol - costBasis) / costBasis) * 100 : 0;

        holdings.push({
          tokenMint: record.token.mint,
          tokenSymbol: record.token.symbol,
          tokenName: record.token.name,
          balance,
          valueSol,
          avgBuyPrice: record.avgPrice,
          pnlPercent: Math.round(pnlPercent * 100) / 100,
        });

        totalValueSol += valueSol;
      }

      res.json({
        success: true,
        data: {
          ownerAddress: wallet,
          holdings,
          totalValueSol: Math.round(totalValueSol * 1e9) / 1e9,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/portfolio/:wallet/refunds
// ---------------------------------------------------------------------------

portfolioRouter.get(
  "/:wallet/refunds",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wallet = req.params.wallet as string;
      const refunds = await getRefundsForWallet(wallet);

      res.json({
        success: true,
        data: refunds,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { portfolioRouter };
