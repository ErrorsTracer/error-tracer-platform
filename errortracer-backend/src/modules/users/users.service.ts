import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UsersRepository } from './users.repo';
import { ERROR_KEYS } from '../../common/localization/error-keys';
import { UsageRepository } from '../usage/usage.repo';
import { comparePassword, hashPassword } from '../../utils/bcrypt';
import { UpdatePasswordDto, UpdateUserInfoDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(
    private usersRepository: UsersRepository,
    private usageRepository: UsageRepository,
  ) {}

  async getUserInfo(user: { id?: string; sub?: string }) {
    const userId = user.id ?? user.sub;

    if (!userId) {
      throw new UnauthorizedException(ERROR_KEYS.INVALID_TOKEN_PAYLOAD);
    }

    const currentUser = await this.usersRepository.getUserById(userId);

    if (!currentUser) {
      throw new NotFoundException(ERROR_KEYS.USER_NOT_FOUND);
    }

    return currentUser;
  }

  async updateUserInfo(
    data: UpdateUserInfoDto,
    user: { id?: string; sub?: string },
  ) {
    const userId = this.getUserId(user);
    const updates = {
      firstName: data.firstName,
      lastName: data.lastName,
      avatar: data.avatar,
      email: data.email?.toLowerCase().trim(),
    };

    if (updates.email) {
      const existingUser = await this.usersRepository.getUserByEmailExceptId(
        updates.email,
        userId,
      );

      if (existingUser) {
        throw new UnprocessableEntityException(ERROR_KEYS.EMAIL_ALREADY_EXISTS);
      }
    }

    const updatedUser = await this.usersRepository.updateUserInfoById(
      userId,
      updates,
    );

    if (!updatedUser) {
      throw new NotFoundException(ERROR_KEYS.USER_NOT_FOUND);
    }

    return updatedUser;
  }

  async updatePassword(
    data: UpdatePasswordDto,
    user: { id?: string; sub?: string },
  ) {
    const userId = this.getUserId(user);

    if (data.newPassword !== data.confirmNewPassword) {
      throw new BadRequestException(ERROR_KEYS.PASSWORD_CONFIRMATION_MISMATCH);
    }

    const currentUser = await this.usersRepository.getUserPasswordById(userId);

    if (!currentUser) {
      throw new NotFoundException(ERROR_KEYS.USER_NOT_FOUND);
    }

    if (
      !currentUser.password ||
      !(await comparePassword(data.currentPassword, currentUser.password))
    ) {
      throw new UnauthorizedException(ERROR_KEYS.CURRENT_PASSWORD_INCORRECT);
    }

    await this.usersRepository.updatePasswordById(
      userId,
      await hashPassword(data.newPassword),
    );

    return { message: 'Password updated successfully' };
  }

  async getUserNotifications(user: { id?: string; sub?: string }) {
    const userId = user.id ?? user.sub;

    if (!userId) {
      throw new UnauthorizedException(ERROR_KEYS.INVALID_TOKEN_PAYLOAD);
    }

    return await this.usersRepository.getNotificationsByUserId(userId);
  }

  async getUserUsage(user: { id?: string; sub?: string }) {
    const userId = user.id ?? user.sub;

    if (!userId) {
      throw new UnauthorizedException(ERROR_KEYS.INVALID_TOKEN_PAYLOAD);
    }

    return await this.usageRepository.getTotalByUser(userId);
  }

  async getMembershipInvitations(user: { id?: string; sub?: string }) {
    const userId = this.getUserId(user);

    return await this.usersRepository.getMembershipInvitationsByUserId(userId);
  }

  async acceptMembershipInvitation(
    params: { id?: string },
    user: { id?: string; sub?: string },
  ) {
    const userId = this.getUserId(user);

    const membership =
      await this.usersRepository.acceptMembershipInvitationByIdAndUserId(
        params.id,
        userId,
      );

    if (!membership) {
      throw new NotFoundException(ERROR_KEYS.MEMBERSHIP_INVITATION_NOT_FOUND);
    }

    return {
      message: 'Membership invitation accepted successfully',
      membership,
    };
  }

  async getDashboardStats(user: { id?: string; sub?: string }) {
    const userId = user.id ?? user.sub;

    if (!userId) {
      throw new UnauthorizedException(ERROR_KEYS.INVALID_TOKEN_PAYLOAD);
    }

    return await this.usersRepository.getDashboardStatsByUserId(userId);
  }

  async markNotificationAsRead(
    params: { id?: string },
    user: { id?: string; sub?: string },
  ) {
    const userId = user.id ?? user.sub;

    if (!userId) {
      throw new UnauthorizedException(ERROR_KEYS.INVALID_TOKEN_PAYLOAD);
    }

    const notification =
      await this.usersRepository.markNotificationAsReadByIdAndUserId(
        params.id,
        userId,
      );

    if (!notification) {
      throw new NotFoundException(ERROR_KEYS.NOTIFICATION_NOT_FOUND);
    }

    return { message: 'Notification marked as read successfully' };
  }

  private getUserId(user: { id?: string; sub?: string }) {
    const userId = user.id ?? user.sub;

    if (!userId) {
      throw new UnauthorizedException(ERROR_KEYS.INVALID_TOKEN_PAYLOAD);
    }

    return userId;
  }
}
