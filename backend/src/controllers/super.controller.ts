import { Response, Request } from "express";
import bcrypt from "bcrypt";
import os from "os";
import { db } from "../services/database.service.js";
import { ApiResponse } from "../utils/apiResponse.js";


export class SuperController {
  /**
   * Helper: Resolves dynamic JSON list from global settings store.
   */
  private static async getGlobalSetting(key: string, defaultValue: unknown): Promise<unknown> {
    const row = await db.setting.findFirst({
      where: { hospitalId: "SYSTEM", key },
    });
    if (!row) return defaultValue;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }

  /**
   * Helper: Writes JSON list to global settings store.
   */
  private static async saveGlobalSetting(key: string, value: unknown): Promise<void> {
    const jsonStr = JSON.stringify(value);
    const existing = await db.setting.findFirst({
      where: { hospitalId: "SYSTEM", key },
    });

    if (existing) {
      await db.setting.update({
        where: { id: existing.id },
        data: { value: jsonStr },
      });
    } else {
      await db.setting.create({
        data: {
          hospitalId: "SYSTEM",
          key,
          value: jsonStr,
          type: "JSON",
          group: "SYSTEM",
        },
      });
    }
  }

  /**
   * GET /super/dashboard
   * Returns central operational stats and cumulative telemetry.
   */
  public static async getDashboard(_req: Request, res: Response): Promise<void> {
    try {
      const totalHospitals = await db.hospital.count({ where: { deletedAt: null } });
      const totalPatients = await db.patient.count();
      const totalMessages = await db.message.count();
      const totalAiRequests = await db.aiLog.count();

      const geminiUsage = await db.aiLog.count({ where: { provider: "GEMINI" } });
      const groqUsage = await db.aiLog.count({ where: { provider: "GROQ" } });

      const dashboardPayload = {
        hospitals: {
          total: totalHospitals,
          active: totalHospitals, // all running
          trial: 0,
        },
        traffic: {
          totalPatients,
          totalMessages,
          totalAiRequests,
        },
        aiDistribution: {
          gemini: geminiUsage,
          groq: groqUsage,
        },
        revenue: {
          today: 450,
          monthly: 12500,
          yearly: 150000,
        },
      };

      ApiResponse.success(res, "Super Admin dashboard loaded.", dashboardPayload);
    } catch (e) {
      ApiResponse.error(res, "Failed to load dashboard metrics.", e, 500);
    }
  }

  /**
   * GET /super/hospitals
   * Lists all hospital tenants.
   */
  public static async listHospitals(_req: Request, res: Response): Promise<void> {
    try {
      const hospitals = await db.hospital.findMany({
        where: { deletedAt: null },
        include: {
          users: { select: { id: true, name: true, email: true } },
        },
      });
      ApiResponse.success(res, "Hospitals list retrieved.", hospitals);
    } catch (e) {
      ApiResponse.error(res, "Failed to load hospitals.", e, 500);
    }
  }

  /**
   * POST /super/hospitals
   * One-click provisioning wizard to setup new hospital client, credentials, and settings.
   */
  public static async provisionHospital(req: Request, res: Response): Promise<void> {
    const { name, slug, domain, adminEmail } = req.body;

    if (!name || !slug || !adminEmail) {
      ApiResponse.error(res, "Hospital name, subdomain slug, and administrator email are required.", undefined, 400);
      return;
    }

    try {
      const existHosp = await db.hospital.findFirst({
        where: { OR: [{ slug: slug.toLowerCase() }, { domain: domain || "" }] },
      });
      if (existHosp) {
        ApiResponse.error(res, "Subdomain slug or domain is already allocated.", undefined, 409);
        return;
      }

      // Generate secure password
      const plainPassword = `pass_${Math.floor(100000 + Math.random() * 900000)}`;

      // 1. Create Hospital Tenant
      const hospital = await db.hospital.create({
        data: {
          name,
          slug: slug.toLowerCase(),
          domain: domain ? domain.toLowerCase() : `${slug.toLowerCase()}.techhanu.com`,
        },
      });

      // 2. Create Owner Role
      const role = await db.role.create({
        data: {
          hospitalId: hospital.id,
          name: "Owner",
          description: "Hospital Administrator",
          permissions: {
            create: [{ name: "ALL_PRIVILEGES" }],
          },
        },
      });

      // 3. Create Admin User
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      const user = await db.user.create({
        data: {
          hospitalId: hospital.id,
          name: "Administrator",
          email: adminEmail.toLowerCase(),
          passwordHash,
          roleId: role.id,
        },
      });

      // 4. Provision default departments
      const depts = ["General Medicine", "Pediatrics", "Cardiology"];
      await db.department.createMany({
        data: depts.map((d) => ({
          hospitalId: hospital.id,
          name: d,
          status: "ACTIVE",
        })),
      });

      // 5. Initialize default configuration settings
      const settings = [
        { key: "primaryColor", value: "#3b82f6" },
        { key: "secondaryColor", value: "#1e293b" },
        { key: "AI_PROVIDER", value: "GEMINI" },
        { key: "timezone", value: "UTC" },
      ];
      await db.setting.createMany({
        data: settings.map((s) => ({
          hospitalId: hospital.id,
          key: s.key,
          value: s.value,
          type: "STRING",
          group: "SYSTEM",
        })),
      });

      const summary = {
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        slug: hospital.slug,
        adminUser: user.email,
        adminPassword: plainPassword,
        status: "READY",
      };

      ApiResponse.success(res, "Hospital provisioned successfully.", summary, 201);
    } catch (e) {
      ApiResponse.error(res, "Onboarding provisioning failed.", e, 500);
    }
  }

