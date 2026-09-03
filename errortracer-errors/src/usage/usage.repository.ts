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

  async incrementMany(rows: { userId: string; applicationId: string; errorBytes: number }[], transaction: Transaction) {
    if (rows.length === 0) return;
    const totals = new Map<string, { id: string; userId: string; applicationId: string; errorBytes: number; errorCount: number }>();
    for (const row of rows) {
      const existing = totals.get(row.applicationId);
      if (existing) {
        existing.errorBytes += row.errorBytes;
        existing.errorCount += 1;
      } else {
        totals.set(row.applicationId, { id: randomUUID(), ...row, errorCount: 1 });
      }
    }

    await this.sequelize.query(`
      INSERT INTO usage (id, "userId", "applicationId", "totalErrorBytes", "totalErrorCount", "createdAt", "updatedAt")
      SELECT x.id, x."userId", x."applicationId", x."errorBytes", x."errorCount", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM jsonb_to_recordset(CAST(:rows AS jsonb)) AS x(
        id uuid, "userId" uuid, "applicationId" uuid, "errorBytes" bigint, "errorCount" bigint
      )
      ON CONFLICT ("applicationId") DO UPDATE SET
        "userId" = EXCLUDED."userId",
        "totalErrorBytes" = usage."totalErrorBytes" + EXCLUDED."totalErrorBytes",
        "totalErrorCount" = usage."totalErrorCount" + EXCLUDED."totalErrorCount",
        "updatedAt" = CURRENT_TIMESTAMP
    `, { replacements: { rows: JSON.stringify([...totals.values()]) }, transaction });
  }
}
