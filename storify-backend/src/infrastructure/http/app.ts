import express, { Express } from "express";
import cors from "cors";
import { healthRoutes } from "./routes/health.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

export function createApp(): Express {
  const app = express();

  // Standard middleware
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use(healthRoutes);

  // Global Error Handler (must be registered last)
  app.use(errorHandler);

  return app;
}

export const app = createApp();
