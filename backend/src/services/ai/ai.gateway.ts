import { db } from "../database.service.js";
import env from "../../config/env.js";
import logger from "../../utils/logger.js";
import GeminiProvider from "./gemini.provider.js";
import GroqProvider from "./groq.provider.js";
import PromptManager from "./prompt.manager.js";
import ConversationMemoryManager from "./conversation.memory.js";

// Safe dynamic import resolver for fetch to prevent compilation mismatches in old nodes
const makeFetchCall = async (url: string, body: object) => {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    logger.error("Failed to sync to Google Sheets App Script:", error);
  }
};

export class AiGateway {
  /**
   * Executes AI generation using the configured primary provider with automatic Groq failover.
   */
  public static async execute(
    hospitalId: string,
    conversationId: string | null,
    systemPrompt: string,
    userPrompt: string,
    options?: { type?: string; phone?: string }
  ): Promise<{ text: string; provider: string; modelName: string; tokens: number; latencyMs: number }> {
    const startTime = Date.now();
    const settings = await db.setting.findMany({ where: { hospitalId, group: "AI" } });
    const providerSetting = settings.find((s) => s.key === "AI_PROVIDER")?.value || env.AI_PROVIDER;
    const modelSetting = settings.find((s) => s.key === "AI_MODEL")?.value;

    const isGeminiPrimary = providerSetting === "GEMINI";
    let text = "";
    let provider = "GEMINI";
    let modelName = modelSetting || "gemini-1.5-flash";
    let tokens = 0;
    let latencyMs = 0;
    let executionError: string | null = null;

    if (isGeminiPrimary) {
      try {
        const result = await GeminiProvider.generate(env.GEMINI_API_KEY, systemPrompt, userPrompt, modelName);
        text = result.text;
        tokens = result.tokens;
        latencyMs = result.latencyMs;
      } catch (geminiError) {
        executionError = geminiError instanceof Error ? geminiError.message : String(geminiError);
        logger.warn("Primary Gemini provider failed. Dispatched automatic failover to Groq.", geminiError);

        // Fallback to Groq
        if (env.GROQ_API_KEY) {
          try {
            provider = "GROQ";
            modelName = "llama3-8b-8192";
            const result = await GroqProvider.generate(env.GROQ_API_KEY, systemPrompt, userPrompt, modelName);
            text = result.text;
            tokens = result.tokens;
            latencyMs = Date.now() - startTime;
          } catch (groqError) {
            executionError += ` | Groq Fallback: ${groqError instanceof Error ? groqError.message : String(groqError)}`;
            throw new Error(`AI providers exhausted. Gemini and Groq fallback both failed: ${executionError}`);
          }
        } else {
          throw new Error(`Gemini failed and no fallback GROQ_API_KEY is configured: ${executionError}`);
        }
      }
    } else {
      // Groq Primary
      if (!env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY environment variable is missing.");
      }
      try {
        provider = "GROQ";
        modelName = modelSetting || "llama3-8b-8192";
        const result = await GroqProvider.generate(env.GROQ_API_KEY, systemPrompt, userPrompt, modelName);
        text = result.text;
        tokens = result.tokens;
        latencyMs = result.latencyMs;
      } catch (groqError) {
        executionError = groqError instanceof Error ? groqError.message : String(groqError);
        logger.warn("Primary Groq provider failed. Dispatched automatic failover to Gemini.", groqError);

        // Fallback to Gemini
        try {
          provider = "GEMINI";
          modelName = "gemini-1.5-flash";
          const result = await GeminiProvider.generate(env.GEMINI_API_KEY, systemPrompt, userPrompt, modelName);
          text = result.text;
          tokens = result.tokens;
          latencyMs = Date.now() - startTime;
        } catch (geminiError) {
          executionError += ` | Gemini Fallback: ${geminiError instanceof Error ? geminiError.message : String(geminiError)}`;
          throw new Error(`AI providers exhausted. Groq and Gemini fallback both failed: ${executionError}`);
        }
      }
    }

    // Save log entry to local database
    try {
      await db.aiLog.create({
        data: {
          hospitalId,
          conversationId,
          provider,
          modelName,
          prompt: userPrompt,
          response: text,
          intent: options?.type || null,
          tokensUsed: tokens,
          latencyMs,
          error: executionError,
        },
      });
    } catch (dbError) {
      logger.error("Failed to write AI execution log to database:", dbError);
    }

    // Sync to Google Sheets via Google Apps Script Deployment URL
    if (env.GOOGLE_APPS_SCRIPT_URL) {
      makeFetchCall(env.GOOGLE_APPS_SCRIPT_URL, {
        action: "syncAiLog",
        hospitalId,
        phone: options?.phone || "Unknown",
        intent: options?.type || "General Chat",
        provider,
        tokens,
        latency: latencyMs,
        prompt: userPrompt,
        response: text,
        error: executionError,
      });
    }

    return { text, provider, modelName, tokens, latencyMs };
  }

