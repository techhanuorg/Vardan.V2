import { Response } from "express";
import { AiGateway } from "../services/ai/ai.gateway.js";
import { db } from "../services/database.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";

export class AiController {
  /**
   * POST /ai/chat
   */
  public static async chat(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;
    const { phone, message } = req.body;

    if (!phone || !message) {
      ApiResponse.error(res, "Recipient phone and message body are required.", undefined, 400);
      return;
    }

    try {
      const responseText = await AiGateway.chat(hospitalId, phone, message);
      ApiResponse.success(res, "AI response generated.", { response: responseText });
    } catch (error) {
      ApiResponse.error(res, "AI generation failed.", error instanceof Error ? error.message : error, 500);
    }
  }

  /**
   * POST /ai/detect-intent
   */
  public static async detectIntent(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;
    const { message } = req.body;

    if (!message) {
      ApiResponse.error(res, "Message body is required.", undefined, 400);
      return;
    }

    try {
      const intent = await AiGateway.detectIntent(hospitalId, message);
      ApiResponse.success(res, "Intent classified.", { intent });
    } catch (error) {
      ApiResponse.error(res, "Intent classification failed.", error, 500);
    }
  }

  /**
   * POST /ai/provider/switch
   */
  public static async switchProvider(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;
    const { provider, model } = req.body;

    if (!provider || !["GEMINI", "GROQ"].includes(provider)) {
      ApiResponse.error(res, "Invalid AI Provider selected (must be GEMINI or GROQ).", undefined, 400);
      return;
    }

    try {
      // Upsert dynamic settings in Database
      await db.setting.upsert({
        where: { hospitalId_key: { hospitalId, key: "AI_PROVIDER" } },
        create: { hospitalId, key: "AI_PROVIDER", value: provider, type: "STRING", group: "AI" },
        update: { value: provider },
      });

      if (model) {
        await db.setting.upsert({
          where: { hospitalId_key: { hospitalId, key: "AI_MODEL" } },
          create: { hospitalId, key: "AI_MODEL", value: model, type: "STRING", group: "AI" },
          update: { value: model },
        });
      }

      ApiResponse.success(res, `AI configuration switched to ${provider} (${model || "default model"}).`);
    } catch (error) {
      ApiResponse.error(res, "Failed to switch AI configuration settings.", error, 500);
    }
  }

  /**
   * GET /ai/providers
   */
  public static async listProviders(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;

    try {
      const settings = await db.setting.findMany({
        where: { hospitalId, group: "AI" },
      });

      const activeProvider = settings.find((s) => s.key === "AI_PROVIDER")?.value || "GEMINI";
      const activeModel = settings.find((s) => s.key === "AI_MODEL")?.value || "default";

      ApiResponse.success(res, "AI configuration rules listed.", {
        activeProvider,
        activeModel,
        providers: [
          { name: "GEMINI", models: ["gemini-1.5-flash", "gemini-1.5-pro"] },
          { name: "GROQ", models: ["llama3-8b-8192", "llama-3.3-70b-versatile"] },
        ],
      });
    } catch (error) {
      ApiResponse.error(res, "Failed to load AI providers configuration.", error, 500);
    }
  }

  /**
   * GET /ai/usage
   */
  public static async getUsage(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;

    try {
      const logs = await db.aiLog.findMany({
        where: { hospitalId },
      });

      const totalRequests = logs.length;
      const totalTokens = logs.reduce((sum, l) => sum + l.tokensUsed, 0);
      const avgLatency = totalRequests > 0 ? Math.round(logs.reduce((sum, l) => sum + l.latencyMs, 0) / totalRequests) : 0;
      const totalErrors = logs.filter((l) => l.error !== null).length;

      // Group logs by provider
      const breakdown = logs.reduce((acc: Record<string, number>, log) => {
        acc[log.provider] = (acc[log.provider] || 0) + 1;
        return acc;
      }, {});

      ApiResponse.success(res, "AI usage metrics compiled.", {
        totalRequests,
        totalTokens,
        avgLatencyMs: avgLatency,
        totalErrors,
        providerBreakdown: breakdown,
      });
    } catch (error) {
      ApiResponse.error(res, "Failed to load usage reports.", error, 500);
    }
  }

  /**
   * GET /ai/status
   */
  public static async getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    ApiResponse.success(res, "AI engines status is healthy.", {
      geminiConnected: !!process.env.GEMINI_API_KEY,
      groqConnected: !!process.env.GROQ_API_KEY,
    });
  }
}
export default AiController;
