import { Router, Request, Response } from "express";
import { db } from "../../database/database-pool.js";

const router = Router();

router.get("/health", async (_req: Request, res: Response): Promise<void> => {
  const isDbConnected = await db.healthCheck();

  const status = isDbConnected ? "UP" : "DEGRADED";
  const httpStatus = isDbConnected ? 200 : 503;

  res.status(httpStatus).json({
    status,
    database: isDbConnected ? "CONNECTED" : "DISCONNECTED",
    timestamp: new Date().toISOString(),
    poolStats: db.getStats(),
  });
});

export const healthRoutes = router;
