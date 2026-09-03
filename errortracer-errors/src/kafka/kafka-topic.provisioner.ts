import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Admin, Kafka } from 'kafkajs';
import { ERROR_EVENTS_TOPIC } from './error-event.message';

@Injectable()
export class KafkaTopicProvisioner implements OnApplicationShutdown {
  private readonly admin: Admin;
  private readyPromise?: Promise<void>;
  private connected = false;

  constructor() {
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',').map((broker) => broker.trim());
    this.admin = new Kafka({ clientId: 'errortracer-topic-provisioner', brokers }).admin();
  }

  ready(): Promise<void> {
    this.readyPromise ??= this.initialize();
    return this.readyPromise;
  }

  private async initialize() {
    await this.admin.connect();
    this.connected = true;
    const topics = await this.admin.listTopics();
    if (!topics.includes(ERROR_EVENTS_TOPIC)) {
      await this.admin.createTopics({
        waitForLeaders: true,
        topics: [{
          topic: ERROR_EVENTS_TOPIC,
          numPartitions: Number(process.env.KAFKA_NUM_PARTITIONS ?? 3),
          replicationFactor: Number(process.env.KAFKA_REPLICATION_FACTOR ?? 1),
        }],
      });
    }

    // Refresh metadata after creation (or when the topic already exists) before
    // producers and consumers issue their first request.
    await this.admin.fetchTopicMetadata({ topics: [ERROR_EVENTS_TOPIC] });
  }

  async onApplicationShutdown() {
    if (this.connected) await this.admin.disconnect();
  }
}