  /**
   * Detects the patient message intent
   */
  public static async detectIntent(hospitalId: string, message: string): Promise<string> {
    const systemPrompt = await PromptManager.getPrompt(hospitalId, "INTENT");
    const userPrompt = `Classify this message: "${message}"`;
    try {
      const response = await this.execute(hospitalId, null, systemPrompt, userPrompt, { type: "INTENT" });
      const intentStr = response.text.trim().toUpperCase();
      return intentStr;
    } catch (e) {
      logger.error("Failed to detect intent:", e);
      return "UNKNOWN_INTENT";
    }
  }

  /**
   * Evaluates the patient message context and issues a response using conversation memories
   */
  public static async chat(hospitalId: string, phone: string, message: string): Promise<string> {
    // 1. Resolve conversation and construct memory context block
    let conversation = await db.conversation.findFirst({
      where: { hospitalId, phone, deletedAt: null },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: { hospitalId, phone, context: {} },
      });
    }

    const memoryContext = await ConversationMemoryManager.getMemoryContext(hospitalId, phone);

    // 2. Classify incoming message intent
    const detectedIntent = await this.detectIntent(hospitalId, message);
    if (detectedIntent !== "UNKNOWN_INTENT") {
      await db.conversation.update({
        where: { id: conversation.id },
        data: { intent: detectedIntent },
      });
    }

    // 3. Assemble complete system instruction injected with history context
    const baseSystem = await PromptManager.getPrompt(hospitalId, "TRIAGE");
    const fullSystemPrompt = `${baseSystem}\n\n${memoryContext}`;

    // 4. Execute LLM completions
    const result = await this.execute(hospitalId, conversation.id, fullSystemPrompt, message, {
      type: detectedIntent,
      phone,
    });

    // 5. Update patient memories dynamically on successful extraction heuristics
    if (result.text.includes("Preferred Doctor") || result.text.includes("Dr.")) {
      const match = result.text.match(/Dr\.\s*(\w+)/i);
      if (match) {
        await ConversationMemoryManager.setMemory(conversation.id, "preferredDoctor", match[0]);
      }
    }

    let replyText = result.text;
    const actionRegex = /\[ACTION:(\w+):(\{.*?\})\]/;
    const actionMatch = replyText.match(actionRegex);

