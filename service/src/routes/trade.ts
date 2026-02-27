import { Router, Request, Response, NextFunction } from "express";
import { prisma, dbConnected } from "../lib/prisma";
import { mockStore } from "../lib/mockStore";
import { logger } from "../utils/logger";
import { validateBody } from "../middleware/validate";
import { createTradeSchema } from "../schemas";
import {
  calculateBuyCost,
  calculateSellReturn,
  spotPrice,
  estimateSlippage,
  calculateProgress,
} from "../services/bondingCurve";
import { getIo } from "../socketManager";

const tradeRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/trade
// ---------------------------------------------------------------------------

tradeRouter.post(
  "/",
  validateBody(createTradeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tokenMint, traderAddress, side, amount, txSignature: clientTxSig, solAmount: clientSolAmount, price: clientPrice } = req.body as {
        tokenMint: string;
        traderAddress: string;
        side: "buy" | "sell";
        amount: number;
        txSignature?: string;
        solAmount?: number;
        price?: number;
      };

      // ----- Mock mode -----
      if (!dbConnected()) {
        const currentSupply = mockStore.getTokenSupply(tokenMint);
        const supply = currentSupply || 1_000_000;
        const totalSol =
          side === "buy"
            ? calculateBuyCost(supply, amount)
            : calculateSellReturn(supply, amount);
        const newSupply = side === "buy" ? supply + amount : Math.max(0, supply - amount);
        const newPrice = spotPrice(newSupply);
        const slippage = estimateSlippage(supply, amount, side);
        const newMarketCap = newSupply * newPrice;
        const progress = calculateProgress(newSupply, newPrice);
        const graduated = progress >= 100;

        // Update token state in store
        mockStore.updateTokenAfterTrade(tokenMint, newSupply, newPrice, newMarketCap, progress, graduated);

        const mockTrade = {
          id: `mock_${Date.now()}`,
          tokenMint,
          traderAddress,
          side,
          amount,
          price: newPrice,
          totalSol,
          txSignature: clientTxSig || `tx_${side}_${Date.now()}`,
          createdAt: new Date().toISOString(),
          slippage,
          newPrice,
          newSupply,
          bondingCurveProgress: progress,
          graduated,
        };

        mockStore.addTrade(mockTrade);

        // Emit socket events
        try {
          const io = getIo();
          if (io) {
            io.emit("trade:executed", mockTrade);
            io.emit("price:update", { tokenMint, price: newPrice, marketCap: newMarketCap, supply: newSupply, bondingCurveProgress: progress });
          }
        } catch {
          // Socket not initialized
        }

        res.status(201).json({ success: true, data: mockTrade });
        return;
      }

      // ----- DB mode -----

      // Fetch token to get current supply
      const token = await prisma.token.findUnique({
        where: { mint: tokenMint },
      });

      if (!token) {
        res.status(404).json({ success: false, error: "Token not found" });
        return;
      }

      const currentSupply = token.totalSupply;
      let totalSol: number;
      let newSupply: number;

      if (side === "buy") {
        totalSol = calculateBuyCost(currentSupply, amount);
        newSupply = currentSupply + amount;
      } else {
        // Validate sufficient supply
        if (amount > currentSupply) {
          res.status(400).json({
            success: false,
            error: "Sell amount exceeds current supply",
          });
          return;
        }

        // Validate seller has enough balance
        const buyerRecord = await prisma.buyerRecord.findUnique({
          where: {
            buyerAddress_tokenMint: {
              buyerAddress: traderAddress,
              tokenMint,
            },
          },
        });

        const balance = buyerRecord
          ? buyerRecord.totalBought - buyerRecord.totalSold
          : 0;

        if (balance < amount) {
          res.status(400).json({
            success: false,
            error: `Insufficient balance. You have ${balance} tokens.`,
          });
          return;
        }

        totalSol = calculateSellReturn(currentSupply, amount);
        newSupply = currentSupply - amount;
      }

      const newPrice = spotPrice(newSupply);
      const slippage = estimateSlippage(currentSupply, amount, side);
      const newMarketCap = newSupply * newPrice;
      const progress = calculateProgress(newSupply, newPrice);
      const graduated = progress >= 100;

      // Use client-provided TX signature from on-chain trade, fallback to mock
      const txSignature = clientTxSig || `tx_${side}_${Date.now()}`;

      // Record trade
      const trade = await prisma.trade.create({
        data: {
          tokenMint,
          traderAddress,
          side,
          amount,
          price: newPrice,
          totalSol,
          txSignature,
        },
      });

      // Update token state
      await prisma.token.update({
        where: { mint: tokenMint },
        data: {
          totalSupply: newSupply,
          currentPrice: newPrice,
          marketCap: newMarketCap,
          bondingCurveProgress: progress,
          graduated,
        },
      });

      // Update buyer record
      if (side === "buy") {
        await prisma.buyerRecord.upsert({
          where: {
            buyerAddress_tokenMint: {
              buyerAddress: traderAddress,
              tokenMint,
            },
          },
          update: {
            totalBought: { increment: amount },
            avgPrice: newPrice, // simplified: last trade price
          },
          create: {
            buyerAddress: traderAddress,
            tokenMint,
            totalBought: amount,
            avgPrice: newPrice,
          },
        });
      } else {
        await prisma.buyerRecord.update({
          where: {
            buyerAddress_tokenMint: {
              buyerAddress: traderAddress,
              tokenMint,
            },
          },
          data: {
            totalSold: { increment: amount },
          },
        });
      }

      const tradeResult = {
        id: trade.id,
        tokenMint: trade.tokenMint,
        traderAddress: trade.traderAddress,
        side: trade.side,
        amount: trade.amount,
        price: trade.price,
        totalSol: trade.totalSol,
        txSignature: trade.txSignature,
        createdAt: trade.createdAt.toISOString(),
        slippage,
        newPrice,
        newSupply,
        bondingCurveProgress: progress,
        graduated,
      };

      // Emit socket events
      try {
        const io = getIo();
        if (io) {
          io.emit("trade:executed", tradeResult);
          io.emit("price:update", {
            tokenMint,
            price: newPrice,
            marketCap: newMarketCap,
            supply: newSupply,
            bondingCurveProgress: progress,
          });
        }
      } catch {
        // Socket not initialized yet
      }

      res.status(201).json({ success: true, data: tradeResult });
    } catch (err) {
      next(err);
    }
  }
);

export { tradeRouter };
