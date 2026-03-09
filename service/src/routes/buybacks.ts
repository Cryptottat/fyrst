import { Router, Request, Response, NextFunction } from "express";
import { prisma, dbConnected } from "../lib/prisma";


const buybacksRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/buybacks
// ---------------------------------------------------------------------------

buybacksRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
      const offset = parseInt(req.query.offset as string, 10) || 0;

      if (!dbConnected()) {
        return res.status(503).json({ error: "Database unavailable" });
      }

      const [buybacks, total] = await Promise.all([
        prisma.buyback.findMany({
          take: limit,
          skip: offset,
          orderBy: { timestamp: "desc" },
        }),
        prisma.buyback.count(),
      ]);

      const mapped = buybacks.map((b) => ({
        id: b.id,
        signature: b.signature,
        amountSol: b.amountSol.toString(),
        amountTokenBurned: b.amountTokenBurned.toString(),
        timestamp: b.timestamp.toISOString(),
        createdAt: b.createdAt.toISOString(),
      }));

      res.json({ buybacks: mapped, total, limit, offset });
    } catch (err) {
      next(err);
    }
  }
);

export { buybacksRouter };
