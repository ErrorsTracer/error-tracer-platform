export const ERROR_EVENTS_TOPIC = process.env.KAFKA_ERROR_TOPIC ?? 'errortracer.error-events.v1';

export interface ErrorEventMessage {
  id: string;
  applicationId: string;
  ownerId: string;
  payloadSize: number;
  error: string;
  stack: string | null;
  environment: string;
  framework: string | null;
  language: string | null;
  runtime: string | null;
  level: string;
  name: string | null;
  fingerprint: string;
  handled: boolean | null;
  timestamp: string;
  release: string | null;
  url: string | null;
  transaction: string | null;
  user: Record<string, unknown> | null;
  request: Record<string, unknown> | null;
  tags: Record<string, unknown> | null;
  extra: Record<string, unknown> | null;
  breadcrumbs: Record<string, unknown>[] | null;
  contexts: Record<string, unknown> | null;
  href: string | null;
  client: string | null;
  additionalData: string | null;
}
