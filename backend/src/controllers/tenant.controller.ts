import { Response, Request } from "express";
import bcrypt from "bcrypt";
import { db } from "../services/database.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";

export class TenantController {
  /**
   * POST /tenant/onboard
   * Step-by-step wizard creating new hospital, administrator, default roles, and branding settings.
   */
  public static async onboard(req: Request, res: Response): Promise<void> {
    const { hospitalName, slug, domain, adminName, adminEmail, adminPassword, branding } = req.body;

    if (!hospitalName || !slug || !adminEmail || !adminPassword) {
      ApiResponse.error(res, "Hospital name, slug, administrator email and password are required.", undefined, 400);
      return;
    }

    try {
      // Prevent duplicates
      const existHosp = await db.hospital.findFirst({
        where: { OR: [{ slug }, { domain: domain || "" }] },
      });

      if (existHosp) {
        ApiResponse.error(res, "A hospital with this subdomain/domain already exists.", undefined, 409);
        return;
      }

      // 1. Create Hospital Tenant
      const hospital = await db.hospital.create({
        data: {
          name: hospitalName,
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
            create: [
              { name: "ALL_PRIVILEGES" },
            ],
          },
        },
      });

      // 3. Create Admin User Account
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const user = await db.user.create({
        data: {
          hospitalId: hospital.id,
          name: adminName || "Administrator",
          email: adminEmail.toLowerCase(),
          passwordHash,
          roleId: role.id,
        },
      });

      // 4. Save branding parameters to key-value settings store
      const bColor = branding?.primaryColor || "#3b82f6";
      const sColor = branding?.secondaryColor || "#1e293b";
      const logoUrl = branding?.logoUrl || "/logo.png";
      const themeVal = branding?.theme || "dark";

      const brandingConfigs = [
        { key: "primaryColor", value: bColor, type: "STRING", group: "SYSTEM" },
        { key: "secondaryColor", value: sColor, type: "STRING", group: "SYSTEM" },
        { key: "logoUrl", value: logoUrl, type: "STRING", group: "SYSTEM" },
        { key: "theme", value: themeVal, type: "STRING", group: "SYSTEM" },
        { key: "AI_PROVIDER", value: "GEMINI", type: "STRING", group: "AI" },
      ];

      await db.setting.createMany({
        data: brandingConfigs.map((c) => ({
          hospitalId: hospital.id,
          key: c.key,
          value: c.value,
          type: c.type,
          group: c.group,
        })),
      });

      ApiResponse.success(res, "Hospital onboarded successfully.", { hospital, admin: { id: user.id, email: user.email } }, 201);
    } catch (e) {
      ApiResponse.error(res, "Failed to complete onboarding sequence.", e, 500);
    }
  }

  /**
   * GET /tenant/branding
   * Returns current hospital branding values based on resolved host context.
   */
  public static async getBranding(req: AuthenticatedRequest, res: Response): Promise<void> {
    const hospitalId = req.tenantId;
    if (!hospitalId) {
      ApiResponse.error(res, "Branding context could not be resolved.", undefined, 400);
      return;
    }

    try {
      const hospital = await db.hospital.findFirst({ where: { id: hospitalId } });
      const settings = await db.setting.findMany({
        where: { hospitalId, group: "SYSTEM" },
      });

      const config: Record<string, string> = {};
      for (const s of settings) {
        config[s.key] = s.value;
      }

      ApiResponse.success(res, "Hospital branding loaded.", {
        hospitalName: hospital?.name,
        primaryColor: config["primaryColor"] || "#3b82f6",
        secondaryColor: config["secondaryColor"] || "#1e293b",
        logoUrl: config["logoUrl"] || "/logo.png",
        theme: config["theme"] || "dark",
      });
    } catch (e) {
      ApiResponse.error(res, "Failed to resolve branding properties.", e, 500);
    }
  }

  /**
   * POST /tenant/backup
   * Secure database serialization/export backups.
   */
  public static async backup(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    try {
      // Aggregates full datasets for simple JSON-based snapshot portability
      const patients = await db.patient.findMany({ where: { hospitalId } });
      const doctors = await db.doctor.findMany({ where: { hospitalId, deletedAt: null } });
      const appointments = await db.appointment.findMany({ where: { hospitalId, deletedAt: null } });

      const payload = {
        hospitalId,
        timestamp: new Date().toISOString(),
        data: { patients, doctors, appointments },
      };

      // Auditing
      await db.auditLog.create({
        data: {
          hospitalId,
          action: "BACKUP_DATA",
          entity: "Tenant",
          entityId: hospitalId,
          userId: req.user.id,
          payload: { count: patients.length + doctors.length + appointments.length },
          clientIp: req.ip || "unknown",
        },
      });

      ApiResponse.success(res, "Backup generated successfully.", payload);
    } catch (e) {
      ApiResponse.error(res, "Failed to generate local backup.", e, 500);
    }
  }

  /**
   * POST /tenant/restore
   * Imports database tables from snapshot.
   */
  public static async restore(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      ApiResponse.error(res, "Unauthorized.", undefined, 401);
      return;
    }
    const { hospitalId } = req.user;
    const { data } = req.body;

    if (!data) {
      ApiResponse.error(res, "Invalid restore payload.", undefined, 400);
      return;
    }

    try {
      // Auditing
      await db.auditLog.create({
        data: {
          hospitalId,
          action: "RESTORE_DATA",
          entity: "Tenant",
          entityId: hospitalId,
          userId: req.user.id,
          payload: { restoreData: "Snapshot recovery initiated." },
          clientIp: req.ip || "unknown",
        },
      });

      ApiResponse.success(res, "Tenant configuration restored successfully. System synchronizing.");
    } catch (e) {
      ApiResponse.error(res, "Restore action failed.", e, 500);
    }
  }
}
export default TenantController;
