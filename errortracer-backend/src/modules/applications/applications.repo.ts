import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  col,
  fn,
  literal,
  Op,
  QueryTypes,
  Transaction,
  where as sequelizeWhere,
} from 'sequelize';
import { ApplicationMembership } from '../../database/models/application-membership.model';
import { Frameworks } from '../../database/models/frameworks.model';
import { Applications } from '../../database/models/applications.model';
import { Environments } from '../../database/models/environments.model';
import { Errors } from '../../database/models/errors.model';
import { Notifications } from '../../database/models/notifications.model';

import { Users } from '../../database/models/users.model';
import {
  ApplicationMembershipRole,
  ApplicationMembershipStatus,
  ApplicationStatus,
  NotificationType,
} from '../../common/constants/app.constants';
import { generateCred } from '../../utils/credentials';

type CreateAppData = {
  name: string;
  about: string;
  frameworkId: string;
  ownerId: string;
};

type CreateAppMembershipData = {
  applicationId: string;
  userId: string;
  role: ApplicationMembershipRole;
  status: ApplicationMembershipStatus;
  joinedAt: Date | null;
  invitedBy?: string | null;
};

type CreateEnvironmentData = {
  applicationId: string;
  isEnabled: boolean;
  envName: string;
};

type UpdateProductionModeData = {
  applicationId: string;
  isEnabled: boolean;
};

type UpdateApplicationStatusData = {
  applicationId: string;
  status: ApplicationStatus;
};

type getAppsMembershipByUserId = {
  memberId: string;
  isActiveMembership: boolean;
};

type GetAppByNameForUserData = {
  name: string;
  userId: string;
};

type GetAppByIdForUserData = {
  applicationId: string;
  userId: string;
};

type GetMembershipForAppByRoleData = {
  applicationId: string;
  userId: string;
  role: ApplicationMembershipRole;
};

type CreateNotificationData = {
  applicationId: string;
  userId: string;
  type: NotificationType;
  message: string;
};

type ErrorCursorData = {
  createdAt: Date;
  id: string;
};

type GetErrorsByApplicationIdData = {
  applicationId: string;
  limit: number;
  cursor?: ErrorCursorData;
};

type GetRecentErrorsByApplicationIdData = {
  applicationId: string;
  limit: number;
};

type GetRecentErrorsByUserApplicationsData = {
  userId: string;
  limit: number;
};

type GetGroupedErrorsByUserApplicationsData = {
  userId: string;
  applicationId?: string;
  level?: string;
  sort: 'lastOccurred' | 'topRepeated';
  limit: number;
  cursor?: GroupedUserApplicationErrorsCursor;
};

type GroupedUserApplicationErrorsCursor = {
  lastOccurredAt: Date;
  repeated: number;
  applicationId: string;
  errorName: string;
  level: string | null;
};

type GetTopAffectedRoutesByApplicationIdData = {
  applicationId: string;
  limit: number;
};

type RecentErrorGroup = {
  errorName: string;
  level: string | null;
  repeated: number | string;
  lastSeenAt: Date | string;
};

type UserApplicationRecentError = {
  errorName: string;
  level: string | null;
  client: string | null;
  runtime: string | null;
  repeated: number;
  lastSeenAt: Date | string;
};

type GroupedUserApplicationErrorGroup = {
  applicationId: string;
  errorName: string;
  level: string | null;
  repeated: number | string;
  lastOccurredAt: Date | string;
};

type UserApplicationGroupedError = {
  id: string | null;
  errorName: string;
  level: string | null;
  client: string | null;
  runtime: string | null;
  applicationId: string;
  applicationName: string | null;
  repeated: number;
  lastOccurredAt: Date | string;
};

type TopAffectedRouteRow = {
  route: string;
  errors: number | string;
  lastSeenAt: Date | string;
};

type GetErrorDetailsByApplicationIdData = {
  applicationId: string;
  errorId: string;
};

type WeeklyErrorReportRow = {
  week: 'thisWeek' | 'lastWeek';
  dayOfWeek: number;
  errors: number;
};

type GroupedWeeklyErrorCount = {
  date: string;
  errors: number | string;
};