    if (actionMatch) {
      const actionType = actionMatch[1];
      const actionDataStr = actionMatch[2];
      try {
        const actionData = JSON.parse(actionDataStr);
        // Strip the tag from the text immediately
        replyText = replyText.replace(actionRegex, "").trim();

        if (actionType === "REGISTER_PATIENT") {
          let patient = await db.patient.findFirst({ where: { hospitalId, phone } });
          if (!patient) {
            patient = await db.patient.create({
              data: {
                hospitalId,
                patientId: `P-${Date.now()}`,
                name: actionData.name,
                phone,
                gender: (actionData.gender || "MALE").toUpperCase(),
                age: parseInt(actionData.age) || 0,
                dob: new Date("2000-01-01"),
                address: "WhatsApp Registered",
                emergencyContact: {},
              },
            });
            replyText += `\n\n✅ Registration Successful! Profile created for ${patient.name}.`;
          } else {
            replyText += `\n\nℹ️ You are already registered as ${patient.name}.`;
          }
        }

        else if (actionType === "BOOK_APPOINTMENT") {
          let patient = await db.patient.findFirst({ where: { hospitalId, phone } });
          if (!patient) {
            patient = await db.patient.create({
              data: {
                hospitalId,
                patientId: `P-${Date.now()}`,
                name: "WhatsApp Patient",
                phone,
                gender: "MALE",
                age: 30,
                dob: new Date("2000-01-01"),
                address: "WhatsApp Registered",
                emergencyContact: {},
              },
            });
          }

          let doctor = await db.doctor.findFirst({
            where: {
              hospitalId,
              name: { contains: actionData.doctorName.replace("Dr. ", ""), mode: "insensitive" },
              deletedAt: null,
            },
            include: { department: true },
          });

          if (!doctor) {
            doctor = await db.doctor.findFirst({
              where: { hospitalId, deletedAt: null },
              include: { department: true },
            });
          }

          if (doctor) {
            const appointmentDate = new Date(actionData.date);

            const conflict = await db.appointment.findFirst({
              where: {
                doctorId: doctor.id,
                date: appointmentDate,
                status: { in: ["PENDING", "CONFIRMED"] },
                deletedAt: null,
              },
            });

            if (conflict) {
              replyText += `\n\n⚠️ Slot Unavailable: Dr. ${doctor.name} is already booked at that time. Please suggest another time slot!`;
            } else {
              const firstUser = await db.user.findFirst({ where: { hospitalId } });
              const appt = await db.appointment.create({
                data: {
                  hospitalId,
                  appointmentId: `A-${Date.now()}`,
                  patientId: patient.id,
                  doctorId: doctor.id,
                  departmentId: doctor.departmentId,
                  date: appointmentDate,
                  reason: actionData.reason || "General Checkup",
                  createdById: firstUser ? firstUser.id : "",
                },
              });

              replyText += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n❇️ APPOINTMENT CONFIRMED ❇️\n• Patient Name: ${patient.name}\n• Doctor Name: Dr. ${doctor.name}\n• Department: ${doctor.department.name}\n• Date: ${appointmentDate.toLocaleDateString()}\n• Time: ${appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n• Ref ID: ${appt.appointmentId}\n━━━━━━━━━━━━━━━━━━━━━━━━`;
            }
          } else {
            replyText += `\n\n⚠️ Booking Failed: No active doctors available.`;
          }
        }

        else if (actionType === "CANCEL_APPOINTMENT") {
          const patient = await db.patient.findFirst({ where: { hospitalId, phone } });
          if (patient) {
            const appt = await db.appointment.findFirst({
              where: {
                patientId: patient.id,
                status: { not: "CANCELLED" },
                deletedAt: null,
              },
              orderBy: { date: "desc" },
            });

            if (appt) {
              await db.appointment.update({
                where: { id: appt.id },
                data: { status: "CANCELLED" },
              });
              replyText += `\n\n✅ Appointment ${appt.appointmentId} has been successfully cancelled.`;
            } else {
              replyText += `\n\n⚠️ No active appointments found to cancel.`;
            }
          }
        }

        else if (actionType === "RESCHEDULE_APPOINTMENT") {
          const patient = await db.patient.findFirst({ where: { hospitalId, phone } });
          if (patient) {
            const appt = await db.appointment.findFirst({
              where: {
                patientId: patient.id,
                status: { not: "CANCELLED" },
                deletedAt: null,
              },
              orderBy: { date: "desc" },
            });

            if (appt) {
              const newDate = new Date(actionData.newDate);
              await db.appointment.update({
                where: { id: appt.id },
                data: { date: newDate },
              });
              replyText += `\n\n✅ Appointment ${appt.appointmentId} rescheduled to ${newDate.toLocaleString()}.`;
            } else {
              replyText += `\n\n⚠️ No active appointments found to reschedule.`;
            }
          }
        }
      } catch (err) {
        logger.error("Failed to execute structured action:", err);
      }
    }

    return replyText;
  }
}
export default AiGateway;
