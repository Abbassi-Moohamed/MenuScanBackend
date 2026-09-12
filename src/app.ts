import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { corsOptions } from "./config/cors.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { notFoundHandler } from "./middlewares/not-found.middleware.js";
import { healthRouter } from "./routes/health.routes.js";
import { apiRouter } from "./routes/index.js";
import { logger } from "./utils/logger.js";

/**
 * Builds the Express application. No I/O happens here — the caller decides
 * when/how to connect the database (server.ts) or to run it (tests), which
 * keeps the app fully testable.
 */
export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");

  // Security headers.
  app.use(helmet());

  // CORS restricted to the configured frontend origin(s).
  app.use(cors(corsOptions));

  // JSON body parsing with a strict size cap (public API only accepts small payloads).
  app.use(express.json({ limit: "10kb" }));

  // Structured request logging with per-request ids.
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existing = req.headers["x-request-id"];
        if (typeof existing === "string") return existing;
        const id = crypto.randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
    }),
  );

  // Health endpoints.
  app.use("/health", healthRouter);

  // Public API (versioned under /api/v1).
  app.use(env.apiPrefix, apiRouter);

  // 404 for anything unmatched, then the centralized error handler.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}