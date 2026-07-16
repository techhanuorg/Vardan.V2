import { Response } from "express";
import { db } from "../services/database.service.js";
import { AiGateway } from "../services/ai/ai.gateway.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";

export class AnalyticsController {
  /**
   * GET /analytics/dashboard
   * Returns a high-level operational statistics dashboard plus dynamic AI Insights.
   */
  public static async getDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    try {
      // 1. Calculate operational totals
      const todayAppointments = await db.appointment.count({
        where: { hospitalId, date: { gte: startOfToday, lte: endOfToday }, deletedAt: null },
      });

      const todayPatients = await db.patient.count({
        where: { hospitalId, createdAt: { gte: startOfToday, lte: endOfToday } },
      });

      const todayMessages = await db.message.count({
        where: {
          conversation: { hospitalId },
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
      });

      const todayAiConversations = await db.aiLog.count({
        where: { hospitalId, createdAt: { gte: startOfToday, lte: endOfToday } },
      });

      const activeCampaigns = await db.campaign.count({
        where: { hospitalId, status: "ACTIVE", deletedAt: null },
      });

      const totalCampaignRecipients = await db.campaignRecipient.count({
        where: { campaign: { hospitalId } },
      });

      const successfulCampaignSends = await db.campaignRecipient.count({
        where: { campaign: { hospitalId }, status: "SENT" },
      });

      const campaignSuccessRate = totalCampaignRecipients > 0 
        ? Math.round((successfulCampaignSends / totalCampaignRecipients) * 100) 
        : 100;

      // 2. Fetch doctor stats
      const totalDoctors = await db.doctor.count({ where: { hospitalId, deletedAt: null } });
      const busyDoctors = await db.appointment.groupBy({
        by: ["doctorId"],
        where: { hospitalId, date: { gte: startOfToday, lte: endOfToday }, status: "CONFIRMED", deletedAt: null },
      });

      // 3. Compile stats into a format for AI Insights
      const busyCount = busyDoctors.length;
      const availableCount = Math.max(0, totalDoctors - busyCount);

      // 4. Generate AI Business Insights based on ACTUAL data
      const analyticsSummary = `
Today's Appointments Scheduled: ${todayAppointments}
New Patients Registered Today: ${todayPatients}
WhatsApp Inbound/Outbound Messages Today: ${todayMessages}
AI Gateway Requests Handled Today: ${todayAiConversations}
Active Doctors: ${totalDoctors} (Busy: ${busyCount}, Available: ${availableCount})
Broadcast Campaigns Success Rate: ${campaignSuccessRate}%
`;

      const systemPrompt = `You are a Hospital Business Intelligence AI.
Analyze the following actual hospital stats and provide exactly 3 bullet points of high-value business insights (e.g. peak days, patient trends, operational performance, message load).
Speak naturally in English or Hinglish. Do not invent any statistics outside of the numbers explicitly provided to you. Keep points concise.`;

      const aiResponse = await AiGateway.execute(
        hospitalId,
        null,
        systemPrompt,
        `Hospital Stats:\n${analyticsSummary}`,
        { type: "ANALYTICS" }
      );

      const responsePayload = {
        metrics: {
          todayAppointments,
          todayPatients,
          todayMessages,
          todayAiConversations,
          activeCampaigns,
          campaignSuccessRate,
          doctors: {
            total: totalDoctors,
            busy: busyCount,
            available: availableCount,
          },
        },
        insights: aiResponse.text.trim(),
      };

      ApiResponse.success(res, "Dashboard analytics retrieved.", responsePayload);
    } catch (e) {
      ApiResponse.error(res, "Failed to load dashboard analytics.", e, 500);
    }
  }

  /**
   * GET /analytics/patients
   * Demographic distributions & registration trends.
   */
  public static async getPatients(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;

    try {
      const totalPatients = await db.patient.count({ where: { hospitalId } });

      // Gender distribution
      const genderRaw = await db.patient.groupBy({
        by: ["gender"],
        where: { hospitalId },
        _count: true,
      });

      const genderDistribution = genderRaw.map((g) => ({
        gender: g.gender,
        count: g._count,
      }));

      // Age distribution
      const patients = await db.patient.findMany({
        where: { hospitalId },
        select: { age: true },
      });

      const ageGroups = {
        "0-18": 0,
        "19-35": 0,
        "36-50": 0,
        "51-70": 0,
        "70+": 0,
      };

      for (const p of patients) {
        const age = p.age || 0;
        if (age <= 18) ageGroups["0-18"]++;
        else if (age <= 35) ageGroups["19-35"]++;
        else if (age <= 50) ageGroups["36-50"]++;
        else if (age <= 70) ageGroups["51-70"]++;
        else ageGroups["70+"]++;
      }

      ApiResponse.success(res, "Patient analytics retrieved.", {
        totalPatients,
        genderDistribution,
        ageDistribution: Object.entries(ageGroups).map(([group, count]) => ({ group, count })),
      });
    } catch (e) {
      ApiResponse.error(res, "Failed to load patient analytics.", e, 500);
    }
  }

