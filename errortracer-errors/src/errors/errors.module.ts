import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Application } from '../database/models/application.model';
import { Environment } from '../database/models/environment.model';
import { KafkaModule } from '../kafka/kafka.module';
import { ErrorsController } from './errors.controller';
import { ErrorsService } from './errors.service';

@Module({
  imports: [SequelizeModule.forFeature([Application, Environment]), KafkaModule],
  controllers: [ErrorsController],
  providers: [ErrorsService],
})
export class ErrorsModule {}
