import cron from "node-cron";
import { db } from "./database.service.js";
import { WhatsAppService } from "./whatsapp.service.js";
import logger from "../utils/logger.js";

export class ReminderEngine {
  private static cronJob: cron.ScheduledTask | null = null;

  /**
   * Initializes the cron engine scheduler to execute every 5 minutes
   */
  public static start(): void {
    if (this.cronJob) return;

    logger.info("Initializing background AI Reminder & Campaign Engine...");
    
    // Process reminders and campaign queue every 5 minutes
    this.cronJob = cron.schedule("*/5 * * * *", async () => {
      try {
        await this.processPendingReminders();
        await this.processPendingCampaigns();
      } catch (err) {
        logger.error("Error occurred in Reminder & Campaign sweeps:", err);
      }
    });
  }

  /**
   * Stops the background cron engine
   */
  public static stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info("Stopped background AI Reminder & Campaign Engine.");
    }
  }

  /**
   * Sweeps and delivers pending patient reminders
   */
  public static async processPendingReminders(): Promise<void> {
    const now = new Date();
    try {
      const pendingReminders = await db.reminder.findMany({
        where: {
          status: { in: ["PENDING", "FAILED"] },
          retryCount: { lt: 3 },
          scheduledAt: { lte: now },
          deletedAt: null,
        },
        include: { patient: true },
      });

      if (pendingReminders.length === 0) return;
      logger.info(`Found ${pendingReminders.length} pending reminders for dispatch.`);

      for (const rem of pendingReminders) {
        try {
          // Send reminder via whatsapp service
          await WhatsAppService.sendMessage(rem.hospitalId, rem.patient.phone, rem.message);

          await db.reminder.update({
            where: { id: rem.id },
            data: { status: "SENT", sentAt: new Date() },
          });
        } catch (sendErr) {
          logger.error(`Failed to send reminder ID ${rem.id}:`, sendErr);
          await db.reminder.update({
            where: { id: rem.id },
            data: {
              status: "FAILED",
              retryCount: { increment: 1 },
            },
          });
        }
      }
    } catch (err) {
      logger.error("Failed to process pending reminders list sweep:", err);
    }
  }

  /**
   * Processes active scheduled campaigns
   */
  public static async processPendingCampaigns(): Promise<void> {
    const now = new Date();
    try {
      const activeCampaigns = await db.campaign.findMany({
        where: {
          status: { in: ["SCHEDULED", "DRAFT"] }, // draft with scheduled time supports sweep
          scheduledAt: { lte: now },
          deletedAt: null,
        },
        include: { template: true },
      });

      if (activeCampaigns.length === 0) return;
      logger.info(`Found ${activeCampaigns.length} scheduled campaigns ready for broadcasting.`);

      for (const camp of activeCampaigns) {
        // Set campaign status to active
        await db.campaign.update({
          where: { id: camp.id },
          data: { status: "ACTIVE" },
        });

        const recipients = await db.campaignRecipient.findMany({
          where: { campaignId: camp.id, status: "PENDING" },
          include: { patient: true },
        });

        for (const rec of recipients) {
          try {
            // Personalize template message context
            let messageBody = camp.template.content;
            messageBody = messageBody.replace(/{{name}}/g, rec.patient.name);
            messageBody = messageBody.replace(/{{id}}/g, rec.patient.patientId);

            await WhatsAppService.sendMessage(camp.hospitalId, rec.patient.phone, messageBody);

            await db.campaignRecipient.update({
              where: { id: rec.id },
              data: { status: "SENT", sentAt: new Date() },
            });
          } catch (recErr) {
            logger.error(`Failed delivery for campaign recipient ID ${rec.id}:`, recErr);
            await db.campaignRecipient.update({
              where: { id: rec.id },
              data: { status: "FAILED" },
            });
          }
        }

        // Set status to complete
        await db.campaign.update({
          where: { id: camp.id },
          data: { status: "COMPLETED", sentAt: new Date() },
        });
      }
    } catch (err) {
      logger.error("Failed to process campaign sweep:", err);
    }
  }
}
export default ReminderEngine;
