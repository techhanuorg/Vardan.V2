import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import env from "./config/env.js";
import logger from "./utils/logger.js";
import rateLimiter from "./middlewares/rateLimiter.js";
import router from "./routes/index.js";
import errorHandler from "./middlewares/errorHandler.js";
import { ReminderEngine } from "./services/reminder.engine.js";
import { CampaignQueueProcessor } from "./services/campaign.queue.js";

const app = express();

// Secure headers
app.use(helmet());

// Enable CORS
const allowedOrigins = env.ALLOWED_ORIGINS.split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Blocked by CORS policy"));
      }
    },
    credentials: true,
  })
);

// Performance compression
app.use(compression());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging via Morgan & Pino
app.use(
  morgan(env.NODE_ENV === "development" ? "dev" : "combined", {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// Global Rate Limiting
app.use("/api", rateLimiter);

// Mount API Route
app.use("/api/v1", router);

// Default 404 Route Catcher
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "API Route not found",
  });
});

// Error handling middleware
app.use(errorHandler);

import { WhatsAppService } from "./services/whatsapp.service.js";

const server = app.listen(env.PORT, () => {
  logger.info(`⚡ Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  // Attempt to restore any connected sessions
  WhatsAppService.autoRestoreAllSessions();
  // Start background reminder schedules
  ReminderEngine.start();
  // Start background campaign queue processor
  CampaignQueueProcessor.start();
});

// Graceful shutdowns
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Shutting down connection layers gracefully...`);
  ReminderEngine.stop();
  server.close(() => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
