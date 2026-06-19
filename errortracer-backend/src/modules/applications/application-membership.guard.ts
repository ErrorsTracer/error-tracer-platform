import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ApplicationMembershipRole } from '../../common/constants/app.constants';
import { ERROR_KEYS } from '../../common/localization/error-keys';
import { AuthenticatedRequest } from '../auth/auth.types';
import { ApplicationsRepository } from './applications.repo';
import {
  APPLICATION_MEMBERSHIP_REQUIREMENT_KEY,
  ApplicationMembershipRequirement,
} from './application-membership.decorator';

@Injectable()
export class ApplicationMembershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private applicationsRepository: ApplicationsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<
      ApplicationMembershipRequirement | undefined
    >(APPLICATION_MEMBERSHIP_REQUIREMENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const applicationId = request.params.id;
    const userId = request.user?.id;

    if (!applicationId || !userId) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    const userMembership =
      await this.applicationsRepository.getActiveMembershipForApp({
        applicationId,
        userId,
      });

    if (!userMembership) {
      throw new NotFoundException(ERROR_KEYS.APP_NOT_FOUND);
    }

    if (userMembership.role !== requirement.role) {
      throw new ForbiddenException(
        requirement.forbiddenErrorKey ??
          this.getForbiddenError(requirement.role),
      );
    }

    return true;
  }

  private getForbiddenError(role: ApplicationMembershipRole) {
    if (role === ApplicationMembershipRole.OWNER) {
      return ERROR_KEYS.APP_STATUS_FORBIDDEN;
    }

    return ERROR_KEYS.APP_NOT_FOUND;
  }
}