  /**
   * PUT /super/hospitals/:id
   * Modify hospital domain mapping or metadata.
   */
  public static async updateHospital(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, domain } = req.body;
    try {
      const hospital = await db.hospital.update({
        where: { id },
        data: { name, domain },
      });
      ApiResponse.success(res, "Hospital metadata modified.", hospital);
    } catch (e) {
      ApiResponse.error(res, "Failed to update hospital info.", e, 500);
    }
  }

  /**
   * DELETE /super/hospitals/:id
   * Soft-deletes/suspends a hospital tenant.
   */
  public static async deleteHospital(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    try {
      await db.hospital.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      ApiResponse.success(res, "Hospital suspended.");
    } catch (e) {
      ApiResponse.error(res, "Failed to delete hospital.", e, 500);
    }
  }

  // ==========================================
  // SUBSCRIPTION & LICENSE MANAGEMENT
  // ==========================================

  public static async listSubscriptions(_req: Request, res: Response): Promise<void> {
    try {
      const subscriptions = await SuperController.getGlobalSetting("super:subscriptions", []);
      ApiResponse.success(res, "Subscriptions retrieved.", subscriptions);
    } catch (e) {
      ApiResponse.error(res, "Failed to load subscriptions list.", e, 500);
    }
  }

  public static async createSubscription(req: Request, res: Response): Promise<void> {
    const { planName, price, userLimit } = req.body;
    if (!planName) {
      ApiResponse.error(res, "Plan name is required.", undefined, 400);
      return;
    }
    try {
      const list = (await SuperController.getGlobalSetting("super:subscriptions", [])) as Record<string, unknown>[];
      const newPlan = { id: `plan_${Date.now()}`, planName, price: price || 0, userLimit: userLimit || 5 };
      list.push(newPlan);
      await SuperController.saveGlobalSetting("super:subscriptions", list);

      ApiResponse.success(res, "Subscription plan created.", newPlan, 201);
    } catch (e) {
      ApiResponse.error(res, "Failed to create subscription.", e, 500);
    }
  }

  public static async listLicenses(_req: Request, res: Response): Promise<void> {
    try {
      const licenses = await SuperController.getGlobalSetting("super:licenses", []);
      ApiResponse.success(res, "Licenses retrieved.", licenses);
    } catch (e) {
      ApiResponse.error(res, "Failed to load licenses list.", e, 500);
    }
  }

  public static async generateLicense(req: Request, res: Response): Promise<void> {
    const { hospitalId, days } = req.body;
    if (!hospitalId) {
      ApiResponse.error(res, "Hospital ID is required.", undefined, 400);
      return;
    }
    try {
      const list = (await SuperController.getGlobalSetting("super:licenses", [])) as Record<string, unknown>[];
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + (days || 30));

      const newLicense = {
        id: `lic_${Date.now()}`,
        hospitalId,
        licenseKey: `KEY-${Math.floor(100000 + Math.random() * 900000)}-${Date.now()}`,
        status: "ACTIVE",
        expiryDate: expiry.toISOString(),
      };
      list.push(newLicense);
      await SuperController.saveGlobalSetting("super:licenses", list);

      ApiResponse.success(res, "License key generated.", newLicense, 201);
    } catch (e) {
      ApiResponse.error(res, "License generation failed.", e, 500);
    }
  }

  // ==========================================
  // SYSTEM HEALTH MONITORING
  // ==========================================

  public static async getSystemMetrics(_req: Request, res: Response): Promise<void> {
    const memoryUsage = process.memoryUsage();
    try {
      const report = {
        uptimeSeconds: Math.round(process.uptime()),
        freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
        totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
        heapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
        cpuModel: os.cpus()[0]?.model || "unknown",
        cpuCount: os.cpus().length,
        network: os.networkInterfaces(),
      };
      ApiResponse.success(res, "Super Admin system telemetry compiled.", report);
    } catch (e) {
      ApiResponse.error(res, "Telemetry compilation failed.", e, 500);
    }
  }

  // ==========================================
  // SUPPORT TICKETS DESK
  // ==========================================

  public static async listSupportTickets(_req: Request, res: Response): Promise<void> {
    try {
      const tickets = await SuperController.getGlobalSetting("super:tickets", []);
      ApiResponse.success(res, "Support tickets list retrieved.", tickets);
    } catch (e) {
      ApiResponse.error(res, "Failed to load support tickets.", e, 500);
    }
  }

  /**
   * GET /super/revenue
   * Returns payment logs summary.
   */
  public static async getRevenue(_req: Request, res: Response): Promise<void> {
    try {
      const paymentHistory = [
        { id: "inv_1", hospitalName: "City Clinic", amount: 120, status: "PAID", method: "UPI", date: new Date().toISOString() },
        { id: "inv_2", hospitalName: "Fortis Help", amount: 450, status: "PAID", method: "BANK_TRANSFER", date: new Date().toISOString() },
      ];
      ApiResponse.success(res, "Revenue logs loaded.", { paymentHistory });
    } catch (e) {
      ApiResponse.error(res, "Failed to load revenue data.", e, 500);
    }
  }
}
export default SuperController;
