import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  downloadMediaMessage,
  proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import fs from "fs";
import path from "path";
import qrcode from "qrcode";
import { db } from "./database.service.js";
import logger from "../utils/logger.js";
import { Prisma } from "@prisma/client";
import { AiGateway } from "./ai/ai.gateway.js";
import { MultimodalService } from "./ai/multimodal.service.js";


export class WhatsAppService {
  private static sockets = new Map<string, WASocket>();
  private static qrCodes = new Map<string, string>(); // hospitalId -> qr data URL
  private static connectionStatuses = new Map<string, string>(); // hospitalId -> status

  /**
   * Returns count of active connected WhatsApp sessions.
   */
  public static getConnectedCount(): number {
    return Array.from(this.connectionStatuses.values()).filter((s) => s === "CONNECTED").length;
  }

  /**
   * Helper: Get local session directory path
   */
  private static getSessionDir(hospitalId: string): string {
    const dir = path.join(process.cwd(), "sessions", `hospital-${hospitalId}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Sync local session directory files to the database
   */
  private static async backupSessionToDb(hospitalId: string) {
    const dir = this.getSessionDir(hospitalId);
    const filesData: Record<string, string> = {};

    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          if (fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath, "base64");
            filesData[file] = content;
          }
        }
      }

      await db.whatsAppSession.upsert({
        where: { hospitalId_sessionName: { hospitalId, sessionName: "default" } },
        create: {
          hospitalId,
          sessionName: "default",
          sessionData: filesData as Prisma.InputJsonValue,
          status: this.connectionStatuses.get(hospitalId) || "DISCONNECTED",
        },
        update: {
          sessionData: filesData as Prisma.InputJsonValue,
          status: this.connectionStatuses.get(hospitalId) || "DISCONNECTED",
        },
      });
    } catch (error) {
      logger.error(`Failed to backup session to DB for hospital ${hospitalId}:`, error);
    }
  }

  /**
   * Restore session files from the database to the local directory
   */
  private static async restoreSessionFromDb(hospitalId: string): Promise<boolean> {
    const dir = this.getSessionDir(hospitalId);
    try {
      const session = await db.whatsAppSession.findFirst({
        where: { hospitalId, sessionName: "default", deletedAt: null },
      });

      if (!session || !session.sessionData) {
        return false;
      }

      const filesData = session.sessionData as Record<string, string>;
      for (const [file, content] of Object.entries(filesData)) {
        const filePath = path.join(dir, file);
        fs.writeFileSync(filePath, Buffer.from(content, "base64"));
      }

      return true;
    } catch (error) {
      logger.error(`Failed to restore session from DB for hospital ${hospitalId}:`, error);
      return false;
    }
  }

  /**
   * Retrieve active connection status
   */
  public static getStatus(hospitalId: string) {
    return {
      status: this.connectionStatuses.get(hospitalId) || "DISCONNECTED",
      qr: this.qrCodes.get(hospitalId) || null,
    };
  }

  /**
   * Reconnect trigger
   */
  public static async reconnect(hospitalId: string): Promise<void> {
    await this.disconnect(hospitalId);
    await this.connect(hospitalId);
  }

  /**
   * Disconnect WhatsApp connection and clear database session credentials
   */
  public static async disconnect(hospitalId: string): Promise<void> {
    const sock = this.sockets.get(hospitalId);
    if (sock) {
      try {
        sock.logout();
        sock.end(undefined);
      } catch (e) {
        // ignore endpoint termination errors
      }
      this.sockets.delete(hospitalId);
    }

    this.qrCodes.delete(hospitalId);
    this.connectionStatuses.set(hospitalId, "DISCONNECTED");

    // Purge local credentials folder
    const dir = this.getSessionDir(hospitalId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    // Update database status
    await db.whatsAppSession.updateMany({
      where: { hospitalId, sessionName: "default" },
      data: { status: "DISCONNECTED", sessionData: {} },
    });

    await db.device.upsert({
      where: { hospitalId },
      create: { hospitalId, status: "DISCONNECTED" },
      update: { status: "DISCONNECTED" },
    });
  }

  /**
   * Automatic session restore on boot
   */
  public static async autoRestoreAllSessions(): Promise<void> {
    try {
      const activeSessions = await db.whatsAppSession.findMany({
        where: { status: "CONNECTED", deletedAt: null },
      });

      for (const session of activeSessions) {
        logger.info(`Auto-restoring WhatsApp session for hospital: ${session.hospitalId}`);
        this.connect(session.hospitalId).catch((err) => {
          logger.error(`Failed auto-restoring session for hospital ${session.hospitalId}:`, err);
        });
      }
    } catch (e) {
      logger.error("Auto session restore failed:", e);
    }
  }

  /**
   * Connect and initialize a WhatsApp socket connection
   */
  public static async connect(hospitalId: string): Promise<void> {
    if (this.sockets.has(hospitalId)) {
      return;
    }

    this.connectionStatuses.set(hospitalId, "CONNECTING");

    // Recreate files from database on fresh deployment/server restart
    await this.restoreSessionFromDb(hospitalId);

    const sessionDir = this.getSessionDir(hospitalId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: logger as unknown as import("pino").Logger,
    });

    this.sockets.set(hospitalId, sock);

    sock.ev.on("creds.update", async () => {
      await saveCreds();
      await this.backupSessionToDb(hospitalId);
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await qrcode.toDataURL(qr);
          this.qrCodes.set(hospitalId, qrDataUrl);
        } catch (e) {
          logger.error("Failed to generate QR data URL:", e);
        }
      }

      if (connection === "connecting") {
        this.connectionStatuses.set(hospitalId, "CONNECTING");
      }

      if (connection === "open") {
        this.connectionStatuses.set(hospitalId, "CONNECTED");
        this.qrCodes.delete(hospitalId);

        const jid = sock.user?.id;
        const name = sock.user?.name || "Connected Device";

        await db.device.upsert({
          where: { hospitalId },
          create: {
            hospitalId,
            whatsappId: jid,
            whatsappName: name,
            platform: "Baileys",
            phone: jid?.split("@")[0] || "",
            status: "CONNECTED",
            lastConnected: new Date(),
          },
          update: {
            whatsappId: jid,
            whatsappName: name,
            platform: "Baileys",
            phone: jid?.split("@")[0] || "",
            status: "CONNECTED",
            lastConnected: new Date(),
          },
        });

        // Backup final state with connected status
        await this.backupSessionToDb(hospitalId);
      }

      if (connection === "close") {
        this.qrCodes.delete(hospitalId);
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

        logger.info(
          `Connection closed for hospital ${hospitalId}. Reconnect: ${shouldReconnect}`
        );

        this.sockets.delete(hospitalId);

        if (shouldReconnect) {
          this.connectionStatuses.set(hospitalId, "CONNECTING");
          setTimeout(() => this.connect(hospitalId), 5000);
        } else {
          this.connectionStatuses.set(hospitalId, "DISCONNECTED");
          await this.disconnect(hospitalId);
        }
      }
    });

    // Inbound Message processing pipeline
    sock.ev.on("messages.upsert", async (m) => {
      if (m.type !== "notify") return;

      for (const msg of m.messages) {
        if (!msg.message) continue;
        if (msg.key.fromMe) continue; // Skip messages sent by the bot JID

        const from = msg.key.remoteJid;
        if (!from) continue;

        const senderPhone = from.split("@")[0];
        const pushName = msg.pushName || "Patient";

        // Extract message contents
        const textContent =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption ||
          "";

        try {
          // 1. Create or Find Patient mapping by phone JID
          let patient = await db.patient.findFirst({
            where: { hospitalId, phone: senderPhone, deletedAt: null },
          });

          if (!patient) {
            patient = await db.patient.create({
              data: {
                hospitalId,
                patientId: `P-WA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: pushName,
                phone: senderPhone,
                gender: "UNKNOWN",
                age: 0,
                dob: new Date("2000-01-01"),
                address: "WhatsApp Registered",
                emergencyContact: {},
              },
            });
          }

          // 2. Create or Find Conversation
          let conversation = await db.conversation.findFirst({
            where: { hospitalId, phone: senderPhone, deletedAt: null },
          });

          if (!conversation) {
            conversation = await db.conversation.create({
              data: {
                hospitalId,
                phone: senderPhone,
                context: {},
              },
            });
          }

          // 3. Handle media downloads if media message present
          let mediaUrl: string | null = null;
          let mimeType: string | null = null;
          let fileName: string | null = null;
          let fileSize: number | null = null;

          const isMedia =
            msg.message.imageMessage ||
            msg.message.videoMessage ||
            msg.message.audioMessage ||
            msg.message.documentMessage;

          if (isMedia) {
            const buffer = await downloadMediaMessage(
              msg,
              "buffer",
              {},
              {
                logger: logger as unknown as import("pino").Logger,
                reuploadRequest: sock.updateMediaMessage
              }
            );

            const fileExtension =
              msg.message.imageMessage?.mimetype?.split("/")[1] ||
              msg.message.videoMessage?.mimetype?.split("/")[1] ||
              msg.message.audioMessage?.mimetype?.split("/")[1] ||
              "bin";

            fileName = `wa_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExtension}`;
            mimeType =
              msg.message.imageMessage?.mimetype ||
              msg.message.videoMessage?.mimetype ||
              msg.message.audioMessage?.mimetype ||
              msg.message.documentMessage?.mimetype ||
              "application/octet-stream";

            fileSize = buffer.length;

            const uploadDir = path.join(process.cwd(), "uploads");
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, buffer);
            mediaUrl = `/uploads/${fileName}`;
          }

          // 4. Save incoming message record to database
          await db.message.create({
            data: {
              conversationId: conversation.id,
              sender: "PATIENT",
              body: textContent || (isMedia ? `[Media: ${mimeType}]` : ""),
              mediaUrl,
              whatsappMessageId: msg.key.id,
              status: "DELIVERED",
              mimeType,
              fileName,
              fileSize,
            },
          });

          // Route media through MultimodalService, text-only through AiGateway
          try {
            let replyText: string | null = null;

            if (isMedia && fileName && mimeType) {
              const localFilePath = path.join(process.cwd(), "uploads", fileName);
              replyText = await MultimodalService.classifyAndProcess(
                hospitalId,
                localFilePath,
                fileName,
                mimeType,
                senderPhone
              );
            } else if (textContent) {
              replyText = await AiGateway.chat(hospitalId, senderPhone, textContent);
            }

            if (replyText) {
              await this.sendMessage(hospitalId, senderPhone, replyText);
            }
          } catch (aiErr) {
            logger.error("AI routing error:", aiErr);
          }

          logger.info(`Message processed from ${senderPhone}: "${textContent || `[${mimeType}]`}"`);
        } catch (err) {
          logger.error("Failed processing incoming message:", err);
        }
      }
    });

    // Delivery Status update events
    sock.ev.on("messages.update", async (updates) => {
      for (const update of updates) {
        if (!update.key.id) continue;
        const statusMap: Record<number, string> = {
          1: "SENT",
          2: "SENT", // Baileys returns 2 for server acknowledgment
          3: "DELIVERED",
          4: "READ",
        };

        if (update.update && update.update.status) {
          const dbStatus = statusMap[update.update.status];
          if (dbStatus) {
            try {
              await db.message.updateMany({
                where: { whatsappMessageId: update.key.id },
                data: { status: dbStatus },
              });
            } catch (err) {
              logger.error("Failed updating message receipt status:", err);
            }
          }
        }
      }
    });
  }

  /**
   * Send an outgoing text or media message
   */
  public static async sendMessage(
    hospitalId: string,
    phone: string,
    body: string,
    options?: { mediaUrl?: string; caption?: string }
  ): Promise<proto.WebMessageInfo | undefined> {
    const sock = this.sockets.get(hospitalId);
    if (!sock) {
      throw new Error("WhatsApp connection is inactive.");
    }

    const formattedJid = `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
    let response: proto.WebMessageInfo | undefined;

    // Convert local files to Buffers if media option passed
    if (options?.mediaUrl) {
      const absolutePath = path.join(process.cwd(), options.mediaUrl);
      if (fs.existsSync(absolutePath)) {
        const fileBuffer = fs.readFileSync(absolutePath);
        const isImage = options.mediaUrl.match(/\.(jpeg|jpg|png|gif)$/i);
        const isVideo = options.mediaUrl.match(/\.(mp4|3gp|mov|avi)$/i);
        const isAudio = options.mediaUrl.match(/\.(mp3|ogg|wav|m4a)$/i);

        if (isImage) {
          response = await sock.sendMessage(formattedJid, {
            image: fileBuffer,
            caption: options.caption || body,
          });
        } else if (isVideo) {
          response = await sock.sendMessage(formattedJid, {
            video: fileBuffer,
            caption: options.caption || body,
          });
        } else if (isAudio) {
          response = await sock.sendMessage(formattedJid, {
            audio: fileBuffer,
            mimetype: "audio/mp4",
          });
        } else {
          response = await sock.sendMessage(formattedJid, {
            document: fileBuffer,
            fileName: path.basename(options.mediaUrl),
            mimetype: "application/octet-stream",
          });
        }
      } else {
        throw new Error("Media file not found locally.");
      }
    } else {
      response = await sock.sendMessage(formattedJid, { text: body });
    }

    return response;
  }
}
export default WhatsAppService;
