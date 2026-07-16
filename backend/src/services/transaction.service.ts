import { Prisma } from "@prisma/client";
import { db } from "./database.service.js";

export type TransactionClient = Prisma.TransactionClient;

export class TransactionService {
  /**
   * Run a function within a database transaction context
   */
  public static async execute<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    }
  ): Promise<T> {
    return db.$transaction(fn, options) as Promise<T>;
  }
}

export default TransactionService;
