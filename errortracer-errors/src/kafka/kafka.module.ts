import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ErrorEvent } from '../database/models/error-event.model';
import { TransactionService } from '../database/transaction.service';
import { UsageRepository } from '../usage/usage.repository';
import { ErrorEventsConsumer } from './error-events.consumer';
import { ErrorEventsPublisher } from './error-events.publisher';
import { KafkaTopicProvisioner } from './kafka-topic.provisioner';

@Module({
  imports: [SequelizeModule.forFeature([ErrorEvent])],
  providers: [KafkaTopicProvisioner, ErrorEventsPublisher, ErrorEventsConsumer, UsageRepository, TransactionService],
  exports: [ErrorEventsPublisher],
})
export class KafkaModule {}
