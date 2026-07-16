import { db } from "./database.service.js";
import { WhatsAppService } from "./whatsapp.service.js";
import logger from "../utils/logger.js";
import { Campaign, Template, Patient } from "@prisma/client";

export class CampaignQueueProcessor {
  private static isLoopRunning = false;
  private static consecutiveFailuresMap = new Map<string, number>(); // campaignId -> failures count

  /**
   * Starts the background campaign queue processor loop.
   */
  public static start(): void {
    if (this.isLoopRunning) return;
    this.isLoopRunning = true;
    logger.info("Starting persistent WhatsApp Campaign Queue Processor...");
    
    // Auto-resume active campaigns on start
    this.resumeActiveCampaignsOnBoot();

    // Start background processor loop (runs checks every 5 seconds)
    setInterval(() => {
      this.tick();
    }, 5000);
  }

  /**
   * Automatically resets any campaigns left in active state to support recovery.
   */
  private static async resumeActiveCampaignsOnBoot(): Promise<void> {
    try {
      const activeCount = await db.campaign.count({
        where: { status: "ACTIVE", deletedAt: null },
      });
      if (activeCount > 0) {
        logger.info(`Detected ${activeCount} active campaigns on startup. Resuming queue processing...`);
      }
    } catch (e) {
      logger.error("Failed to check active campaigns status on boot:", e);
    }
  }

  /**
   * Timer tick to fetch and dispatch messages for active campaigns.
   */
  private static async tick(): Promise<void> {
    try {
      // Find all campaigns that are currently ACTIVE
      const activeCampaigns = await db.campaign.findMany({
        where: { status: "ACTIVE", deletedAt: null },
        include: { template: true },
      });

      for (const campaign of activeCampaigns) {
        await this.processSingleMessage(campaign);
      }
    } catch (error) {
      logger.error("Campaign queue processor tick error:", error);
    }
  }

  /**
   * Processes a single message delivery task for an active campaign to apply rate-limiting delays.
   */
  private static async processSingleMessage(campaign: Campaign & { template: Template }): Promise<void> {
    const campaignId = campaign.id;

    // Find next pending recipient
    const recipient = await db.campaignRecipient.findFirst({
      where: { campaignId, status: "PENDING" },
      include: { patient: true },
    });

    if (!recipient) {
      // No pending recipients left. Mark campaign as completed.
      logger.info(`Campaign "${campaign.name}" (${campaignId}) completed delivery.`);
      await db.campaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED", sentAt: new Date() },
      });
      this.consecutiveFailuresMap.delete(campaignId);
      return;
    }

    // Set status to SENDING
    await db.campaignRecipient.update({
      where: { id: recipient.id },
      data: { status: "SENDING" },
    });

    try {
      // Resolve dynamic variables
      const formattedMessage = await this.resolvePlaceholders(
        campaign.hospitalId,
        recipient.patient,
        campaign.template.content
      );

      // Throttling: Random delay of 2 to 5 seconds to prevent spam blocks
      const throttleMs = Math.floor(2000 + Math.random() * 3000);
      await new Promise((resolve) => setTimeout(resolve, throttleMs));

      // Dispatch message
      await WhatsAppService.sendMessage(campaign.hospitalId, recipient.patient.phone, formattedMessage);

      // Update recipient status to SENT
      await db.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "SENT", sentAt: new Date() },
      });

      // Reset failure tracker
      this.consecutiveFailuresMap.set(campaignId, 0);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to dispatch campaign message for recipient ${recipient.id}:`, errMsg);

      // Mark recipient as FAILED
      await db.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: "FAILED", errorMessage: errMsg },
      });

      // Track consecutive failures
      const currentFailures = (this.consecutiveFailuresMap.get(campaignId) || 0) + 1;
      this.consecutiveFailuresMap.set(campaignId, currentFailures);

      if (currentFailures >= 5) {
        logger.warn(`Campaign "${campaign.name}" paused automatically due to ${currentFailures} consecutive failures.`);
        await db.campaign.update({
          where: { id: campaignId },
          data: { status: "PAUSED" },
        });
      }
    }
  }

  /**
   * Resolves double-bracket placeholders dynamically from database profiles.
   */
  private static async resolvePlaceholders(
    hospitalId: string,
    patient: Patient,
    templateContent: string
  ): Promise<string> {
    let output = templateContent;

    // Fetch latest appointment for this patient
    const appt = await db.appointment.findFirst({
      where: { patientId: patient.id, hospitalId, deletedAt: null },
      orderBy: { date: "desc" },
      include: { doctor: true, department: true },
    });

    const hospital = await db.hospital.findFirst({
      where: { id: hospitalId },
    });

    const settings = await db.setting.findMany({
      where: { hospitalId, key: { in: ["phone", "email"] } },
    });
    const hospPhone = settings.find((s) => s.key === "phone")?.value || "";

    const dateStr = appt ? new Date(appt.date).toLocaleDateString() : "";
    const timeStr = appt ? new Date(appt.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

    // Mappings dictionary
    const mappings: Record<string, string> = {
      "{{patient_name}}": patient.name || "",
      "{{doctor_name}}": appt?.doctor ? `Dr. ${appt.doctor.name}` : "clinician",
      "{{appointment_date}}": dateStr,
      "{{appointment_time}}": timeStr,
      "{{department}}": appt?.department?.name || "",
      "{{hospital_name}}": hospital?.name || "",
      "{{hospital_phone}}": hospPhone,
      "{{reference_id}}": appt?.appointmentId || "",
    };

    for (const key of Object.keys(mappings)) {
      output = output.replace(new RegExp(key, "g"), mappings[key]);
    }

    return output;
  }
}
export default CampaignQueueProcessor;
