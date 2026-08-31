import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Application } from '../database/models/application.model';
import { Environment } from '../database/models/environment.model';
import { ErrorEvent } from '../database/models/error-event.model';
import { TransactionService } from '../database/transaction.service';
import { UsageRepository } from '../usage/usage.repository';
import { ErrorsController } from './errors.controller';
import { ErrorsService } from './errors.service';

@Module({
  imports: [SequelizeModule.forFeature([Application, Environment, ErrorEvent])],
  controllers: [ErrorsController],
  providers: [ErrorsService, UsageRepository, TransactionService],
})
export class ErrorsModule {}
