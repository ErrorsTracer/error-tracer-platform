import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class TransactionManager {
  constructor(private readonly sequelize: Sequelize) {}

  async runInTransaction<T>(
    job: (transaction: Transaction) => Promise<T>,
  ): Promise<T> {
    const transaction = await this.sequelize.transaction();

    try {
      const result = await job(transaction);
      await transaction.commit();

      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
