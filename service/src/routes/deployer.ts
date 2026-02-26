import { Router, Request, Response } from "express";

const deployerRouter = Router();

deployerRouter.get("/", (_req: Request, res: Response) => {
  res.json({ message: "TODO: implement GET /api/deployer" });
});

export { deployerRouter };