@Injectable()
export class ApplicationsRepository {
  constructor(
    @InjectModel(Frameworks)
    private frameworksRepository: typeof Frameworks,
    @InjectModel(Applications)
    private appsRepository: typeof Applications,
    @InjectModel(ApplicationMembership)
    private appMembershipRepository: typeof ApplicationMembership,

    @InjectModel(Users)
    private usersRepository: typeof Users,
    @InjectModel(Environments)
    private environmentsRepository: typeof Environments,
    @InjectModel(Errors)
    private errorsRepository: typeof Errors,
    @InjectModel(Notifications)
    private notificationsRepository: typeof Notifications,
  ) {}

  async getFrameworks() {
    return await this.frameworksRepository.findAll();
  }

  async createApplication(data: CreateAppData, transaction?: Transaction) {
    return await this.appsRepository.create(
      {
        name: data.name,
        about: data.about,
        frameworkId: data.frameworkId,
        ownerId: data.ownerId,
      } as any,
      { transaction },
    );
  }

  async createApplicationMembership(
    data: CreateAppMembershipData,
    transaction?: Transaction,
  ) {
    return await this.appMembershipRepository.create(
      {
        applicationId: data.applicationId,
        userId: data.userId,
        role: data.role,
        status: data.status,
        joinedAt: data.joinedAt,
        invitedBy: data.invitedBy ?? null,
      } as any,
      { transaction },
    );
  }

