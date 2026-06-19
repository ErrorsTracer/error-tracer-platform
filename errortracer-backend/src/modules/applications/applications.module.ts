import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

import { SequelizeModule } from '@nestjs/sequelize';
import { Frameworks } from '../../database/models/frameworks.model';
import { Applications } from '../../database/models/applications.model';
import { Users } from '../../database/models/users.model';
import { ApplicationMembership } from '../../database/models/application-membership.model';
import { Environments } from '../../database/models/environments.model';
import { Errors } from '../../database/models/errors.model';
import { Notifications } from '../../database/models/notifications.model';
import { TransactionManager } from '../../helpers/transaction.helper';
import { ApplicationsRepository } from './applications.repo';
import { AuthModule } from '../auth/auth.module';
import { UsageModule } from '../usage/usage.module';
import { ApplicationMembershipGuard } from './application-membership.guard';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Frameworks,
      Applications,
      Users,
      ApplicationMembership,
      Environments,
      Errors,
      Notifications,
    ]),
    AuthModule,
    UsageModule,
  ],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    TransactionManager,
    ApplicationsRepository,
    ApplicationMembershipGuard,
  ],
})
export class ApplicationsModule {}
