import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ApplicationsRepository } from './applications.repo';
import { ERROR_KEYS } from '../../common/localization/error-keys';
import {
  ApplicationMembershipRole,
  ApplicationMembershipStatus,
  ApplicationStatus,
  NotificationType,
} from '../../common/constants/app.constants';
import { TransactionManager } from '../../helpers/transaction.helper';
import {
  GetApplicationErrorsDto,
  GetApplicationTopAffectedRoutesDto,
  GetUserApplicationErrorsDto,
} from './applications.dto';
import { UsageRepository } from '../usage/usage.repo';

const DEFAULT_ERRORS_PAGE_LIMIT = 25;
const MAX_ERRORS_PAGE_LIMIT = 100;
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type ErrorPaginationCursor = {
  createdAt: string;
  id: string;
};

type GroupedErrorPaginationCursor = {
  sort: 'lastOccurred' | 'topRepeated';
  lastOccurredAt: string;
  repeated: number;
  applicationId: string;
  errorName: string;
  level: string | null;
};

@Injectable()
export class ApplicationsService {
  constructor(
    private applicationsRepository: ApplicationsRepository,
    private transactionManager: TransactionManager,
    private usageRepository: UsageRepository,
  ) {}

  async getMyApps(user) {
    return await this.applicationsRepository.getUserApps(user.id);
  }

