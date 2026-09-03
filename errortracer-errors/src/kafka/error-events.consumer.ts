import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Consumer, Kafka } from 'kafkajs';
import { Op } from 'sequelize';
import { ErrorEvent } from '../database/models/error-event.model';
import { TransactionService } from '../database/transaction.service';
import { UsageRepository } from '../usage/usage.repository';
import { ERROR_EVENTS_TOPIC, ErrorEventMessage } from './error-event.message';
import { KafkaTopicProvisioner } from './kafka-topic.provisioner';

@Injectable()
export class ErrorEventsConsumer implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(ErrorEventsConsumer.name);
  private readonly consumer: Consumer;

  constructor(
    @InjectModel(ErrorEvent) private readonly errors: typeof ErrorEvent,
    private readonly usage: UsageRepository,
    private readonly transactions: TransactionService,
    private readonly topics: KafkaTopicProvisioner,
  ) {
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',').map((broker) => broker.trim());
    this.consumer = new Kafka({ clientId: 'errortracer-error-writer', brokers }).consumer({
      groupId: process.env.KAFKA_CONSUMER_GROUP ?? 'errortracer-error-writers-v1',
      minBytes: Number(process.env.KAFKA_BATCH_MIN_BYTES ?? 32768),
      maxBytesPerPartition: Number(process.env.KAFKA_BATCH_MAX_BYTES ?? 1048576),
      maxWaitTimeInMs: Number(process.env.KAFKA_BATCH_MAX_WAIT_MS ?? 1000),
      allowAutoTopicCreation: false,
    });
  }

  async onModuleInit() {
    await this.topics.ready();
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: ERROR_EVENTS_TOPIC, fromBeginning: true });
    await this.consumer.run({
      autoCommit: false,
      eachBatchAutoResolve: false,
      eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary, isRunning, isStale }) => {
        if (!isRunning() || isStale()) return;

        const events = batch.messages.map((message) => {
          if (!message.value) throw new Error(`Kafka record ${message.offset} has no value`);
          return JSON.parse(message.value.toString()) as ErrorEventMessage;
        });

        await this.persist(events);
        for (const message of batch.messages) resolveOffset(message.offset);
        await commitOffsetsIfNecessary();
        await heartbeat();
        this.logger.debug(`Persisted ${events.length} error events in one database transaction`);
      },
    });
  }

  private async persist(events: ErrorEventMessage[]) {
    await this.transactions.run(async (transaction) => {
      const uniqueEvents = [...new Map(events.map((event) => [event.id, event])).values()];
      const existing = await this.errors.findAll({
        attributes: ['id'],
        where: { id: { [Op.in]: uniqueEvents.map((event) => event.id) } },
        transaction,
      });
      const existingIds = new Set(existing.map((event) => event.id));
      const newEvents = uniqueEvents.filter((event) => !existingIds.has(event.id));
      if (newEvents.length === 0) return;

      await this.errors.bulkCreate(newEvents.map(({ ownerId: _ownerId, payloadSize: _payloadSize, timestamp, ...event }) => ({
        ...event,
        timestamp: new Date(timestamp),
      })) as any[], { transaction, validate: true });

      await this.usage.incrementMany(newEvents.map((event) => ({
        applicationId: event.applicationId,
        userId: event.ownerId,
        errorBytes: event.payloadSize,
      })), transaction);
    });
  }

  async onApplicationShutdown() {
    await this.consumer.disconnect();
  }
}
