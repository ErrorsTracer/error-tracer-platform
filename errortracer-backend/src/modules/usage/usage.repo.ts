import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { QueryTypes, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { v4 as uuid } from 'uuid';
import { Usage } from '../../database/models/usage.model';

type IncrementUsageData = {
  userId: string;
  applicationId: string;
  errorBytes: number;
};

type TotalUsageRow = {
  totalErrorBytes: string | null;
  totalErrorCount: string | null;
};

@Injectable()
export class UsageRepository {
  constructor(
    @InjectModel(Usage)
    private usageModel: typeof Usage,
    private sequelize: Sequelize,
  ) {}

  async incrementForApplication(
    data: IncrementUsageData,
    transaction?: Transaction,
  ) {
    await this.sequelize.query(
      `
        INSERT INTO usage (
          id,
          "userId",
          "applicationId",
          "totalErrorBytes",
          "totalErrorCount",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          :id,
          :userId,
          :applicationId,
          :errorBytes,
          1,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT ("applicationId") DO UPDATE SET
          "userId" = EXCLUDED."userId",
          "totalErrorBytes" = usage."totalErrorBytes" + EXCLUDED."totalErrorBytes",
          "totalErrorCount" = usage."totalErrorCount" + 1,
          "updatedAt" = CURRENT_TIMESTAMP
      `,
      {
        replacements: {
          id: uuid(),
          userId: data.userId,
          applicationId: data.applicationId,
          errorBytes: data.errorBytes,
        },
        transaction,
      },
    );
  }

  async getByApplication(applicationId: string) {
    const usage = await this.usageModel.findOne({
      where: { applicationId },
    });

    return this.formatUsageTotals(usage);
  }

  async getTotalByUser(userId: string) {
    const [usage] = await this.sequelize.query<TotalUsageRow>(
      `
        SELECT
          COALESCE(SUM("totalErrorBytes"), 0)::text AS "totalErrorBytes",
          COALESCE(SUM("totalErrorCount"), 0)::text AS "totalErrorCount"
        FROM usage
        WHERE "userId" = :userId
      `,
      {
        replacements: { userId },
        type: QueryTypes.SELECT,
      },
    );

    return {
      totalErrorBytes: usage?.totalErrorBytes ?? '0',
      totalErrorCount: usage?.totalErrorCount ?? '0',
    };
  }

  private formatUsageTotals(usage: Usage | null) {
    return {
      totalErrorBytes: usage?.totalErrorBytes ?? '0',
      totalErrorCount: usage?.totalErrorCount ?? '0',
    };
  }
}
