import { Router } from "express";
import { healthRouter } from "./health";
import { launchesRouter } from "./launches";
import { deployerRouter } from "./deployer";
import { tradeRouter } from "./trade";
import { portfolioRouter } from "./portfolio";
import { refundsRouter } from "./refunds";
import statsRouter from "./stats";

const router = Router();

router.use("/health", healthRouter);
router.use("/api/launches", launchesRouter);
router.use("/api/deployer", deployerRouter);
router.use("/api/trade", tradeRouter);
router.use("/api/portfolio", portfolioRouter);
router.use("/api/refunds", refundsRouter);
router.use("/api/stats", statsRouter);

export { router };
