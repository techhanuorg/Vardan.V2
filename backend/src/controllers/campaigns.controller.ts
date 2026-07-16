import { Response } from "express";
import { db } from "../services/database.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";

export class CampaignsController {
  // ==========================================
  // CAMPAIGNS CRUD & ACTIONS
  // ==========================================

  public static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      ApiResponse.success(res, "Campaigns retrieved.", campaigns);
    } catch (e) {
      ApiResponse.error(res, "Failed to load campaigns list.", e, 500);
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      const campaign = await db.campaign.findFirst({
        where: { id, hospitalId: req.user.hospitalId, deletedAt: null },
        include: { template: true },
      });

      if (!campaign) {
        ApiResponse.error(res, "Campaign not found.", undefined, 404);
        return;
      }

      // Calculate progress analytics
      const total = await db.campaignRecipient.count({ where: { campaignId: id } });
      const queued = await db.campaignRecipient.count({ where: { campaignId: id, status: "PENDING" } });
      const sending = await db.campaignRecipient.count({ where: { campaignId: id, status: "SENDING" } });
      const sent = await db.campaignRecipient.count({ where: { campaignId: id, status: "SENT" } });
      const failed = await db.campaignRecipient.count({ where: { campaignId: id, status: "FAILED" } });

      const progress = {
        total,
        queued,
        sending,
        sent,
        failed,
        successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
      };

      ApiResponse.success(res, "Campaign details loaded.", { campaign, progress });
    } catch (e) {
      ApiResponse.error(res, "Failed to retrieve campaign details.", e, 500);
    }
  }

  public static async getLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      const logs = await db.campaignRecipient.findMany({
        where: { campaignId: id },
        include: { patient: true },
        orderBy: { sentAt: "desc" },
      });
      ApiResponse.success(res, "Campaign logs retrieved.", logs);
    } catch (e) {
      ApiResponse.error(res, "Failed to load campaign logs.", e, 500);
    }
  }

  public static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const parsedDate = scheduledAt ? new Date(scheduledAt) : null;
      const status = parsedDate ? "SCHEDULED" : "DRAFT";

      const campaign = await db.campaign.create({
        data: {
          hospitalId,
          name,
          templateId,
          scheduledAt: parsedDate,
          status,
        },
      });

      // Bind recipients list
      if (Array.isArray(patientIds) && patientIds.length > 0) {
        const payload = patientIds.map((pId: string) => ({
          campaignId: campaign.id,
          patientId: pId,
          status: "PENDING",
        }));
        await db.campaignRecipient.createMany({ data: payload });
      }

      ApiResponse.success(res, "Campaign created.", campaign, 201);
    } catch (e) {
      ApiResponse.error(res, "Failed to build campaign.", e, 500);
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    const { name, templateId, scheduledAt } = req.body;
    try {
      const campaign = await db.campaign.update({
        where: { id },
        data: {
          name,
          templateId,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        },
      });
      ApiResponse.success(res, "Campaign updated.", campaign);
    } catch (e) {
      ApiResponse.error(res, "Failed to modify campaign properties.", e, 500);
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      await db.campaign.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      ApiResponse.success(res, "Campaign archived.");
    } catch (e) {
      ApiResponse.error(res, "Failed to delete campaign.", e, 500);
    }
  }

  // Lifecycle modifiers
  public static async start(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      const campaign = await db.campaign.update({
        where: { id },
        data: { status: "ACTIVE" },
      });
      ApiResponse.success(res, "Campaign dispatch activated.", campaign);
    } catch (e) {
      ApiResponse.error(res, "Failed to trigger campaign activation.", e, 500);
    }
  }

  public static async pause(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      const campaign = await db.campaign.update({
        where: { id },
        data: { status: "PAUSED" },
      });
      ApiResponse.success(res, "Campaign dispatch paused.", campaign);
    } catch (e) {
      ApiResponse.error(res, "Failed to pause campaign.", e, 500);
    }
  }

  public static async resume(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      const campaign = await db.campaign.update({
        where: { id },
        data: { status: "ACTIVE" },
      });
      ApiResponse.success(res, "Campaign dispatch resumed.", campaign);
    } catch (e) {
      ApiResponse.error(res, "Failed to resume campaign queue.", e, 500);
    }
  }

  public static async cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    try {
      const campaign = await db.campaign.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      // Set all remaining pending or sending recipients to SKIPPED
      await db.campaignRecipient.updateMany({
        where: { campaignId: id, status: { in: ["PENDING", "SENDING"] } },
        data: { status: "SKIPPED" },
      });

      ApiResponse.success(res, "Campaign queue cancelled.", campaign);
    } catch (e) {
      ApiResponse.error(res, "Failed to cancel campaign queue.", e, 500);
    }
  }

  // ==========================================
  // TEMPLATE MANAGER CRUD
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
      ApiResponse.success(res, "Templates list retrieved.", templates);
    } catch (e) {
      ApiResponse.error(res, "Failed to load templates list.", e, 500);
    }
  }

  public static async createTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const { name, content, type } = req.body;

    if (!name || !content) {
      ApiResponse.error(res, "Template name and contents are required.", undefined, 400);
      return;
    }

    try {
      const template = await db.template.create({
        data: {
          hospitalId,
          name,
          content,
          type: type || "WHATSAPP",
        },
      });
      ApiResponse.success(res, "Template created successfully.", template, 201);
    } catch (e) {
      ApiResponse.error(res, "Failed to create template profile.", e, 500);
    }
  }

  public static async updateTemplate(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { id } = req.params;
    const { name, content, type } = req.body;
    try {
      const template = await db.template.update({
        where: { id },
        data: { name, content, type },
      });
      ApiResponse.success(res, "Template modified.", template);
    } catch (e) {
      ApiResponse.error(res, "Failed to update template contents.", e, 500);
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
      ApiResponse.success(res, "Template archived.");
    } catch (e) {
      ApiResponse.error(res, "Failed to delete template.", e, 500);
    }
  }
}
export default CampaignsController;
