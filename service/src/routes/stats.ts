import { Router } from "express";
import { prisma, dbConnected } from "../lib/prisma";
import { getCached } from "../lib/cache";

const router = Router();

router.get("/", async (_req, res) => {
  if (!dbConnected()) {
    return res.status(503).json({ error: "Database unavailable" });
  }

  try {
    const stats = await getCached("stats:global", 60, async () => {
      const [totalLaunches, totalTrades, graduatedCount, totalVolume] = await Promise.all([
        prisma.token.count(),
        prisma.trade.count(),
        prisma.token.count({ where: { graduated: true } }),
        prisma.trade.aggregate({ _sum: { totalSol: true } }),
      ]);

      return {
        totalLaunches,
        totalTrades,
        graduatedCount,
        totalVolumeSol: totalVolume._sum.totalSol || 0,
        refundsSaved: 0, // TODO: aggregate from refunds table
      };
    });

    return res.json(stats);
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
