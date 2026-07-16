import { db } from "../services/database.service.js";

import { TransactionClient } from "../services/transaction.service.js";

export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  constructor(protected modelName: string) {}

  protected get client() {
    return db;
  }

  protected getModel(tx?: TransactionClient) {
    const activeClient = tx || this.client;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (activeClient as any)[this.modelName];
  }

  public async findById(id: string, tx?: TransactionClient): Promise<T | null> {
    return this.getModel(tx).findFirst({
      where: {
        id,
        OR: [{ deletedAt: null }, { deletedAt: undefined }],
      },
    });
  }

  public async findMany(
    filter: Record<string, unknown> = {},
    tx?: TransactionClient
  ): Promise<T[]> {
    return this.getModel(tx).findMany({
      where: {
        ...filter,
        OR: [{ deletedAt: null }, { deletedAt: undefined }],
      },
    });
  }

  public async create(data: CreateInput, tx?: TransactionClient): Promise<T> {
    return this.getModel(tx).create({
      data,
    });
  }

  public async update(id: string, data: UpdateInput, tx?: TransactionClient): Promise<T> {
    return this.getModel(tx).update({
      where: { id },
      data,
    });
  }

  public async delete(id: string, tx?: TransactionClient): Promise<T> {
    return this.getModel(tx).delete({
      where: { id },
    });
  }

  /**
   * Performs soft deletion by setting the deletedAt field to the current date.
   */
  public async softDelete(id: string, tx?: TransactionClient): Promise<T> {
    return this.getModel(tx).update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
export default BaseRepository;
