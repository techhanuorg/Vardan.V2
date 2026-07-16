import fs from "fs/promises";
import path from "path";
import { db } from "./database.service.js";
import logger from "../utils/logger.js";

export class BackupService {
  /**
   * Backup all hospital configurations, settings, departments, templates, and FAQ content to a backup folder
   */
  public static async createBackup(targetDirectory: string): Promise<string> {
    logger.info("Initializing database backup cycle...");
    try {
      await fs.mkdir(targetDirectory, { recursive: true });

      const data = {
        hospitals: await db.hospital.findMany(),
        settings: await db.setting.findMany(),
        departments: await db.department.findMany(),
        roles: await db.role.findMany(),
        permissions: await db.permission.findMany(),
        templates: await db.template.findMany(),
        knowledgeBases: await db.knowledgeBase.findMany(),
        faqs: await db.fAQ.findMany(),
      };

      const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      const filepath = path.join(targetDirectory, filename);

      await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
      logger.info({ filepath }, "Database backup saved successfully.");
      return filepath;
    } catch (error) {
      logger.error({ error }, "Database backup failed!");
      throw error;
    }
  }
}

export default BackupService;