  /**
   * GET /analytics/appointments
   * Booking metrics, completion rates, peak booking hours.
   */
  public static async getAppointments(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;

    try {
      const total = await db.appointment.count({ where: { hospitalId, deletedAt: null } });
      const completed = await db.appointment.count({ where: { hospitalId, status: "COMPLETED", deletedAt: null } });
      const pending = await db.appointment.count({ where: { hospitalId, status: "PENDING", deletedAt: null } });
      const cancelled = await db.appointment.count({ where: { hospitalId, status: "CANCELLED", deletedAt: null } });

      // Peak booking hours grouping
      const appts = await db.appointment.findMany({
        where: { hospitalId, deletedAt: null },
        select: { date: true },
      });

      const hourlyMap: Record<number, number> = {};
      const dailyMap: Record<string, number> = {};

      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      for (const a of appts) {
        const hour = new Date(a.date).getHours();
        const day = daysOfWeek[new Date(a.date).getDay()];

        hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
        dailyMap[day] = (dailyMap[day] || 0) + 1;
      }

      ApiResponse.success(res, "Appointment analytics retrieved.", {
        statusCounts: { total, completed, pending, cancelled },
        peakHours: Object.entries(hourlyMap).map(([hour, count]) => ({ hour: `${hour}:00`, count })),
        peakDays: Object.entries(dailyMap).map(([day, count]) => ({ day, count })),
      });
    } catch (e) {
      ApiResponse.error(res, "Failed to load appointment analytics.", e, 500);
    }
  }

  /**
   * GET /analytics/messages
   * WhatsApp traffic, unread, incoming, outgoing.
   */
  public static async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;

