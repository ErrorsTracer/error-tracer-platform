import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Application } from '../database/models/application.model';
import { Environment } from '../database/models/environment.model';
import { ErrorEvent } from '../database/models/error-event.model';
import { TransactionService } from '../database/transaction.service';
import { UsageRepository } from '../usage/usage.repository';
import { ERROR_KEYS } from '../common/error-keys';
import { IngestErrorDto } from './errors.dto';
import { generateErrorFingerprint, sanitizeValue } from './errors.utils';

@Injectable()
export class ErrorsService {
  constructor(
    @InjectModel(ErrorEvent) private readonly errors: typeof ErrorEvent,
    @InjectModel(Environment) private readonly environments: typeof Environment,
    private readonly usage: UsageRepository,
    private readonly transactions: TransactionService,
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

    const event = await this.transactions.run(async (transaction) => {
      const saved = await this.errors.create({
        applicationId, error: message, stack: data.stack ?? null, environment,
        framework: data.framework ?? null, language: data.language ?? null,
        runtime: data.runtime ?? null, level: data.level ?? 'error', name: data.name ?? null,
        fingerprint, handled: data.handled ?? null,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        release: data.release ?? null, url: data.url ?? null, transaction: data.transaction ?? null,
        user: sanitizeValue(data.user), request: sanitizeValue(data.request), tags: sanitizeValue(data.tags),
        extra: sanitizeValue({ ...(data.extra ?? {}), ...(data.serverName ? { serverName: data.serverName } : {}) }),
        breadcrumbs: sanitizeValue(data.breadcrumbs), contexts: sanitizeValue(data.contexts),
        href: data.url ?? null, client: data.framework ?? null, additionalData: null,
      } as any, { transaction });
      await this.usage.increment({ applicationId, userId: credential.application.ownerId, errorBytes: payloadSize }, transaction);
      return saved;
    });
    return { id: event.id, status: 'accepted' };
  }
}
