import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn, Op, where as sequelizeWhere } from 'sequelize';
import { ApplicationMembership } from '../../database/models/application-membership.model';
import { Applications } from '../../database/models/applications.model';
import { Errors } from '../../database/models/errors.model';
import { Notifications } from '../../database/models/notifications.model';
import { Users } from '../../database/models/users.model';
import { ApplicationMembershipStatus } from '../../common/constants/app.constants';

type SharedApplicationCount = {
  applicationId: string;
};

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(Users)
    private usersRepository: typeof Users,
    @InjectModel(Notifications)
    private notificationsRepository: typeof Notifications,
    @InjectModel(Applications)
    private applicationsRepository: typeof Applications,
    @InjectModel(ApplicationMembership)
    private applicationMembershipsRepository: typeof ApplicationMembership,
    @InjectModel(Errors)
    private errorsRepository: typeof Errors,
  ) {}

  async getUserById(id: string) {
    return await this.usersRepository.findByPk(id, {
      attributes: { exclude: ['id', 'createdAt', 'updatedAt', 'isSuspended'] },
    });
  }

  async getUserPasswordById(id: string) {
    return await this.usersRepository.unscoped().findByPk(id, {
      attributes: ['id', 'password'],
    });
  }

  async getUserByEmailExceptId(email: string, id: string) {
    return await this.usersRepository.findOne({
      where: { email, id: { [Op.ne]: id } },
    });
  }

  async updateUserInfoById(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
      email?: string;
    },
  ) {
    await this.usersRepository.update(data, { where: { id } });

    return await this.getUserById(id);
  }

  async updatePasswordById(id: string, password: string) {
    const [affectedCount] = await this.usersRepository.update(
      { password },
      { where: { id } },
    );

    return affectedCount > 0;
  }

  async getNotificationsByUserId(userId: string) {
    return await this.notificationsRepository.findAll({
      where: { userId },
      attributes: { exclude: ['userId', 'updatedAt'] },
      order: [['createdAt', 'DESC']],
    });
  }

  async getMembershipInvitationsByUserId(userId: string) {
    return await this.applicationMembershipsRepository.findAll({
      where: {
        userId,
        status: ApplicationMembershipStatus.INVITED,
      },
      include: [
        {
          model: Applications,
          as: 'application',
          attributes: ['id', 'name'],
          include: [
            {
              model: Users,
              as: 'owner',
              attributes: ['firstName', 'lastName', 'email'],
            },
          ],
        },
        {
          model: Users,
          as: 'invitedByUser',
          attributes: ['firstName', 'lastName', 'email'],
        },
      ],
      attributes: {
        exclude: [
          'applicationId',
          'deletedAt',
          'updatedAt',
          'userId',
          'invitedBy',
        ],
      },
      order: [['createdAt', 'DESC']],
    });
  }

  async acceptMembershipInvitationByIdAndUserId(
    id: string | undefined,
    userId: string,
  ) {
    const membership = await this.applicationMembershipsRepository.findOne({
      where: {
        id,
        userId,
        status: ApplicationMembershipStatus.INVITED,
      },
    });

    if (!membership) {
      return null;
    }

    membership.status = ApplicationMembershipStatus.ACTIVE;
    membership.joinedAt = new Date();
    await membership.save();

    return await this.applicationMembershipsRepository.findByPk(membership.id, {
      include: [
        {
          model: Applications,
          as: 'application',
          attributes: ['id', 'name', 'about', 'ownerId'],
        },
      ],
      attributes: {
        exclude: ['applicationId', 'deletedAt', 'updatedAt', 'userId'],
      },
    });
  }

  async getDashboardStatsByUserId(userId: string) {
    const applications = await this.applicationsRepository
      .scope({ method: ['associatedWithUser', userId] })
      .findAll({ attributes: ['id'] });
    const applicationIds = applications.map((application) => application.id);

    if (applicationIds.length === 0) {
      return {
        totalApps: 0,
        sharedApps: 0,
        errorsThisWeek: 0,
        errorChangePercent: 0,
        criticalErrors: 0,
      };
    }

    const thisWeekStart = this.getUtcWeekStart(new Date());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);
    const nextWeekStart = new Date(thisWeekStart);
    nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7);

    const [sharedApps, errorsThisWeek, errorsLastWeek, criticalErrors] =
      await Promise.all([
        this.applicationMembershipsRepository.findAll({
          attributes: ['applicationId'],
          where: {
            applicationId: { [Op.in]: applicationIds },
            status: ApplicationMembershipStatus.ACTIVE,
          },
          group: ['applicationId'],
          having: sequelizeWhere(fn('COUNT', col('id')), { [Op.gt]: 1 }),
          raw: true,
        }) as unknown as Promise<SharedApplicationCount[]>,
        this.errorsRepository.count({
          where: {
            applicationId: { [Op.in]: applicationIds },
            createdAt: { [Op.gte]: thisWeekStart, [Op.lt]: nextWeekStart },
          },
        }),
        this.errorsRepository.count({
          where: {
            applicationId: { [Op.in]: applicationIds },
            createdAt: { [Op.gte]: lastWeekStart, [Op.lt]: thisWeekStart },
          },
        }),
        this.errorsRepository.count({
          where: {
            applicationId: { [Op.in]: applicationIds },
            level: { [Op.in]: ['fatal', 'critical'] },
          },
        }),
      ]);

    return {
      totalApps: applicationIds.length,
      sharedApps: sharedApps.length,
      errorsThisWeek,
      errorChangePercent: this.getErrorChangePercent(
        errorsThisWeek,
        errorsLastWeek,
      ),
      criticalErrors,
    };
  }

  async markNotificationAsReadByIdAndUserId(
    id: string | undefined,
    userId: string,
  ) {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      return null;
    }

    notification.isRead = true;
    await notification.save();

    return notification;
  }

  private getUtcWeekStart(date: Date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));

    return start;
  }

  private getErrorChangePercent(current: number, previous: number) {
    if (previous === 0) {
      return current === 0 ? 0 : 100;
    }

    return Math.round(((current - previous) / previous) * 100);
  }
}
