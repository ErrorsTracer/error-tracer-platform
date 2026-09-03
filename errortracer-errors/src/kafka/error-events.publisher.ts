import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Kafka, Partitioners, Producer } from 'kafkajs';
import { ERROR_EVENTS_TOPIC, ErrorEventMessage } from './error-event.message';
import { KafkaTopicProvisioner } from './kafka-topic.provisioner';

@Injectable()
export class ErrorEventsPublisher implements OnModuleInit, OnApplicationShutdown {
  private readonly producer: Producer;

  constructor(private readonly topics: KafkaTopicProvisioner) {
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',').map((broker) => broker.trim());
    this.producer = new Kafka({ clientId: 'errortracer-ingestion', brokers }).producer({
      allowAutoTopicCreation: false,
      createPartitioner: Partitioners.DefaultPartitioner,
    });
  }

  async onModuleInit() {
    await this.topics.ready();
    await this.producer.connect();
  }

  async publish(event: ErrorEventMessage) {
    await this.producer.send({
      topic: ERROR_EVENTS_TOPIC,
      acks: -1,
      messages: [{ key: event.applicationId, value: JSON.stringify(event) }],
    });
  }

  async onApplicationShutdown() {
    await this.producer.disconnect();
  }
}