    try {
      const incoming = await db.message.count({
        where: { conversation: { hospitalId }, sender: "PATIENT" },
      });

      const outgoing = await db.message.count({
        where: { conversation: { hospitalId }, sender: "USER" },
      });

      const voiceCount = await db.message.count({
        where: { conversation: { hospitalId }, mimeType: { contains: "audio" } },
      });

      const imageCount = await db.message.count({
        where: { conversation: { hospitalId }, mimeType: { contains: "image" } },
      });

      const pdfCount = await db.message.count({
        where: { conversation: { hospitalId }, mimeType: { contains: "pdf" } },
      });

      ApiResponse.success(res, "WhatsApp message analytics retrieved.", {
        traffic: { incoming, outgoing, total: incoming + outgoing },
        mediaDistribution: [
          { type: "Voice Notes", count: voiceCount },
          { type: "Images", count: imageCount },
          { type: "PDF Documents", count: pdfCount },
        ],
      });
    } catch (e) {
      ApiResponse.error(res, "Failed to load message analytics.", e, 500);
    }
  }

  /**
   * GET /analytics/followups
   * Reminders dispatched, failure rates.
   */
  public static async getFollowUps(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;

    try {
      const sent = await db.reminder.count({ where: { hospitalId, status: "SENT", deletedAt: null } });
      const failed = await db.reminder.count({ where: { hospitalId, status: "FAILED", deletedAt: null } });
      const pending = await db.reminder.count({ where: { hospitalId, status: "PENDING", deletedAt: null } });

      ApiResponse.success(res, "Follow-up analytics retrieved.", {
        sent,
        failed,
        pending,
        successRate: (sent + failed) > 0 ? Math.round((sent / (sent + failed)) * 100) : 100,
      });
    } catch (e) {
      ApiResponse.error(res, "Failed to load follow-up analytics.", e, 500);
    }
  }

  /**
   * GET /analytics/campaigns
   * Broadcast campaigns history, success and templates metrics.
   */
  public static async getCampaigns(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;

    try {
      const created = await db.campaign.count({ where: { hospitalId, deletedAt: null } });
      const completed = await db.campaign.count({ where: { hospitalId, status: "COMPLETED", deletedAt: null } });

      const recipientsCount = await db.campaignRecipient.count({
        where: { campaign: { hospitalId } },
      });

      const sentCount = await db.campaignRecipient.count({
        where: { campaign: { hospitalId }, status: "SENT" },
      });

      const failedCount = await db.campaignRecipient.count({
        where: { campaign: { hospitalId }, status: "FAILED" },
      });

      ApiResponse.success(res, "Campaign analytics retrieved.", {
        created,
        completed,
        recipientsCount,
        sentCount,
        failedCount,
        successRate: recipientsCount > 0 ? Math.round((sentCount / recipientsCount) * 100) : 100,
      });
    } catch (e) {
      ApiResponse.error(res, "Failed to load campaign analytics.", e, 500);
    }
  }

  /**
   * GET /analytics/doctors
   * Doctor utilization and patient load distributions.
   */
  public static async getDoctors(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;

    try {
      const doctors = await db.doctor.findMany({
        where: { hospitalId, deletedAt: null },
        include: {
          appointments: { where: { deletedAt: null } },
        },
      });

      const distribution = doctors.map((d) => ({
        name: d.name,
        specialization: d.specialization,
        appointmentsCount: d.appointments.length,
      }));

      ApiResponse.success(res, "Clinician analytics retrieved.", { distribution });
    } catch (e) {
      ApiResponse.error(res, "Failed to load clinician analytics.", e, 500);
    }
  }

  /**
   * GET /analytics/knowledge
   * Most viewed diagnostic questions.
   */
  public static async getKnowledge(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;

    try {
      const faqsCount = await db.fAQ.count({
        where: { knowledgeBase: { hospitalId }, deletedAt: null },
      });

      const articlesCount = await db.knowledgeBase.count({
        where: { hospitalId, deletedAt: null },
      });

      ApiResponse.success(res, "Knowledge base analytics retrieved.", {
        faqsCount,
        articlesCount,
      });
    } catch (e) {
      ApiResponse.error(res, "Failed to load knowledge base analytics.", e, 500);
    }
  }

  /**
   * GET /analytics/ai
   * Gemini/Groq execution counts, fallback records, average latency, and tokens.
   */
  public static async getAi(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;

    try {
      const geminiCount = await db.aiLog.count({ where: { hospitalId, provider: "GEMINI" } });
      const groqCount = await db.aiLog.count({ where: { hospitalId, provider: "GROQ" } });
      const fallbackCount = await db.aiLog.count({
        where: { hospitalId, provider: "GROQ", error: null }, // failovers to Groq
      });

      const avgStats = await db.aiLog.aggregate({
        where: { hospitalId },
        _avg: {
          latencyMs: true,
          tokensUsed: true,
        },
      });

      // Intent Distribution
      const intentsRaw = await db.aiLog.groupBy({
        by: ["intent"],
        where: { hospitalId, NOT: { intent: null } },
        _count: true,
      });

      const intents = intentsRaw.map((i) => ({
        intent: i.intent,
        count: i._count,
      }));

      ApiResponse.success(res, "AI gateway metrics loaded.", {
        providerCounts: {
          gemini: geminiCount,
          groq: groqCount,
          fallback: fallbackCount,
        },
        avgLatencyMs: Math.round(avgStats._avg.latencyMs || 0),
        avgTokensUsed: Math.round(avgStats._avg.tokensUsed || 0),
        intentDistribution: intents,
      });
    } catch (e) {
      ApiResponse.error(res, "Failed to load AI metrics.", e, 500);
    }
  }

  /**
   * GET /analytics/export
   * Generates and returns a CSV file of the requested analytics dataset.
   * Audits this action in AuditLog.
   */
  public static async exportReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const { type } = req.query; // 'patients', 'appointments', or 'campaigns'

    if (!type || typeof type !== "string") {
      ApiResponse.error(res, "Export type query parameter is required.", undefined, 400);
      return;
    }

    try {
      let csvData = "";
      let fileName = "";

      if (type === "patients") {
        const patients = await db.patient.findMany({ where: { hospitalId } });
        csvData = "PatientID,Name,Phone,Gender,Age,RegisteredAt\n" +
          patients.map((p) => `"${p.patientId}","${p.name}","${p.phone}","${p.gender}",${p.age},"${p.createdAt.toISOString()}"`).join("\n");
        fileName = "patients_report.csv";
      } else if (type === "appointments") {
        const appointments = await db.appointment.findMany({
          where: { hospitalId, deletedAt: null },
          include: { patient: true, doctor: true },
        });
        csvData = "AppointmentID,PatientName,DoctorName,Date,Status,Reason\n" +
          appointments.map((a) => `"${a.appointmentId}","${a.patient.name}","${a.doctor.name}","${a.date.toISOString()}","${a.status}","${a.reason}"`).join("\n");
        fileName = "appointments_report.csv";
      } else {
        const campaigns = await db.campaign.findMany({
          where: { hospitalId, deletedAt: null },
          include: { template: true },
        });
        csvData = "CampaignID,Name,Template,ScheduledAt,Status\n" +
          campaigns.map((c) => `"${c.id}","${c.name}","${c.template.name}","${c.scheduledAt ? c.scheduledAt.toISOString() : "Immediate"}","${c.status}"`).join("\n");
        fileName = "campaigns_report.csv";
      }

      // Audit Log log entry
      await db.auditLog.create({
        data: {
          hospitalId,
          action: "EXPORT_REPORT",
          entity: "Analytics",
          entityId: type,
          userId: req.user.id,
          payload: { detail: `Exported ${type} CSV report.` },
          clientIp: req.ip || "unknown",
        },
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
      res.status(200).send(csvData);
    } catch (e) {
      ApiResponse.error(res, "Exporting report failed.", e, 500);
    }
  }
}
export default AnalyticsController;
