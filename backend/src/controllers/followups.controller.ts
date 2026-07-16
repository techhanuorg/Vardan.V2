import { Response } from "express";
import { db } from "../services/database.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";

export class FollowUpsController {
  // ==========================================
  // FOLLOWUPS CRUD
  // ==========================================
  public static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const followups = await db.followUp.findMany({
        where: { hospitalId, deletedAt: null },
        include: { patient: true, appointment: true },
        orderBy: { followUpDate: "asc" },
      });
      ApiResponse.success(res, "Followups listed.", followups);
    } catch (e) {
      ApiResponse.error(res, "Failed to load follow-ups.", e, 500);
    }
  }

  public static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const { patientId, appointmentId, followUpDate, reason } = req.body;

    if (!patientId || !followUpDate) {
      ApiResponse.error(res, "Patient ID and follow-up date are required.", undefined, 400);
      return;
    }

    try {
      const date = new Date(followUpDate);
      const followup = await db.followUp.create({
        data: {
          hospitalId,
          patientId,
          appointmentId,
          followUpDate: date,
          reason: reason || "Routine Follow-up",
          status: "PENDING",
        },
      });

      // Automatically schedule a reminder 1 day before the follow-up
      const reminderDate = new Date(date);
      reminderDate.setDate(reminderDate.getDate() - 1);

      await db.reminder.create({
        data: {
          hospitalId,
          patientId,
          type: "FOLLOWUP",
          message: `Dear patient, this is a reminder for your upcoming follow-up consultation on ${date.toLocaleDateString()}. Please arrive 15 minutes early.`,
          scheduledAt: reminderDate,
          status: "PENDING",
        },
      });

      ApiResponse.success(res, "Follow-up logged and reminder scheduled.", followup, 201);
    } catch (e) {
      ApiResponse.error(res, "Failed to create follow-up.", e, 500);
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    const { followUpDate, reason, status } = req.body;
    try {
      const followup = await db.followUp.update({
        where: { id },
        data: {
          followUpDate: followUpDate ? new Date(followUpDate) : undefined,
          reason,
          status,
        },
      });
      ApiResponse.success(res, "Follow-up updated.", followup);
    } catch (e) {
      ApiResponse.error(res, "Failed to update follow-up.", e, 500);
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      await db.followUp.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      ApiResponse.success(res, "Follow-up soft deleted.");
    } catch (e) {
      ApiResponse.error(res, "Failed to delete follow-up.", e, 500);
    }
  }

  // ==========================================
  // TEMPLATES CRUD
  // ==========================================
  public static async listTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const templates = await db.template.findMany({
        where: { hospitalId, deletedAt: null },
        orderBy: { createdAt: "desc" },
      });
      ApiResponse.success(res, "Templates listed.", templates);
    } catch (e) {
      ApiResponse.error(res, "Failed to load templates.", e, 500);
    }
  }

  public static async createTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const { name, type, content } = req.body;

    if (!name || !content) {
      ApiResponse.error(res, "Template name and message content are required.", undefined, 400);
      return;
    }

    try {
      const template = await db.template.create({
        data: {
          hospitalId,
          name,
          type: type || "TEXT",
          content,
        },
      });
      ApiResponse.success(res, "Template created.", template, 201);
    } catch (e) {
      ApiResponse.error(res, "Failed to create template.", e, 500);
    }
  }

  public static async updateTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    const { name, type, content } = req.body;
    try {
      const template = await db.template.update({
        where: { id },
        data: { name, type, content },
      });
      ApiResponse.success(res, "Template modified.", template);
    } catch (e) {
      ApiResponse.error(res, "Failed to modify template.", e, 500);
    }
  }

  public static async deleteTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      await db.template.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      ApiResponse.success(res, "Template soft deleted.");
    } catch (e) {
      ApiResponse.error(res, "Failed to delete template.", e, 500);
    }
  }

  // ==========================================
  // CAMPAIGNS EXTRA CRUD
  // ==========================================
  public static async listCampaigns(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      const campaigns = await db.campaign.findMany({
        where: { hospitalId, deletedAt: null },
        include: { template: true },
        orderBy: { createdAt: "desc" },
      });
      ApiResponse.success(res, "Campaigns listed.", campaigns);
    } catch (e) {
      ApiResponse.error(res, "Failed to load campaigns.", e, 500);
    }
  }

  public static async createCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const { name, templateId, scheduledAt, patientIds } = req.body;

    if (!name || !templateId) {
      ApiResponse.error(res, "Campaign name and template ID are required.", undefined, 400);
      return;
    }

    try {
      const date = scheduledAt ? new Date(scheduledAt) : null;
      const status = date ? "SCHEDULED" : "DRAFT";

      const campaign = await db.campaign.create({
        data: {
          hospitalId,
          name,
          templateId,
          scheduledAt: date,
          status,
        },
      });

      // Bind recipients
      if (Array.isArray(patientIds) && patientIds.length > 0) {
        const createData = patientIds.map((pId) => ({
          campaignId: campaign.id,
          patientId: pId,
          status: "PENDING",
        }));
        await db.campaignRecipient.createMany({ data: createData });
      }

      ApiResponse.success(res, "Campaign created.", campaign, 201);
    } catch (e) {
      ApiResponse.error(res, "Failed to create campaign.", e, 500);
    }
  }

  public static async sendCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { campaignId } = req.body;

    if (!campaignId) {
      ApiResponse.error(res, "Campaign ID is required.", undefined, 400);
      return;
    }

    try {
      const campaign = await db.campaign.findFirst({
        where: { id: campaignId, hospitalId: req.user.hospitalId, deletedAt: null },
      });

      if (!campaign) {
        ApiResponse.error(res, "Campaign not found.", undefined, 404);
        return;
      }

      // Trigger reschedule sweep immediately or mark for dispatch
      await db.campaign.update({
        where: { id: campaign.id },
        data: { status: "SCHEDULED", scheduledAt: new Date() },
      });

      ApiResponse.success(res, "Campaign dispatch scheduled immediately.");
    } catch (e) {
      ApiResponse.error(res, "Failed to schedule immediate broadcast.", e, 500);
    }
  }

  public static async scheduleCampaign(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { campaignId, scheduledAt } = req.body;

    if (!campaignId || !scheduledAt) {
      ApiResponse.error(res, "Campaign ID and scheduled date are required.", undefined, 400);
      return;
    }

    try {
      const campaign = await db.campaign.findFirst({
        where: { id: campaignId, hospitalId: req.user.hospitalId, deletedAt: null },
      });

      if (!campaign) {
        ApiResponse.error(res, "Campaign not found.", undefined, 404);
        return;
      }

      await db.campaign.update({
        where: { id: campaign.id },
        data: { status: "SCHEDULED", scheduledAt: new Date(scheduledAt) },
      });

      ApiResponse.success(res, "Campaign schedule configured.");
    } catch (e) {
      ApiResponse.error(res, "Failed to schedule broadcast.", e, 500);
    }
  }
}
export default FollowUpsController;
