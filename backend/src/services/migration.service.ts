import { exec } from "child_process";
import { promisify } from "util";
import logger from "../utils/logger.js";

const execAsync = promisify(exec);

export class MigrationService {
  /**
   * Run pending migrations programmatically
   */
  public static async runMigrations(): Promise<void> {
    logger.info("Checking database migrations status...");
    try {
      const { stdout, stderr } = await execAsync("npx prisma migrate deploy");
      if (stdout) {
        logger.info({ output: stdout.trim() }, "Migrations deployed successfully");
      }
      if (stderr) {
        logger.warn({ error: stderr.trim() }, "Migration output logs warning");
      }
    } catch (error) {
      logger.error({ error }, "Database migration deployment failed!");
      throw error;
    }
  }
}

export default MigrationService;