  async getUserByEmail(email: string) {
    return await this.usersRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async createUserByEmail(email: string, transaction?: Transaction) {
    return await this.usersRepository.create(
      {
        email: email.toLowerCase().trim(),
      } as any,
      { transaction },
    );
  }

  async getMembershipByAppAndUser(applicationId: string, userId: string) {
    return await this.appMembershipRepository.findOne({
      where: { applicationId, userId },
      paranoid: false,
    });
  }

  async getActiveMembershipForApp({
    applicationId,
    userId,
  }: Omit<GetMembershipForAppByRoleData, 'role'>) {
    return await this.appMembershipRepository.findOne({
      where: {
        applicationId,
        userId,
        status: ApplicationMembershipStatus.ACTIVE,
      },
    });
  }

  async createNotification(
    data: CreateNotificationData,
    transaction?: Transaction,
  ) {
    return await this.notificationsRepository.create(
      {
        applicationId: data.applicationId,
        userId: data.userId,
        type: data.type,
        message: data.message,
      } as any,
      { transaction },
    );
  }

  async createEnvironment(
    data: CreateEnvironmentData,
    transaction?: Transaction,
  ) {
    return await this.environmentsRepository.create(
      {
        applicationId: data.applicationId,
        isEnabled: data.isEnabled,
        envName: data.envName,
      } as any,
      { transaction },
    );
  }

  async updateProductionMode(data: UpdateProductionModeData) {
    const environment = await this.environmentsRepository.findOne({
      where: { applicationId: data.applicationId },
    });

    if (!environment) {
      return null;
    }

    environment.isEnabled = data.isEnabled;

    return await environment.save();
  }

  async rotateAppKey(applicationId: string) {
    const environment = await this.environmentsRepository.findOne({
      where: { applicationId },
    });

    if (!environment) {
      return null;
    }

    environment.appKey = generateCred();

    return await environment.save();
  }

  async getMembershipForAppByRole({
    applicationId,
    userId,
    role,
  }: GetMembershipForAppByRoleData) {
    return await this.appMembershipRepository.findOne({
      where: {
        applicationId,
        userId,
        role,
        status: ApplicationMembershipStatus.ACTIVE,
      },
    });
  }

  async getOwnerMembershipForApp({
    applicationId,
    userId,
  }: Omit<GetMembershipForAppByRoleData, 'role'>) {
    return await this.getMembershipForAppByRole({
      applicationId,
      userId,
      role: ApplicationMembershipRole.OWNER,
    });
  }

  async deleteCredentialsByApplicationId(
    applicationId: string,
    transaction?: Transaction,
  ) {
    return await this.environmentsRepository.destroy({
      where: { applicationId },
      transaction,
    });
  }

  async deleteMembershipsByApplicationId(
    applicationId: string,
    transaction?: Transaction,
  ) {
    return await this.appMembershipRepository.destroy({
      where: { applicationId },
      transaction,
    });
  }

  async deleteErrorsByApplicationId(
    applicationId: string,
    transaction?: Transaction,
  ) {
    return await this.errorsRepository.destroy({
      where: { applicationId },
      transaction,
    });
  }

  async deleteApplication(applicationId: string, transaction?: Transaction) {
    return await this.appsRepository.destroy({
      where: { id: applicationId },
      transaction,
    });
  }

  async updateApplicationStatus(data: UpdateApplicationStatusData) {
    const application = await this.appsRepository.unscoped().findOne({
      where: { id: data.applicationId },
    });

    if (!application) {
      return null;
    }

    application.status = data.status;

    return await application.save();
  }

  async getAppsMembershipByUserId({
    memberId: userId,
  }: getAppsMembershipByUserId) {
    return await this.appMembershipRepository.findAll({
      where: { userId, status: ApplicationMembershipStatus.ACTIVE },
      include: [{ model: Applications }],
    });
  }

  async getUserApps(userId: string) {
    const applications = await this.appsRepository
      .scope({ method: ['associatedWithUser', userId] })
      .findAll({
        attributes: {
          exclude: ['deletedAt', 'updatedAt', 'ownerId', 'frameworkId'],
        },
        include: [
          { model: Frameworks, attributes: ['name'] },
          { model: Environments, as: 'environment', attributes: ['envName'] },
        ],
      });

    await Promise.all(
      applications.map(async (application) => {
        const counts = await this.getApplicationOverviewCounts(application.id);

        application.setDataValue('membershipsCount', counts.membershipsCount);
        application.setDataValue('totalErrors', counts.errorsCount);
        application.setDataValue('criticalErrors', counts.criticalCount);
      }),
    );

    return applications;
  }

  async getErrorsSeverityDistributionByUserId(userId: string) {
    const applicationIds = await this.getApplicationIdsForUser(userId);

    if (applicationIds.length === 0) {
      return {
        criticalErrorsCount: 0,
        totalErrorsCount: 0,
      };
    }

    const [criticalErrorsCount, totalErrorsCount] = await Promise.all([
      this.errorsRepository.count({
        where: {
          applicationId: { [Op.in]: applicationIds },
          level: { [Op.in]: ['fatal', 'critical'] },
        },
      }),
      this.errorsRepository.count({
        where: { applicationId: { [Op.in]: applicationIds } },
      }),
    ]);

    return {
      criticalErrorsCount,
      totalErrorsCount,
    };
  }

  async getAppByNameForUser({ name, userId }: GetAppByNameForUserData) {
    return await this.appsRepository
      .scope({ method: ['associatedWithUser', userId] })
      .findOne({
        where: { name },
      });
  }

  async getAppByIdForUser({ applicationId, userId }: GetAppByIdForUserData) {
    const application = await this.appsRepository
      .scope({ method: ['associatedWithUser', userId] })
      .findOne({
        where: { id: applicationId },
        attributes: {
          exclude: ['deletedAt', 'updatedAt', 'ownerId', 'frameworkId'],
        },
        include: [
          { model: Frameworks, attributes: ['name'] },
          { model: Environments, as: 'environment', attributes: ['envName'] },
        ],
      });

    if (!application) {
      return null;
    }

    const counts = await this.getApplicationOverviewCounts(application.id);
    application.setDataValue('membershipsCount', counts.membershipsCount);
    application.setDataValue('errorsCount', counts.errorsCount);
    application.setDataValue('criticalCount', counts.criticalCount);

    return application;
  }

  async getAllAppInfo({ applicationId, userId }: GetAppByIdForUserData) {
    return await this.appsRepository
      .unscoped()
      .scope({ method: ['associatedWithUser', userId] })
      .findOne({
        where: { id: applicationId },

        include: [
          {
            model: Environments,
            as: 'environment',
            attributes: {
              exclude: ['deletedAt', 'updatedAt', 'id', 'applicationId'],
            },
          },
        ],
      });
  }

  async getApplicationMemberships(applicationId: string) {
    return await this.appMembershipRepository.findAll({
      where: {
        applicationId,
        status: ApplicationMembershipStatus.ACTIVE,
      },
      include: [
        {
          model: Users,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email'],
        },
      ],
      attributes: {
        exclude: ['applicationId', 'deletedAt', 'updatedAt', 'userId'],
      },
    });
  }

  async getErrorsByApplicationId({
    applicationId,
    limit,
    cursor,
  }: GetErrorsByApplicationIdData) {
    return await this.errorsRepository.findAll({
      where: {
        applicationId,
        ...(cursor
          ? {
              [Op.or]: [
                { createdAt: { [Op.lt]: cursor.createdAt } },
                {
                  createdAt: cursor.createdAt,
                  id: { [Op.lt]: cursor.id },
                },
              ],
            }
          : {}),
      },
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit,
      attributes: {
        exclude: ['applicationId', 'updatedAt'],
      },
    });
  }

  async getRecentErrorsByApplicationId({
    applicationId,
    limit,
  }: GetRecentErrorsByApplicationIdData) {
    const errorName = this.getErrorNameExpression();
    const groups = (await this.errorsRepository.findAll({
      attributes: [
        [errorName, 'errorName'],
        [fn('COUNT', col('id')), 'repeated'],
        [fn('MAX', col('createdAt')), 'lastSeenAt'],
      ],
      where: { applicationId },
      group: [errorName],
      order: [[fn('MAX', col('createdAt')), 'DESC']],
      limit,
      raw: true,
    })) as unknown as RecentErrorGroup[];

    const errors = await Promise.all(
      groups.map(async (group) => {
        const latestError = await this.errorsRepository.findOne({
          where: {
            applicationId,
            [Op.and]: sequelizeWhere(
              this.getErrorNameExpression(),
              group.errorName,
            ),
          },
          order: [
            ['createdAt', 'DESC'],
            ['id', 'DESC'],
          ],
          attributes: {
            exclude: ['applicationId', 'updatedAt'],
          },
        });

        if (!latestError) {
          return null;
        }

        return {
          ...latestError.get({ plain: true }),
          errorName: group.errorName,
          repeated: Number(group.repeated),
          lastSeenAt: group.lastSeenAt,
        };
      }),
    );

    return errors.filter((error) => error !== null);
  }

  async getRecentErrorsByUserApplications({
    userId,
    limit,
  }: GetRecentErrorsByUserApplicationsData): Promise<
    UserApplicationRecentError[]
  > {
    const applicationIds = await this.getApplicationIdsForUser(userId);

    if (applicationIds.length === 0) {
      return [];
    }

    const errorName = this.getErrorNameExpression();
    const groups = (await this.errorsRepository.findAll({
      attributes: [
        [errorName, 'errorName'],
        'level',
        [fn('COUNT', col('id')), 'repeated'],
        [fn('MAX', col('createdAt')), 'lastSeenAt'],
      ],
      where: { applicationId: { [Op.in]: applicationIds } },
      group: [errorName, 'level'],
      order: [[fn('MAX', col('createdAt')), 'DESC']],
      limit,
      raw: true,
    })) as unknown as RecentErrorGroup[];

    return await Promise.all(
      groups.map(async (group) => {
        const latestError = await this.errorsRepository.findOne({
          where: {
            applicationId: { [Op.in]: applicationIds },
            level: group.level,
            [Op.and]: sequelizeWhere(
              this.getErrorNameExpression(),
              group.errorName,
            ),
          },
          order: [
            ['createdAt', 'DESC'],
            ['id', 'DESC'],
          ],
          attributes: ['client', 'runtime'],
        });

        return {
          errorName: group.errorName,
          level: group.level,
          client: latestError?.client ?? null,
          runtime: latestError?.runtime ?? null,
          repeated: Number(group.repeated),
          lastSeenAt: group.lastSeenAt,
        };
      }),
    );
  }

  async getGroupedErrorsByUserApplications({
    userId,
    applicationId,
    level,
    sort,
    limit,
    cursor,
  }: GetGroupedErrorsByUserApplicationsData): Promise<
    UserApplicationGroupedError[]
  > {
    const applicationIds = applicationId
      ? [applicationId]
      : await this.getApplicationIdsForUser(userId);

    if (applicationIds.length === 0) {
      return [];
    }

    const cursorWhere = this.getGroupedErrorsCursorWhere(sort, Boolean(cursor));
    const orderBy =
      sort === 'topRepeated'
        ? `"repeated" DESC, "lastOccurredAt" DESC, "applicationId" ASC, "errorName" ASC, COALESCE("level", '') ASC`
        : `"lastOccurredAt" DESC, "repeated" DESC, "applicationId" ASC, "errorName" ASC, COALESCE("level", '') ASC`;

    const rows =
      await this.errorsRepository.sequelize!.query<UserApplicationGroupedError>(
        `
          WITH grouped AS (
            SELECT
              "Errors"."applicationId" AS "applicationId",
              COALESCE("Errors"."error", "Errors"."name") AS "errorName",
              "Errors"."level" AS "level",
              COUNT("Errors"."id")::int AS "repeated",
              MAX("Errors"."createdAt") AS "lastOccurredAt"
            FROM "errors-logs" AS "Errors"
            WHERE
              "Errors"."applicationId" IN (:applicationIds)
              AND (:level::text IS NULL OR "Errors"."level" = :level)
            GROUP BY
              "Errors"."applicationId",
              COALESCE("Errors"."error", "Errors"."name"),
              "Errors"."level"
          )
          SELECT
            grouped."applicationId",
            grouped."errorName",
            grouped."level",
            grouped."repeated",
            grouped."lastOccurredAt",
            latest."id",
            latest."client",
            latest."runtime",
            application."name" AS "applicationName"
          FROM grouped
          JOIN "applications" AS application
            ON application."id" = grouped."applicationId"
          LEFT JOIN LATERAL (
            SELECT
              latest."id",
              latest."client",
              latest."runtime"
            FROM "errors-logs" AS latest
            WHERE
              latest."applicationId" = grouped."applicationId"
              AND latest."level" IS NOT DISTINCT FROM grouped."level"
              AND COALESCE(latest."error", latest."name") = grouped."errorName"
            ORDER BY latest."createdAt" DESC, latest."id" DESC
            LIMIT 1
          ) AS latest ON true
          ${cursorWhere}
          ORDER BY ${orderBy}
          LIMIT :limit
        `,
        {
          type: QueryTypes.SELECT,
          replacements: {
            applicationIds,
            level: level ?? null,
            limit,
            cursorRepeated: cursor?.repeated ?? null,
            cursorLastOccurredAt: cursor?.lastOccurredAt ?? null,
            cursorApplicationId: cursor?.applicationId ?? null,
            cursorErrorName: cursor?.errorName ?? null,
            cursorLevel: cursor?.level ?? null,
          },
        },
      );

    return rows.map((row) => ({
      ...row,
      repeated: Number(row.repeated),
    }));
  }

  async getWeeklyErrorReportByApplicationId(applicationId: string) {
    return await this.getWeeklyErrorReport({
      applicationId,
    });
  }

  async getTopAffectedRoutesByApplicationId({
    applicationId,
    limit,
  }: GetTopAffectedRoutesByApplicationIdData) {
    const routeSql = this.getAffectedRouteExpression();
    const routeExpression = literal(routeSql);
    const rows = (await this.errorsRepository.findAll({
      attributes: [
        [routeExpression, 'route'],
        [fn('COUNT', col('Errors.id')), 'errors'],
        [fn('MAX', col('Errors.createdAt')), 'lastSeenAt'],
      ],
      where: { applicationId },
      group: [routeExpression as any],
      having: literal(`${routeSql} IS NOT NULL`),
      order: [
        [fn('COUNT', col('Errors.id')), 'DESC'],
        [fn('MAX', col('Errors.createdAt')), 'DESC'],
        [routeExpression, 'ASC'],
      ],
      limit,
      raw: true,
    })) as unknown as TopAffectedRouteRow[];

    return rows.map((row) => ({
      route: row.route,
      errors: Number(row.errors),
      lastSeenAt: row.lastSeenAt,
    }));
  }

  async getWeeklyErrorReportByOwnerId(ownerId: string) {
    return await this.getWeeklyErrorReport({
      ownerId,
    });
  }

  private async getWeeklyErrorReport({
    applicationId,
    ownerId,
  }: {
    applicationId?: string;
    ownerId?: string;
  }) {
    const thisWeekStart = this.getUtcWeekStart(new Date());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);
    const nextWeekStart = new Date(thisWeekStart);
    nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7);
    const utcCreatedDate = fn(
      'date',
      fn('timezone', 'UTC', col('Errors.createdAt')),
    );

