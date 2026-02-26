import { Router, Request, Response } from "express";

const healthRouter = Router();

healthRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "fyrst-api",
    timestamp: new Date().toISOString(),
  });
});

export { healthRouter };
