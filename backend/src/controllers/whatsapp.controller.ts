import { Response } from "express";
import { WhatsAppService } from "../services/whatsapp.service.js";
import { db } from "../services/database.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";
import path from "path";
import fs from "fs";

export class WhatsAppController {
  /**
   * GET /whatsapp/status
   */
  public static async getStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;

    try {
      const state = WhatsAppService.getStatus(hospitalId);
      const device = await db.device.findUnique({
        where: { hospitalId },
      });

      ApiResponse.success(res, "WhatsApp status retrieved.", {
        ...state,
        device: device || null,
      });
    } catch (error) {
      ApiResponse.error(res, "Failed to retrieve status.", error, 500);
    }
  }

  /**
   * GET /whatsapp/qr
   */
  public static async getQr(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;

    try {
      const state = WhatsAppService.getStatus(hospitalId);
      if (!state.qr) {
        ApiResponse.error(res, "QR code not available or device already connected.", undefined, 400);
        return;
      }
      ApiResponse.success(res, "QR code retrieved.", { qr: state.qr });
    } catch (error) {
      ApiResponse.error(res, "Failed to retrieve QR code.", error, 500);
    }
  }

  /**
   * POST /whatsapp/connect
   */
  public static async connect(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;

    try {
      await WhatsAppService.connect(hospitalId);
      ApiResponse.success(res, "WhatsApp initialization started.");
    } catch (error) {
      ApiResponse.error(res, "Failed to start WhatsApp connection.", error, 500);
    }
  }

  /**
   * POST /whatsapp/disconnect
   */
  public static async disconnect(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;

    try {
      await WhatsAppService.disconnect(hospitalId);
      ApiResponse.success(res, "WhatsApp session disconnected.");
    } catch (error) {
      ApiResponse.error(res, "Failed to disconnect WhatsApp.", error, 500);
    }
  }

  /**
   * POST /whatsapp/reconnect
   */
  public static async reconnect(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;

    try {
      await WhatsAppService.reconnect(hospitalId);
      ApiResponse.success(res, "WhatsApp reconnection started.");
    } catch (error) {
      ApiResponse.error(res, "Failed to reconnect WhatsApp.", error, 500);
    }
  }

  /**
   * POST /whatsapp/send
   */
  public static async send(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      // Find or create Conversation
      let conversation = await db.conversation.findFirst({
        where: { hospitalId, phone, deletedAt: null },
      });

      if (!conversation) {
        conversation = await db.conversation.create({
          data: { hospitalId, phone, context: {} },
        });
      }

      // 1. Create message entry in pending status
      const savedMsg = await db.message.create({
        data: {
          conversationId: conversation.id,
          sender: "DOCTOR",
          body: message,
          status: "PENDING",
        },
      });

      // 2. Dispatches message via Baileys engine
      const response = await WhatsAppService.sendMessage(hospitalId, phone, message);

      // 3. Mark update with returned message id
      await db.message.update({
        where: { id: savedMsg.id },
        data: {
          whatsappMessageId: response?.key?.id || null,
          status: "SENT",
        },
      });

      ApiResponse.success(res, "Message sent.", { messageId: savedMsg.id, response });
    } catch (error) {
      ApiResponse.error(res, "Failed to send message.", error instanceof Error ? error.message : error, 500);
    }
  }

  /**
   * POST /whatsapp/send-media
   */
  public static async sendMedia(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;
    const { phone, mediaUrl, caption, body } = req.body;

    if (!phone || !mediaUrl) {
      ApiResponse.error(res, "Recipient phone and mediaUrl are required.", undefined, 400);
      return;
    }

    try {
      let conversation = await db.conversation.findFirst({
        where: { hospitalId, phone, deletedAt: null },
      });

      if (!conversation) {
        conversation = await db.conversation.create({
          data: { hospitalId, phone, context: {} },
        });
      }

      const absolutePath = path.join(process.cwd(), mediaUrl);
      if (!fs.existsSync(absolutePath)) {
        ApiResponse.error(res, "Media file does not exist on disk.", undefined, 404);
        return;
      }

      const fileStats = fs.statSync(absolutePath);
      const fileName = path.basename(mediaUrl);

      // 1. Create message in pending
      const savedMsg = await db.message.create({
        data: {
          conversationId: conversation.id,
          sender: "DOCTOR",
          body: body || caption || `[Media: ${fileName}]`,
          mediaUrl,
          status: "PENDING",
          fileName,
          fileSize: fileStats.size,
        },
      });

      const response = await WhatsAppService.sendMessage(hospitalId, phone, body || "", {
        mediaUrl,
        caption,
      });

      await db.message.update({
        where: { id: savedMsg.id },
        data: {
          whatsappMessageId: response?.key?.id || null,
          status: "SENT",
        },
      });

      ApiResponse.success(res, "Media message sent.", { messageId: savedMsg.id, response });
    } catch (error) {
      ApiResponse.error(res, "Failed to send media message.", error instanceof Error ? error.message : error, 500);
    }
  }

  /**
   * GET /whatsapp/chats
   */
  public static async getChats(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { hospitalId } = req.user;

    try {
      const chats = await db.conversation.findMany({
        where: { hospitalId, deletedAt: null },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      ApiResponse.success(res, "Chats retrieved successfully.", chats);
    } catch (error) {
      ApiResponse.error(res, "Failed to retrieve chats.", error, 500);
    }
  }

  /**
   * GET /whatsapp/messages/:chatId
   */
  public static async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }

    const { chatId } = req.params;
    const { hospitalId } = req.user;

    try {
      const conversation = await db.conversation.findFirst({
        where: { id: chatId, hospitalId, deletedAt: null },
      });

      if (!conversation) {
        ApiResponse.error(res, "Chat conversation not found.", undefined, 404);
        return;
      }

      const messages = await db.message.findMany({
        where: { conversationId: chatId, deletedAt: null },
        orderBy: { createdAt: "asc" },
      });

      ApiResponse.success(res, "Messages retrieved successfully.", messages);
    } catch (error) {
      ApiResponse.error(res, "Failed to retrieve messages.", error, 500);
    }
  }
}
export default WhatsAppController;
