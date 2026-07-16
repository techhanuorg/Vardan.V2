import fs from "fs/promises";
import logger from "../utils/logger.js";

import TransactionService from "./transaction.service.js";

export class RestoreService {
  /**
   * Restore configuration tables from a JSON backup file
   */
  public static async restoreBackup(filepath: string): Promise<void> {
    logger.info({ filepath }, "Initiating database restore from backup file...");
    try {
      const fileContent = await fs.readFile(filepath, "utf-8");
      const data = JSON.parse(fileContent);

      await TransactionService.execute(async (tx) => {
        // Clear existing tables in reverse order of relationships
        await tx.setting.deleteMany({});
        await tx.fAQ.deleteMany({});
        await tx.knowledgeBase.deleteMany({});
        await tx.template.deleteMany({});
        await tx.user.deleteMany({});
        await tx.role.deleteMany({});
        await tx.permission.deleteMany({});
        await tx.department.deleteMany({});
        await tx.hospital.deleteMany({});

        // Populate database
        if (data.hospitals?.length) await tx.hospital.createMany({ data: data.hospitals });
        if (data.permissions?.length) await tx.permission.createMany({ data: data.permissions });
        if (data.roles?.length) await tx.role.createMany({ data: data.roles });
        if (data.departments?.length) await tx.department.createMany({ data: data.departments });
        if (data.settings?.length) await tx.setting.createMany({ data: data.settings });
        if (data.templates?.length) await tx.template.createMany({ data: data.templates });
        if (data.knowledgeBases?.length)
          await tx.knowledgeBase.createMany({ data: data.knowledgeBases });
        if (data.faqs?.length) await tx.fAQ.createMany({ data: data.faqs });
      });

      logger.info("Database configuration tables restored successfully.");
    } catch (error) {
      logger.error({ error, filepath }, "Database restore failed!");
      throw error;
    }
  }
}

export default RestoreService;
