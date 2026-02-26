import { Router } from "express";
import { healthRouter } from "./health";
import { launchesRouter } from "./launches";
import { deployerRouter } from "./deployer";
import { tradeRouter } from "./trade";
import { portfolioRouter } from "./portfolio";

const router = Router();

router.use("/health", healthRouter);
router.use("/api/launches", launchesRouter);
router.use("/api/deployer", deployerRouter);
router.use("/api/trade", tradeRouter);
router.use("/api/portfolio", portfolioRouter);

export { router };
