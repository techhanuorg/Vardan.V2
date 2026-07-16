import { Router, Request, Response } from "express";
import { db } from "../services/database.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { WhatsAppService } from "../services/whatsapp.service.js";
import env from "../config/env.js";
import os from "os";

const router = Router();

/**
 * GET /health
 * Detailed health metrics (database, memory, WhatsApp status, and AI configurations)
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    // 1. Verify Database
    await db.$queryRaw`SELECT 1`;
    const dbStatus = "CONNECTED";

    // 2. Resolve WhatsApp session counts
    const waCount = WhatsAppService.getConnectedCount ? WhatsAppService.getConnectedCount() : 0;

    // 3. Resolve AI provider flags
    const hasGemini = !!env.GEMINI_API_KEY;
    const hasGroq = !!env.GROQ_API_KEY;

    const memoryUsage = process.memoryUsage();

    ApiResponse.success(res, "Health check completed.", {
      status: "UP",
      database: dbStatus,
      system: {
        uptimeSeconds: Math.round(process.uptime()),
        freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
        totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
        cpuCount: os.cpus().length,
      },
      process: {
        memoryHeapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
        memoryHeapTotalMb: Math.round(memoryUsage.heapTotal / (1024 * 1024)),
      },
      whatsapp: {
        connectedSessions: waCount,
      },
      aiProviders: {
        geminiActive: hasGemini,
        groqActive: hasGroq,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    ApiResponse.error(
      res,
      "System degraded.",
      {
        status: "DOWN",
        database: "DISCONNECTED",
        error: errMsg,
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

/**
 * GET /ready
 * Database connectivity verification check
 */
router.get("/ready", async (_req: Request, res: Response) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "READY", database: "CONNECTED" });
  } catch (e) {
    res.status(503).json({ status: "NOT_READY", database: "DISCONNECTED" });
  }
});

/**
 * GET /metrics
 * Operational stats report
 */
router.get("/metrics", (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  res.setHeader("Content-Type", "text/plain");
  res.status(200).send(`
# HELP process_uptime_seconds Uptime of the Node.js process in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${process.uptime()}

# HELP process_memory_heap_used_bytes Memory heap used in bytes
# TYPE process_memory_heap_used_bytes gauge
process_memory_heap_used_bytes ${memoryUsage.heapUsed}

# HELP process_memory_heap_total_bytes Memory heap total in bytes
# TYPE process_memory_heap_total_bytes gauge
process_memory_heap_total_bytes ${memoryUsage.heapTotal}

# HELP system_cpu_count CPU count of the hosting machine
# TYPE system_cpu_count gauge
system_cpu_count ${os.cpus().length}
  `.trim());
});

export default router;
