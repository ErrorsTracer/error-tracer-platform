import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { randomUUID } from 'crypto';
import { Application } from '../database/models/application.model';
import { Environment } from '../database/models/environment.model';
import { ERROR_KEYS } from '../common/error-keys';
import { ErrorEventsPublisher } from '../kafka/error-events.publisher';
import { IngestErrorDto } from './errors.dto';
import { generateErrorFingerprint, sanitizeValue } from './errors.utils';

@Injectable()
export class ErrorsService {
  constructor(
    @InjectModel(Environment) private readonly environments: typeof Environment,
    private readonly publisher: ErrorEventsPublisher,
  ) {}

  async ingest(data: IngestErrorDto, ingestionKey?: string, rawBody?: Buffer) {
    if (!ingestionKey) throw new UnauthorizedException(ERROR_KEYS.AUTH_REQUIRED);
    const credential = await this.environments.findOne({ where: { appKey: ingestionKey }, include: [Application] });
    if (!credential) throw new UnauthorizedException(ERROR_KEYS.APP_KEY_INVALID);
    const applicationId = credential.applicationId;
    if (data.projectId && data.projectId !== applicationId) throw new ForbiddenException(ERROR_KEYS.APP_ORGANIZATION_MISMATCH);
    if (!credential.isEnabled) throw new BadRequestException(ERROR_KEYS.APP_PRODUCTION_DISABLED);
    const message = data.message ?? data.error;
    if (!message) throw new BadRequestException(ERROR_KEYS.VALIDATION_FAILED);
    const environment = data.environment ?? 'production';
    const fingerprint = data.fingerprint ?? generateErrorFingerprint({ ...data, message }, applicationId, environment);
    const payloadSize = rawBody?.length ?? Buffer.byteLength(JSON.stringify(data), 'utf8');

    const id = randomUUID();
    await this.publisher.publish({
      id,
      applicationId, error: message, stack: data.stack ?? null, environment,
      framework: data.framework ?? null, language: data.language ?? null,
      runtime: data.runtime ?? null, level: data.level ?? 'error', name: data.name ?? null,
      fingerprint, handled: data.handled ?? null,
      timestamp: data.timestamp ? new Date(data.timestamp).toISOString() : new Date().toISOString(),
      release: data.release ?? null, url: data.url ?? null, transaction: data.transaction ?? null,
      user: data.user ? sanitizeValue(data.user) as Record<string, unknown> : null,
      request: data.request ? sanitizeValue(data.request) as Record<string, unknown> : null,
      tags: data.tags ? sanitizeValue(data.tags) as Record<string, unknown> : null,
      extra: sanitizeValue({ ...(data.extra ?? {}), ...(data.serverName ? { serverName: data.serverName } : {}) }) as Record<string, unknown>,
      breadcrumbs: data.breadcrumbs ? sanitizeValue(data.breadcrumbs) as Record<string, unknown>[] : null,
      contexts: data.contexts ? sanitizeValue(data.contexts) as Record<string, unknown> : null,
      href: data.url ?? null, client: data.framework ?? null, additionalData: null,
      ownerId: credential.application.ownerId,
      payloadSize,
    });
    return { id, status: 'accepted' };
  }
}
