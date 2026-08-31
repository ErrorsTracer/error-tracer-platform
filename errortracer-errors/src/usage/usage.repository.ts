import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';
import { randomUUID } from 'crypto';

@Injectable()
export class UsageRepository {
  constructor(private readonly sequelize: Sequelize) {}

  async increment(data: { userId: string; applicationId: string; errorBytes: number }, transaction: Transaction) {
    await this.sequelize.query(`
      INSERT INTO usage (id, "userId", "applicationId", "totalErrorBytes", "totalErrorCount", "createdAt", "updatedAt")
      VALUES (:id, :userId, :applicationId, :errorBytes, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("applicationId") DO UPDATE SET
        "userId" = EXCLUDED."userId",
        "totalErrorBytes" = usage."totalErrorBytes" + EXCLUDED."totalErrorBytes",
        "totalErrorCount" = usage."totalErrorCount" + 1,
        "updatedAt" = CURRENT_TIMESTAMP
    `, { replacements: { id: randomUUID(), ...data }, transaction });
  }
}