  async getAppMemberships(params, user) {
    const application = await this.applicationsRepository.getAppByIdForUser({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    return await this.applicationsRepository.getApplicationMemberships(
      params.id,
    );
  }

  async getApplicationErrors(params, query: GetApplicationErrorsDto, user) {
    const application = await this.applicationsRepository.getAppByIdForUser({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    const limit = this.getErrorsPageLimit(query.limit);
    const cursor = this.decodeErrorsCursor(query.cursor);
    const errors = await this.applicationsRepository.getErrorsByApplicationId({
      applicationId: params.id,
      limit: limit + 1,
      cursor,
    });
    const hasMore = errors.length > limit;
    const items = hasMore ? errors.slice(0, limit) : errors;
    const nextCursor = hasMore
      ? this.encodeErrorsCursor(items[items.length - 1])
      : null;

    return {
      data: items,
      pageInfo: {
        limit,
        hasMore,
        nextCursor,
      },
    };
  }

  async getRecentApplicationErrors(
    params,
    query: Pick<GetApplicationErrorsDto, 'limit'>,
    user,
  ) {
    const application = await this.applicationsRepository.getAppByIdForUser({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    const limit = this.getErrorsPageLimit(query.limit);
    const errors =
      await this.applicationsRepository.getRecentErrorsByApplicationId({
        applicationId: params.id,
        limit: limit + 1,
      });
    const hasMore = errors.length > limit;
    const data = hasMore ? errors.slice(0, limit) : errors;

    return {
      data,
      pageInfo: {
        limit,
        hasMore,
      },
    };
  }

  async getMyApplicationsErrors(query: GetUserApplicationErrorsDto, user) {
    const limit = this.getErrorsPageLimit(query.limit);
    const level = query.level ?? 'critical';
    const sort = query.sort ?? 'lastOccurred';
    const cursor = this.decodeGroupedErrorsCursor(query.cursor, sort);

    if (query.applicationId) {
      const application = await this.applicationsRepository.getAppByIdForUser({
        applicationId: query.applicationId,
        userId: user.id,
      });

      if (!application) {
        throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
      }
    }

    const errors =
      await this.applicationsRepository.getGroupedErrorsByUserApplications({
        userId: user.id,
        applicationId: query.applicationId,
        level,
        sort,
        limit: limit + 1,
        cursor,
      });
    const hasMore = errors.length > limit;
    const data = hasMore ? errors.slice(0, limit) : errors;
    const nextCursor =
      hasMore && data.length > 0
        ? this.encodeGroupedErrorsCursor(data[data.length - 1], sort)
        : null;

    return {
      data,
      pageInfo: {
        limit,
        hasMore,
        nextCursor,
      },
    };
  }

  async getMyApplicationsRecentErrors(
    query: Pick<GetApplicationErrorsDto, 'limit'>,
    user,
  ) {
    const limit = this.getErrorsPageLimit(query.limit);
    const errors =
      await this.applicationsRepository.getRecentErrorsByUserApplications({
        userId: user.id,
        limit: limit + 1,
      });
    const hasMore = errors.length > limit;
    const data = hasMore ? errors.slice(0, limit) : errors;

    return {
      data,
      pageInfo: {
        limit,
        hasMore,
      },
    };
  }

  async getApplicationErrorDetails(params, user) {
    const application = await this.applicationsRepository.getAppByIdForUser({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    const error =
      await this.applicationsRepository.getErrorDetailsByApplicationId({
        applicationId: params.id,
        errorId: params.errorId,
      });

    if (!error) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    return error;
  }

  async getApplicationErrorsReport(params, user) {
    const application = await this.applicationsRepository.getAppByIdForUser({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    const weeklyCounts =
      await this.applicationsRepository.getWeeklyErrorReportByApplicationId(
        params.id,
      );

    return {
      thisWeek: this.formatWeeklyErrorCounts(weeklyCounts, 'thisWeek'),
      lastWeek: this.formatWeeklyErrorCounts(weeklyCounts, 'lastWeek'),
    };
  }

  async getApplicationTopAffectedRoutes(
    params,
    query: GetApplicationTopAffectedRoutesDto,
    user,
  ) {
    const application = await this.applicationsRepository.getAppByIdForUser({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    const limit = this.getErrorsPageLimit(query.limit);
    const data =
      await this.applicationsRepository.getTopAffectedRoutesByApplicationId({
        applicationId: params.id,
        limit,
      });

    return {
      data,
      pageInfo: {
        limit,
      },
    };
  }

  async getMyApplicationsErrorsReport(user) {
    const weeklyCounts =
      await this.applicationsRepository.getWeeklyErrorReportByOwnerId(user.id);

    return {
      thisWeek: this.formatWeeklyErrorCounts(weeklyCounts, 'thisWeek'),
      lastWeek: this.formatWeeklyErrorCounts(weeklyCounts, 'lastWeek'),
    };
  }

  async getApplicationUsage(params, user) {
    const application = await this.applicationsRepository.getAppByIdForUser({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    return await this.usageRepository.getByApplication(params.id);
  }

  async getFrameworks() {
    return await this.applicationsRepository.getFrameworks();
  }

  async getErrorsSeverityDistribution(user) {
    return await this.applicationsRepository.getErrorsSeverityDistributionByUserId(
      user.id,
    );
  }

  async updateProductionMode(params, user) {
    const application = await this.applicationsRepository.getAllAppInfo({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    const environment = await this.applicationsRepository.updateProductionMode({
      applicationId: params.id,
      isEnabled: !application.environment.isEnabled,
    });

    if (!environment) {
      throw new NotFoundException(ERROR_KEYS.CREDENTIAL_NOT_FOUND);
    }

    return { message: 'Production mode updated successfully' };
  }

  async getAppCredentials(params, user) {
    const application = await this.applicationsRepository.getAllAppInfo({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    if (!application.environment) {
      throw new NotFoundException(ERROR_KEYS.CREDENTIAL_NOT_FOUND);
    }

    return {
      id: application.environment.id,
      appKey: application.environment.appKey,
      isEnabled: application.environment.isEnabled,
      applicationId: application.environment.applicationId,
    };
  }

  async rotateAppKey(params, user) {
    const application = await this.applicationsRepository.getAllAppInfo({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    const ownerMembership =
      await this.applicationsRepository.getOwnerMembershipForApp({
        applicationId: params.id,
        userId: user.id,
      });

    if (!ownerMembership) {
      throw new ForbiddenException(ERROR_KEYS.APP_STATUS_FORBIDDEN);
    }

    const environment = await this.applicationsRepository.rotateAppKey(
      params.id,
    );

    if (!environment) {
      throw new NotFoundException(ERROR_KEYS.CREDENTIAL_NOT_FOUND);
    }

    return {
      appKey: environment.appKey,
      isEnabled: environment.isEnabled,
      applicationId: environment.applicationId,
    };
  }

  async createApp(data, user) {
    const duplicatedApp = await this.applicationsRepository.getAppByNameForUser(
      {
        name: data.name,
        userId: user.id,
      },
    );

    if (duplicatedApp) {
      throw new BadRequestException(ERROR_KEYS.APP_ALREADY_EXISTS);
    }

    const trans = await this.transactionManager.runInTransaction(
      async (transaction) => {
        const application = await this.applicationsRepository.createApplication(
          {
            name: data.name,
            about: data.about,
            frameworkId: data.framework,
            ownerId: user.id,
          },
          transaction,
        );

        const membership =
          await this.applicationsRepository.createApplicationMembership(
            {
              applicationId: application.dataValues.id,
              userId: user.id,
              role: ApplicationMembershipRole.OWNER,
              status: ApplicationMembershipStatus.ACTIVE,
              joinedAt: new Date(),
            },
            transaction,
          );

        const environment = await this.applicationsRepository.createEnvironment(
          {
            applicationId: application.dataValues.id,
            envName: data.envName,
            isEnabled: false,
          },
          transaction,
        );

        return { ...application.toJSON(), membership, environment };
      },
    );

    return await this.applicationsRepository.getAppByIdForUser({
      applicationId: trans.id,
      userId: user.id,
    });
  }

  async invitePeople(data: { emails: string[] }, params, user) {
    const application = await this.applicationsRepository.getAllAppInfo({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    const ownerMembership =
      await this.applicationsRepository.getOwnerMembershipForApp({
        applicationId: params.id,
        userId: user.id,
      });

    if (!ownerMembership) {
      throw new ForbiddenException(ERROR_KEYS.APP_INVITE_FORBIDDEN);
    }

    const emails = [
      ...new Set(
        data.emails.map((email: string) => email.toLowerCase().trim()),
      ),
    ];

    const result = await this.transactionManager.runInTransaction(
      async (transaction) => {
        for (const email of emails) {
          let invitedUser =
            await this.applicationsRepository.getUserByEmail(email);

          if (!invitedUser) {
            invitedUser = await this.applicationsRepository.createUserByEmail(
              email,
              transaction,
            );
          }

          await this.applicationsRepository.getMembershipByAppAndUser(
            params.id,
            invitedUser.dataValues.id,
          );

          await this.applicationsRepository.createApplicationMembership(
            {
              applicationId: params.id,
              userId: invitedUser.dataValues.id,
              role: ApplicationMembershipRole.MEMBER,
              status: ApplicationMembershipStatus.INVITED,
              joinedAt: null,
              invitedBy: user.id,
            },
            transaction,
          );

          await this.applicationsRepository.createNotification(
            {
              applicationId: params.id,
              userId: invitedUser.dataValues.id,
              type: NotificationType.APPLICATION_INVITE,
              message: `You have been invited to ${application.dataValues.name}.`,
            },
            transaction,
          );
        }

        return { message: 'Invitation process completed' };
      },
    );

    return result;
  }

  async deleteApp(params, user) {
    const application = await this.applicationsRepository.getAppByIdForUser({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    const ownerMembership =
      await this.applicationsRepository.getOwnerMembershipForApp({
        applicationId: params.id,
        userId: user.id,
      });

    if (!ownerMembership) {
      throw new ForbiddenException(ERROR_KEYS.APP_DELETE_FORBIDDEN);
    }

    await this.transactionManager.runInTransaction(async (transaction) => {
      await this.applicationsRepository.deleteCredentialsByApplicationId(
        params.id,
        transaction,
      );
      await this.applicationsRepository.deleteMembershipsByApplicationId(
        params.id,
        transaction,
      );
      await this.applicationsRepository.deleteErrorsByApplicationId(
        params.id,
        transaction,
      );
      await this.applicationsRepository.deleteApplication(
        params.id,
        transaction,
      );
    });

    return { message: 'Application deleted successfully' };
  }

  async activateApp(params, user) {
    await this.updateAppStatus(params, user, ApplicationStatus.ACTIVE);
    return { message: 'Application activated successfully' };
  }

  async suspendApp(params, user) {
    await this.updateAppStatus(params, user, ApplicationStatus.SUSPENDED);

    return { message: 'Application suspended successfully' };
  }

  async getAppInfo(params, user) {
    const application = await this.applicationsRepository.getAppByIdForUser({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    const membership =
      await this.applicationsRepository.getActiveMembershipForApp({
        applicationId: params.id,
        userId: user.id,
      });

    return {
      ...application.toJSON(),
      membership: membership
        ? {
            id: membership.id,
            role: membership.role,
            status: membership.status,
            joinedAt: membership.joinedAt,
          }
        : null,
    };
  }

  private async updateAppStatus(params, user, status: ApplicationStatus) {
    const application = await this.applicationsRepository.getAllAppInfo({
      applicationId: params.id,
      userId: user.id,
    });

    if (!application) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    const ownerMembership =
      await this.applicationsRepository.getOwnerMembershipForApp({
        applicationId: params.id,
        userId: user.id,
      });

    if (!ownerMembership) {
      throw new ForbiddenException(ERROR_KEYS.APP_STATUS_FORBIDDEN);
    }

    const updatedApplication =
      await this.applicationsRepository.updateApplicationStatus({
        applicationId: params.id,
        status,
      });

    if (!updatedApplication) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    return updatedApplication;
  }

  private getErrorsPageLimit(limit?: string) {
    if (!limit) {
      return DEFAULT_ERRORS_PAGE_LIMIT;
    }

    const parsedLimit = Number(limit);

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > MAX_ERRORS_PAGE_LIMIT
    ) {
      throw new BadRequestException(ERROR_KEYS.VALIDATION_FAILED);
    }

    return parsedLimit;
  }

  private decodeErrorsCursor(cursor?: string) {
    if (!cursor) {
      return undefined;
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as ErrorPaginationCursor;
      const createdAt = new Date(decoded.createdAt);

      if (
        !decoded.id ||
        Number.isNaN(createdAt.getTime()) ||
        createdAt.toISOString() !== decoded.createdAt
      ) {
        throw new Error('Invalid errors cursor');
      }

      return {
        createdAt,
        id: decoded.id,
      };
    } catch {
      throw new BadRequestException(ERROR_KEYS.VALIDATION_FAILED);
    }
  }

  private encodeErrorsCursor(error: { createdAt?: Date; id: string }) {
    if (!error.createdAt) {
      throw new BadRequestException(ERROR_KEYS.VALIDATION_FAILED);
    }

    return Buffer.from(
      JSON.stringify({
        createdAt: error.createdAt.toISOString(),
        id: error.id,
      }),
    ).toString('base64url');
  }

  private decodeGroupedErrorsCursor(
    cursor: string | undefined,
    sort: 'lastOccurred' | 'topRepeated',
  ) {
    if (!cursor) {
      return undefined;
    }

    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as GroupedErrorPaginationCursor;
      const lastOccurredAt = new Date(decoded.lastOccurredAt);

      if (
        decoded.sort !== sort ||
        !Number.isInteger(decoded.repeated) ||
        decoded.repeated < 0 ||
        !decoded.applicationId ||
        !decoded.errorName ||
        Number.isNaN(lastOccurredAt.getTime()) ||
        lastOccurredAt.toISOString() !== decoded.lastOccurredAt
      ) {
        throw new Error('Invalid grouped errors cursor');
      }

      return {
        lastOccurredAt,
        repeated: decoded.repeated,
        applicationId: decoded.applicationId,
        errorName: decoded.errorName,
        level: decoded.level,
      };
    } catch {
      throw new BadRequestException(ERROR_KEYS.VALIDATION_FAILED);
    }
  }

  private encodeGroupedErrorsCursor(
    error: {
      lastOccurredAt: Date | string;
      repeated: number;
      applicationId: string;
      errorName: string;
      level: string | null;
    },
    sort: 'lastOccurred' | 'topRepeated',
  ) {
    const lastOccurredAt = new Date(error.lastOccurredAt);

    if (Number.isNaN(lastOccurredAt.getTime())) {
      throw new BadRequestException(ERROR_KEYS.VALIDATION_FAILED);
    }

    return Buffer.from(
      JSON.stringify({
        sort,
        lastOccurredAt: lastOccurredAt.toISOString(),
        repeated: error.repeated,
        applicationId: error.applicationId,
        errorName: error.errorName,
        level: error.level,
      }),
    ).toString('base64url');
  }

  private formatWeeklyErrorCounts(
    counts: { week: string; dayOfWeek: number; errors: number }[],
    week: 'thisWeek' | 'lastWeek',
  ) {
    return WEEK_DAYS.map((day, index) => ({
      day,
      errors:
        counts.find(
          (count) => count.week === week && count.dayOfWeek === index + 1,
        )?.errors ?? 0,
    }));
  }
}
