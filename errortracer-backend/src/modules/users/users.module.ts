import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Notifications } from '../../database/models/notifications.model';
import { Users } from '../../database/models/users.model';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repo';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { UsageModule } from '../usage/usage.module';
import { Applications } from '../../database/models/applications.model';
import { ApplicationMembership } from '../../database/models/application-membership.model';
import { Errors } from '../../database/models/errors.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      Users,
      Notifications,
      Applications,
      ApplicationMembership,
      Errors,
    ]),
    AuthModule,
    UsageModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
