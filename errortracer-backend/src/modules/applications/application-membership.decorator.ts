import { SetMetadata } from '@nestjs/common';
import { ApplicationMembershipRole } from '../../common/constants/app.constants';
import { ErrorKey } from '../../common/localization/error-keys';

export const APPLICATION_MEMBERSHIP_REQUIREMENT_KEY =
  'applicationMembershipRequirement';

export type ApplicationMembershipRequirement = {
  role: ApplicationMembershipRole;
  forbiddenErrorKey?: ErrorKey;
};

export const ApplicationMembershipRequired = (
  role: ApplicationMembershipRole,
  forbiddenErrorKey?: ErrorKey,
) =>
  SetMetadata(APPLICATION_MEMBERSHIP_REQUIREMENT_KEY, {
    role,
    forbiddenErrorKey,
  } satisfies ApplicationMembershipRequirement);
