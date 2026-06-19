import { Module } from '@nestjs/common';
import { ErrorsController } from './errors.controller';
import { ErrorsService } from './errors.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Errors } from '../../database/models/errors.model';
import { Environments } from '../../database/models/environments.model';
import { Applications } from '../../database/models/applications.model';
import { TransactionManager } from '../../helpers/transaction.helper';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Errors, Environments, Applications]),
    UsageModule,
  ],
  controllers: [ErrorsController],
  providers: [ErrorsService, TransactionManager],
})
export class ErrorsModule {}