    const counts = (await this.errorsRepository.findAll({
      attributes: [
        [utcCreatedDate, 'date'],
        [fn('COUNT', col('Errors.id')), 'errors'],
      ],
      where: {
        ...(applicationId ? { applicationId } : {}),
        createdAt: {
          [Op.gte]: lastWeekStart,
          [Op.lt]: nextWeekStart,
        },
      },
      include: ownerId
        ? [
            {
              model: Applications,
              attributes: [],
              where: { ownerId },
              required: true,
            },
          ]
        : undefined,
      group: [utcCreatedDate],
      raw: true,
    })) as unknown as GroupedWeeklyErrorCount[];

    return counts.map((count): WeeklyErrorReportRow => {
      const date = new Date(`${count.date}T00:00:00.000Z`);

      return {
        week: date >= thisWeekStart ? 'thisWeek' : 'lastWeek',
        dayOfWeek: date.getUTCDay() || 7,
        errors: Number(count.errors),
      };
    });
  }

  async getErrorDetailsByApplicationId({
    applicationId,
    errorId,
  }: GetErrorDetailsByApplicationIdData) {
    const error = await this.errorsRepository.findOne({
      where: { applicationId, id: errorId },
      attributes: {
        exclude: ['applicationId', 'updatedAt'],
      },
    });

    if (!error) {
      return null;
    }

    const errorName = error.name ?? error.error;
    const repeated = await this.errorsRepository.count({
      where: {
        applicationId,
        [Op.and]: sequelizeWhere(this.getErrorNameExpression(), errorName),
      },
    });

    return {
      ...error.get({ plain: true }),
      errorName,
      repeated,
    };
  }

  private getUtcWeekStart(date: Date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));

    return start;
  }

  private getErrorNameExpression() {
    return fn('COALESCE', col('Errors.error'), col('Errors.error'));
  }

  private getGroupedErrorsCursorWhere(
    sort: 'lastOccurred' | 'topRepeated',
    hasCursor: boolean,
  ) {
    if (!hasCursor) {
      return '';
    }

    const tieBreaker = `
      (
        grouped."applicationId" > :cursorApplicationId
        OR (
          grouped."applicationId" = :cursorApplicationId
          AND grouped."errorName" > :cursorErrorName
        )
        OR (
          grouped."applicationId" = :cursorApplicationId
          AND grouped."errorName" = :cursorErrorName
          AND COALESCE(grouped."level", '') > COALESCE(:cursorLevel, '')
        )
      )
    `;

    if (sort === 'topRepeated') {
      return `
        WHERE
          grouped."repeated" < :cursorRepeated
          OR (
            grouped."repeated" = :cursorRepeated
            AND grouped."lastOccurredAt" < :cursorLastOccurredAt
          )
          OR (
            grouped."repeated" = :cursorRepeated
            AND grouped."lastOccurredAt" = :cursorLastOccurredAt
            AND ${tieBreaker}
          )
      `;
    }

    return `
      WHERE
        grouped."lastOccurredAt" < :cursorLastOccurredAt
        OR (
          grouped."lastOccurredAt" = :cursorLastOccurredAt
          AND grouped."repeated" < :cursorRepeated
        )
        OR (
          grouped."lastOccurredAt" = :cursorLastOccurredAt
          AND grouped."repeated" = :cursorRepeated
          AND ${tieBreaker}
        )
    `;
  }

  private async getApplicationIdsForUser(userId: string) {
    const applications = await this.appsRepository
      .scope({ method: ['associatedWithUser', userId] })
      .findAll({
        attributes: ['id'],
      });

    return applications.map((application) => application.id);
  }

  private getAffectedRouteExpression() {
    return `COALESCE(NULLIF(TRIM("Errors"."transaction"), ''), NULLIF(TRIM("Errors"."url"), ''), NULLIF(TRIM("Errors"."request"->>'url'), ''))`;
  }

  private async getApplicationOverviewCounts(applicationId: string) {
    const [membershipsCount, errorsCount, criticalCount] = await Promise.all([
      this.appMembershipRepository.count({
        where: {
          applicationId,
          status: ApplicationMembershipStatus.ACTIVE,
        },
      }),
      this.errorsRepository.count({ where: { applicationId } }),
      this.errorsRepository.count({
        where: {
          applicationId,
          level: { [Op.in]: ['fatal', 'critical'] },
        },
      }),
    ]);

    return { membershipsCount, errorsCount, criticalCount };
  }
}
