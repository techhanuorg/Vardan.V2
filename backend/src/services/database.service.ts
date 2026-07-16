import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger.js";

export class DatabaseService {
  private static instance: PrismaClient | null = null;

  public static getInstance(): PrismaClient {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new PrismaClient({
        log: [
          { emit: "event", level: "query" },
          { emit: "event", level: "info" },
          { emit: "event", level: "warn" },
          { emit: "event", level: "error" },
        ],
      });

      /* eslint-disable @typescript-eslint/no-explicit-any */
      // Bind logger to Prisma client events
      const client = DatabaseService.instance as any;
      client.$on("query", (e: any) => {
        logger.debug(
          { query: e.query, params: e.params, duration: `${e.duration}ms` },
          "Prisma Query"
        );
      });
      client.$on("info", (e: any) => {
        logger.info(e.message, "Prisma Info");
      });
      client.$on("warn", (e: any) => {
        logger.warn(e.message, "Prisma Warning");
      });
      client.$on("error", (e: any) => {
        logger.error(e.message, "Prisma Error");
      });
      /* eslint-enable @typescript-eslint/no-explicit-any */
    }

    return DatabaseService.instance;
  }

  public static async connect(): Promise<void> {
    const client = this.getInstance();
    await client.$connect();
    logger.info("Connected to PostgreSQL via Prisma Client successfully.");
  }

  public static async disconnect(): Promise<void> {
    if (DatabaseService.instance) {
      await DatabaseService.instance.$disconnect();
      DatabaseService.instance = null;
      logger.info("Disconnected Prisma Client successfully.");
    }
  }
}

export const db = DatabaseService.getInstance();
export default DatabaseService;
